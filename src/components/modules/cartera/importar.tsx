"use client";

import { Download, FileSpreadsheet, FileUp, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProviderMark } from "@/components/ui/provider-mark";
import { Sheet } from "@/components/ui/sheet";
import type { TipoMovimiento } from "@/lib/calculos/cartera";
import { hoyAR } from "@/lib/calculos/fechas";
import { interpretarArchivos, necesitaMapeo, type ArchivoLeido, type ImportacionArchivos } from "@/lib/cartera/brokers";
import type { Mapeo } from "@/lib/cartera/brokers/columnas";
import { filasDeExcel, leerCsv, planillaModelo, type EstadoFila, type FilaImportada } from "@/lib/cartera/importar";
import { validarImportacion, type DatosCartera, type PortfolioRepository } from "@/lib/cartera/repositorio";
import { dinero, fechaCorta, numero } from "@/lib/format";
import { cn } from "@/lib/cn";
import { guardarMapeo, MapeoColumnas, mapeoGuardado } from "./mapeo-columnas";
import type { EstadoCartera } from "./use-cartera";

const MOV: Record<TipoMovimiento, string> = { compra: "Compra", venta: "Venta", deposito: "Depósito", retiro: "Retiro", cupon: "Cupón", dividendo: "Dividendo", interes: "Interés" };

const MARCA: Record<EstadoFila, { texto: string; clase: string }> = {
  lista: { texto: "", clase: "" },
  aviso: { texto: "Revisalo", clase: "text-warn" },
  repetida: { texto: "Ya está", clase: "text-text-3" },
  ejemplo: { texto: "Ejemplo", clase: "text-text-3" },
  error: { texto: "Con error", clase: "text-loss" },
  omitida: { texto: "No se suma", clase: "text-text-3" },
};

type Lista = Extract<ImportacionArchivos, { ok: true }>;

/** Identifica una fila aunque vengan varios archivos (cada uno numera las suyas desde 1). */
const claveFila = (f: FilaImportada) => `${f.archivo ?? ""}#${f.n}`;
const seleccionable = (f: FilaImportada) => (f.estado === "lista" || f.estado === "aviso" || f.estado === "repetida") && f.movimiento !== null;

type Origen = "balanz" | "cocos" | "iol" | "ppi" | "bullmarket" | "allaria" | "sbs" | "adcap" | "otro" | "planilla";

/**
 * Brokers argentinos. Balanz tiene lector propio (probado con archivos reales); el resto se lee con las columnas que
 * indica el usuario la primera vez (y que se recuerdan). Cocos publica cómo exportar; los demás, no: pasos generales.
 */
const ORIGENES: { id: Origen; nombre: string; proveedorId?: string }[] = [
  { id: "balanz", nombre: "Balanz", proveedorId: "balanz" },
  { id: "cocos", nombre: "Cocos", proveedorId: "cocos" },
  { id: "iol", nombre: "IOL", proveedorId: "iol" },
  { id: "ppi", nombre: "PPI", proveedorId: "ppi" },
  { id: "bullmarket", nombre: "Bull Market", proveedorId: "bullmarket" },
  { id: "allaria", nombre: "Allaria", proveedorId: "allaria" },
  { id: "sbs", nombre: "SBS", proveedorId: "sbs" },
  { id: "adcap", nombre: "Adcap", proveedorId: "adcap" },
  { id: "otro", nombre: "Otro broker" },
  { id: "planilla", nombre: "Nuestra planilla" },
];

const nombreDe = (o: Origen | null) => ORIGENES.find((x) => x.id === o)?.nombre ?? "tu broker";

function bajar(contenido: string, nombre: string, tipo: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Importar movimientos: CSV o Excel con las columnas de la planilla modelo (o el JSON que exporta la web, que reemplaza
 * la cartera). Antes de guardar se ve qué se entendió de cada fila y se elige qué sumar: nada se guarda sin verlo.
 */
export function ImportarCartera({
  abierto,
  onCambio,
  datos,
  estado,
  repo,
  alTerminar,
}: {
  abierto: boolean;
  onCambio: (abierto: boolean) => void;
  datos: DatosCartera | null;
  estado: EstadoCartera;
  repo: PortfolioRepository;
  alTerminar: (mensaje: string) => void;
}) {
  const archivo = useRef<HTMLInputElement>(null);
  const [resultado, setResultado] = useState<Lista | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [origen, setOrigen] = useState<Origen | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  /** Archivos leídos que esperan que el usuario diga qué es cada columna (el de `indice`). */
  const [mapeando, setMapeando] = useState<{ leidos: ArchivoLeido[]; indice: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const reiniciar = () => {
    setResultado(null);
    setMapeando(null);
    setMarcadas(new Set());
    setError(null);
    if (archivo.current) archivo.current.value = "";
  };

  const cambiar = (v: boolean) => {
    if (!v) reiniciar();
    onCambio(v);
  };

  const leerArchivos = async (lista: File[]) => {
    if (!lista.length) return;
    setError(null);
    setTrabajando(true);
    try {
      // El JSON que exporta la web reemplaza toda la cartera: va solo.
      const json = lista.find((f) => f.name.toLowerCase().endsWith(".json"));
      if (json) {
        if (lista.length > 1) return setError("El archivo .json reemplaza toda tu cartera: subilo solo, sin otros archivos.");
        const r = validarImportacion(JSON.parse(await json.text()));
        if (!r.ok) return setError(r.error);
        await repo.reemplazar(r.datos);
        cambiar(false);
        return alTerminar(`Importamos ${r.datos.movimientos.length} movimientos`);
      }
      const leidos: ArchivoLeido[] = [];
      for (const f of lista) {
        const nombre = f.name.toLowerCase();
        if (nombre.endsWith(".xlsx")) {
          const { readSheet } = await import("read-excel-file/universal");
          leidos.push({ nombre: f.name, filas: filasDeExcel(await readSheet(f)) });
        } else if (nombre.endsWith(".csv") || nombre.endsWith(".txt")) {
          leidos.push({ nombre: f.name, filas: leerCsv(await f.text()) });
        } else {
          return setError(nombre.endsWith(".xls") ? `${f.name} es un Excel viejo (.xls): abrilo y guardalo como .xlsx o .csv.` : `${f.name}: subí archivos .csv, .xlsx o .json.`);
        }
      }
      // Los archivos que no conocemos: con las columnas de la última vez, o se pregunta.
      const broker = nombreDe(origen);
      const conMapeo = leidos.map((l) => {
        if (!necesitaMapeo(l.filas)) return l;
        const guardado = mapeoGuardado(l.filas);
        return guardado ? { ...l, mapeo: guardado, broker } : l;
      });
      const falta = conMapeo.findIndex((l) => necesitaMapeo(l.filas) && !l.mapeo);
      if (falta >= 0) return setMapeando({ leidos: conMapeo, indice: falta });
      interpretar(conMapeo);
    } catch {
      setError("No pudimos leer el archivo. Fijate que sea un CSV o un Excel (.xlsx) y que no tenga contraseña.");
    } finally {
      setTrabajando(false);
      if (archivo.current) archivo.current.value = "";
    }
  };

  const interpretar = (leidos: ArchivoLeido[]) => {
    // La cartera de ejemplo no cuenta: ni para reusar activos ni para marcar repetidos.
    const actual = estado === "propia" && datos ? datos : { activos: [], movimientos: [] };
    const r = interpretarArchivos(leidos, actual, hoyAR(), () => crypto.randomUUID());
    if (!r.ok) return setError(r.error);
    setNombreArchivo(leidos.map((a) => a.nombre).join(", "));
    setResultado(r);
    setMarcadas(new Set(r.filas.filter((x) => x.estado === "lista" || x.estado === "aviso").map(claveFila)));
  };

  const alElegirColumnas = (mapeo: Mapeo) => {
    if (!mapeando) return;
    const { leidos, indice } = mapeando;
    guardarMapeo(leidos[indice]!.filas, mapeo);
    const siguientes = leidos.map((l, i) => (i === indice ? { ...l, mapeo, broker: nombreDe(origen) } : l));
    const falta = siguientes.findIndex((l) => necesitaMapeo(l.filas) && !l.mapeo);
    if (falta >= 0) return setMapeando({ leidos: siguientes, indice: falta });
    setMapeando(null);
    setError(null);
    interpretar(siguientes);
  };

  const sumar = async () => {
    if (!resultado) return;
    const elegidas = resultado.filas.filter((f) => marcadas.has(claveFila(f)) && f.movimiento);
    const usados = new Set(elegidas.map((f) => f.activo!.id));
    setTrabajando(true);
    try {
      if (estado === "demo") await repo.vaciar();
      await repo.sumar(
        resultado.activos.filter((a) => usados.has(a.id)),
        elegidas.map((f) => f.movimiento!),
      );
      cambiar(false);
      alTerminar(elegidas.length === 1 ? "Sumamos 1 movimiento a tu cartera" : `Sumamos ${elegidas.length} movimientos a tu cartera`);
    } catch {
      setError("No pudimos guardar. Probá de nuevo en un minuto.");
    } finally {
      setTrabajando(false);
    }
  };

  const input = (
    <input
      ref={archivo}
      type="file"
      multiple
      accept=".csv,.xlsx,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      className="hidden"
      onChange={(e) => leerArchivos([...(e.target.files ?? [])])}
      data-testid="archivo-importar"
    />
  );
  const mensajeError = error && (
    <p role="alert" className="text-chico text-loss">
      {error}
    </p>
  );

  return (
    <Sheet abierto={abierto} onCambio={cambiar} titulo={resultado ? "Revisá antes de sumar" : mapeando ? "¿Qué es cada columna?" : "Importar movimientos"}
      descripcion={resultado || mapeando ? undefined : "Desde tu broker o desde una planilla. Antes de guardar te mostramos lo que entendimos."} ancho={600}>
      {input}
      {resultado ? (
        <Revision resultado={resultado} nombreArchivo={nombreArchivo} marcadas={marcadas} setMarcadas={setMarcadas}>
          {mensajeError}
          {/* Fijo abajo: con muchas filas, el botón queda siempre a la vista. */}
          <div className="sticky -bottom-6 -mb-6 flex items-center gap-3 border-t border-border bg-surface pt-4 pb-6">
            <Button variante="primario" onClick={sumar} disabled={trabajando || marcadas.size === 0} data-testid="confirmar-importar">
              {trabajando ? "Guardando…" : marcadas.size === 1 ? "Sumar 1 movimiento" : `Sumar ${marcadas.size} movimientos`}
            </Button>
            <Button variante="fantasma" onClick={() => archivo.current?.click()} disabled={trabajando}>
              Elegir otro archivo
            </Button>
          </div>
        </Revision>
      ) : mapeando ? (
        <MapeoColumnas key={mapeando.indice} archivo={mapeando.leidos[mapeando.indice]!} broker={nombreDe(origen)} onListo={alElegirColumnas} onVolver={() => setMapeando(null)} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-chico text-text-2">¿De dónde son tus movimientos?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="De dónde son tus movimientos">
              {ORIGENES.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={origen === o.id}
                  onClick={() => setOrigen(o.id)}
                  className={cn(
                    "presionable flex min-h-14 items-center gap-3 rounded-(--radius-card) border px-3 py-2.5 text-left text-[15px] font-medium transition-colors",
                    origen === o.id ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-border-strong",
                  )}
                >
                  {o.proveedorId ? (
                    <ProviderMark proveedorId={o.proveedorId} tamano={32} />
                  ) : (
                    <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-surface-2 text-text-2">
                      <FileSpreadsheet className="size-4" />
                    </span>
                  )}
                  {o.nombre}
                </button>
              ))}
            </div>
          </div>

          {origen === "balanz" && (
            <ol className="flex flex-col gap-3 text-chico text-text-2" data-testid="pasos-balanz">
              <li>
                <span className="font-medium text-text">Para cargar lo que tenés hoy:</span> en Balanz, entrá a <span className="font-medium text-text">Mis instrumentos</span> y exportá el Excel. Sumamos una compra por cada uno, al precio promedio de compra y con la fecha aproximada (Balanz no da cada compra).
              </li>
              <li>
                <span className="font-medium text-text">Para sumar lo nuevo:</span> exportá <span className="font-medium text-text">Movimientos</span> y subilo. Sumamos compras, ventas (con su comisión) y dividendos en pesos. Lo que ya estaba en la tenencia que importaste no se vuelve a contar.
              </li>
              <li className="text-text-3">Por ahora leemos CEDEARs y acciones. Los bonos, letras y fondos se cargan con la planilla.</li>
            </ol>
          )}

          {origen && origen !== "balanz" && origen !== "planilla" && (
            <ol className="flex flex-col gap-3 text-chico text-text-2" data-testid="pasos-broker">
              <li>
                {origen === "cocos" ? (
                  <>
                    <span className="font-medium text-text">En la web de Cocos</span> (app.cocos.capital), entrá a <span className="font-medium text-text">Actividad</span>, tocá el ícono de descarga (arriba a la derecha), elegí el período y el formato <span className="font-medium text-text">CSV</span>.
                  </>
                ) : (
                  <>
                    <span className="font-medium text-text">En {origen === "otro" ? "la web de tu broker" : `la web de ${nombreDe(origen)}`},</span> buscá tus movimientos u operaciones (a veces están en el estado de cuenta) y bajalos en Excel o CSV.
                  </>
                )}
              </li>
              <li>
                <span className="font-medium text-text">La primera vez te preguntamos qué es cada columna</span> (fecha, operación, ticker, cantidad, precio). Lo recordamos: la próxima, lo leemos solo.
              </li>
              <li className="text-text-3">Sumamos compras, ventas y dividendos de CEDEARs, acciones y LECAPs. Los depósitos y retiros no: la cartera cuenta lo que compraste, no el saldo.</li>
            </ol>
          )}

          {origen === "planilla" && (
            <div className="flex flex-col gap-4">
              <ol className="flex flex-col gap-3 text-chico text-text-2">
                <li>
                  <span className="font-medium text-text">1. Bajá la planilla modelo</span> y pegá tus movimientos, una fila por operación. Se abre con Excel o Google Sheets.
                </li>
                <li>
                  <span className="font-medium text-text">2. Subila</span> como CSV o Excel (.xlsx). Te mostramos fila por fila lo que entendimos y elegís qué sumar.
                </li>
              </ol>
              <Button variante="secundario" className="self-start" onClick={() => bajar(planillaModelo(), "planilla-cartera.csv", "text/csv;charset=utf-8")}>
                <Download />
                Bajar planilla modelo
              </Button>
            </div>
          )}

          {origen && (
            <>
              <div className="flex items-start gap-2.5 rounded-(--radius-card) bg-surface-2 px-3.5 py-3 text-chico text-text-2">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                <p>
                  <span className="font-medium text-text">Tus archivos se leen en tu navegador:</span> no los subimos a ningún lado. Solo se guardan los movimientos que elijas sumar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => archivo.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastrando(true);
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setArrastrando(false);
                  void leerArchivos([...e.dataTransfer.files]);
                }}
                disabled={trabajando}
                data-testid="elegir-archivo"
                className={cn(
                  "flex flex-col items-center gap-2 rounded-(--radius-card) border-2 border-dashed px-4 py-8 text-center transition-colors",
                  arrastrando ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong",
                )}
              >
                <FileUp aria-hidden className="size-6 text-accent" />
                <span className="text-[15px] font-medium">{trabajando ? "Leyendo…" : "Arrastrá tus archivos o tocá para elegirlos"}</span>
                <span className="text-micro">Excel (.xlsx) o CSV. Podés subir varios a la vez.</span>
              </button>
              {mensajeError}
            </>
          )}

          {origen === "planilla" && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-border pt-5 text-chico">
              <dt className="font-medium">fecha</dt>
              <dd className="text-text-2">10/03/2026</dd>
              <dt className="font-medium">tipo_movimiento</dt>
              <dd className="text-text-2">compra, venta, deposito, retiro, cupon, dividendo o interes</dd>
              <dt className="font-medium">tipo_activo</dt>
              <dd className="text-text-2">cedear, accion, bono, lecap, cripto, billetera, plazo_fijo o dolares</dd>
              <dt className="font-medium">ticker o activo</dt>
              <dd className="text-text-2">El ticker (AAPL, AL30, BTC) o, en billeteras y plazos fijos, el nombre (Mercado Pago, Galicia)</dd>
              <dt className="font-medium">cantidad y precio</dt>
              <dd className="text-text-2">En billeteras y plazos fijos, cantidad es el monto. Bonos y LECAPs: precio por cada 100 nominales. CEDEARs y acciones en pesos; bonos y cripto en dólares.</dd>
              <dt className="font-medium">Opcionales</dt>
              <dd className="text-text-2">comision, nota, tna (billeteras y plazos fijos, en %) y vencimiento (plazos fijos)</dd>
            </dl>
          )}
          {origen === "planilla" && <p className="text-micro">¿Tenés una copia que exportaste desde acá? El CSV se suma igual que la planilla; el JSON reemplaza toda tu cartera.</p>}
        </div>
      )}
    </Sheet>
  );
}

function Revision({
  resultado,
  nombreArchivo,
  marcadas,
  setMarcadas,
  children,
}: {
  resultado: Lista;
  nombreArchivo: string;
  marcadas: Set<string>;
  setMarcadas: (s: Set<string>) => void;
  children: React.ReactNode;
}) {
  const cuenta = (e: EstadoFila) => resultado.filas.filter((f) => f.estado === e).length;
  const partes = [
    `${cuenta("lista")} ${cuenta("lista") === 1 ? "lista" : "listas"}`,
    cuenta("aviso") && `${cuenta("aviso")} para revisar`,
    cuenta("repetida") && `${cuenta("repetida")} que ya estaban`,
    cuenta("ejemplo") && `${cuenta("ejemplo")} de ejemplo`,
    cuenta("error") && `${cuenta("error")} con errores`,
    cuenta("omitida") && `${cuenta("omitida")} que no se suman`,
  ].filter(Boolean);
  const alternar = (clave: string) => {
    const s = new Set(marcadas);
    if (s.has(clave)) s.delete(clave);
    else s.add(clave);
    setMarcadas(s);
  };
  const variosArchivos = new Set(resultado.filas.map((f) => f.archivo)).size > 1;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-chico text-text-2">
        En <span className="font-medium text-text">{nombreArchivo}</span> hay {resultado.filas.length} {resultado.filas.length === 1 ? "fila" : "filas"}: {partes.join(", ")}.
        {cuenta("error") > 0 && " Las que tienen error no se suman: corregilas en el archivo y volvé a subirlo."}
      </p>
      <ul className="flex flex-col border-t border-border" data-testid="filas-importadas">
        {resultado.filas.map((f) => (
          <FilaVista key={claveFila(f)} fila={f} marcada={marcadas.has(claveFila(f))} alAlternar={() => alternar(claveFila(f))} conArchivo={variosArchivos} />
        ))}
      </ul>
      {children}
    </div>
  );
}

function FilaVista({ fila, marcada, alAlternar, conArchivo }: { fila: FilaImportada; marcada: boolean; alAlternar: () => void; conArchivo: boolean }) {
  const marca = MARCA[fila.estado];
  const moneda = fila.activo?.moneda ?? "ARS";
  const importe = fila.monto !== null ? dinero(Number(fila.monto), moneda) : fila.cantidad && fila.precio ? `${numero(Number(fila.cantidad), 6, 0)} a ${dinero(Number(fila.precio), moneda)}` : null;
  const puedeSumarse = seleccionable(fila);

  return (
    <li className="border-b border-border">
      <label className={cn("flex gap-3 py-3", puedeSumarse ? "cursor-pointer" : "opacity-80")}>
        <input type="checkbox" className="mt-1 size-4 shrink-0 accent-(--color-accent)" checked={marcada} disabled={!puedeSumarse} onChange={alAlternar} aria-label={`Sumar la fila ${fila.n}`} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <span className="min-w-0 truncate text-[15px] font-medium">
              {fila.estado === "omitida" && fila.texto ? (
                fila.texto
              ) : (
                <>
                  {fila.tipo ? MOV[fila.tipo] : "Fila " + fila.n}
                  {fila.activo ? ` · ${fila.activo.nombre}` : fila.texto && ` · ${fila.texto}`}
                </>
              )}
              {fila.activo?.ticker && fila.activo.ticker !== fila.activo.nombre && <span className="text-text-3"> {fila.activo.ticker}</span>}
            </span>
            {importe && <span className="tabular shrink-0 text-[15px]">{importe}</span>}
          </span>
          <span className="text-chico text-text-3">
            Fila {fila.n}
            {conArchivo && fila.archivo && ` de ${fila.archivo}`}
            {fila.fecha && ` · ${fechaCorta(fila.fecha, true)}`}
            {marca.texto && <span className={cn("font-medium", marca.clase)}> · {marca.texto}</span>}
          </span>
          {fila.motivos.length > 0 && <span className={cn("text-chico", fila.estado === "error" ? "text-loss" : fila.estado === "aviso" ? "text-warn" : "text-text-3")}>{fila.motivos.join(" ")}</span>}
        </span>
      </label>
    </li>
  );
}
