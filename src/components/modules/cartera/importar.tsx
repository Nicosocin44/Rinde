"use client";

import { Download, FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { TipoMovimiento } from "@/lib/calculos/cartera";
import { hoyAR } from "@/lib/calculos/fechas";
import { filasDeExcel, interpretarPlanilla, leerCsv, planillaModelo, type EstadoFila, type FilaImportada, type Importacion } from "@/lib/cartera/importar";
import { validarImportacion, type DatosCartera, type PortfolioRepository } from "@/lib/cartera/repositorio";
import { dinero, fechaCorta, numero } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { EstadoCartera } from "./use-cartera";

const MOV: Record<TipoMovimiento, string> = { compra: "Compra", venta: "Venta", deposito: "Depósito", retiro: "Retiro", cupon: "Cupón", dividendo: "Dividendo", interes: "Interés" };

const MARCA: Record<EstadoFila, { texto: string; clase: string }> = {
  lista: { texto: "", clase: "" },
  aviso: { texto: "Revisalo", clase: "text-warn" },
  repetida: { texto: "Ya está", clase: "text-text-3" },
  ejemplo: { texto: "Ejemplo", clase: "text-text-3" },
  error: { texto: "Con error", clase: "text-loss" },
};

type Lista = Extract<Importacion, { ok: true }>;

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
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const reiniciar = () => {
    setResultado(null);
    setMarcadas(new Set());
    setError(null);
    if (archivo.current) archivo.current.value = "";
  };

  const cambiar = (v: boolean) => {
    if (!v) reiniciar();
    onCambio(v);
  };

  const leerArchivo = async (f: File) => {
    setError(null);
    setTrabajando(true);
    try {
      const nombre = f.name.toLowerCase();
      if (nombre.endsWith(".json")) {
        const r = validarImportacion(JSON.parse(await f.text()));
        if (!r.ok) return setError(r.error);
        await repo.reemplazar(r.datos);
        cambiar(false);
        return alTerminar(`Importamos ${r.datos.movimientos.length} movimientos`);
      }
      let filas: string[][];
      if (nombre.endsWith(".xlsx")) {
        const { readSheet } = await import("read-excel-file/universal");
        filas = filasDeExcel(await readSheet(f));
      } else if (nombre.endsWith(".csv") || nombre.endsWith(".txt")) {
        filas = leerCsv(await f.text());
      } else {
        return setError(nombre.endsWith(".xls") ? "Es un Excel viejo (.xls): abrilo y guardalo como .xlsx o .csv." : "Subí un archivo .csv, .xlsx o .json.");
      }
      // La cartera de ejemplo no cuenta: ni para reusar activos ni para marcar repetidos.
      const actual = estado === "propia" && datos ? datos : { activos: [], movimientos: [] };
      const r = interpretarPlanilla(filas, actual, hoyAR(), () => crypto.randomUUID());
      if (!r.ok) return setError(r.error);
      setNombreArchivo(f.name);
      setResultado(r);
      setMarcadas(new Set(r.filas.filter((x) => x.estado === "lista" || x.estado === "aviso").map((x) => x.n)));
    } catch {
      setError("No pudimos leer el archivo. Fijate que sea un CSV o un Excel (.xlsx) y que no tenga contraseña.");
    } finally {
      setTrabajando(false);
      if (archivo.current) archivo.current.value = "";
    }
  };

  const sumar = async () => {
    if (!resultado) return;
    const elegidas = resultado.filas.filter((f) => marcadas.has(f.n) && f.movimiento);
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
    <input ref={archivo} type="file" accept=".csv,.xlsx,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => e.target.files?.[0] && leerArchivo(e.target.files[0])} data-testid="archivo-importar" />
  );
  const mensajeError = error && (
    <p role="alert" className="text-chico text-loss">
      {error}
    </p>
  );

  return (
    <Sheet abierto={abierto} onCambio={cambiar} titulo={resultado ? "Revisá antes de sumar" : "Importar movimientos"} descripcion={resultado ? undefined : "Desde una planilla (CSV o Excel). Antes de guardar te mostramos lo que entendimos."} ancho={600}>
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
      ) : (
        <div className="flex flex-col gap-6">
          <ol className="flex flex-col gap-3 text-chico text-text-2">
            <li>
              <span className="font-medium text-text">1. Bajá la planilla modelo</span> y pegá tus movimientos, una fila por operación. Se abre con Excel o Google Sheets.
            </li>
            <li>
              <span className="font-medium text-text">2. Subila</span> como CSV o Excel (.xlsx). Te mostramos fila por fila lo que entendimos y elegís qué sumar.
            </li>
          </ol>
          <div className="flex flex-wrap gap-3">
            <Button variante="secundario" onClick={() => bajar(planillaModelo(), "planilla-cartera.csv", "text/csv;charset=utf-8")}>
              <Download />
              Bajar planilla modelo
            </Button>
            <Button variante="primario" onClick={() => archivo.current?.click()} disabled={trabajando} data-testid="elegir-archivo">
              <FileUp />
              {trabajando ? "Leyendo…" : "Elegir archivo"}
            </Button>
          </div>
          {mensajeError}
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
          <p className="text-micro">¿Tenés una copia que exportaste desde acá? El CSV se suma igual que la planilla; el JSON reemplaza toda tu cartera.</p>
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
  marcadas: Set<number>;
  setMarcadas: (s: Set<number>) => void;
  children: React.ReactNode;
}) {
  const cuenta = (e: EstadoFila) => resultado.filas.filter((f) => f.estado === e).length;
  const partes = [
    `${cuenta("lista")} ${cuenta("lista") === 1 ? "lista" : "listas"}`,
    cuenta("aviso") && `${cuenta("aviso")} para revisar`,
    cuenta("repetida") && `${cuenta("repetida")} que ya estaban`,
    cuenta("ejemplo") && `${cuenta("ejemplo")} de ejemplo`,
    cuenta("error") && `${cuenta("error")} con errores`,
  ].filter(Boolean);
  const alternar = (n: number) => {
    const s = new Set(marcadas);
    if (s.has(n)) s.delete(n);
    else s.add(n);
    setMarcadas(s);
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-chico text-text-2">
        En <span className="font-medium text-text">{nombreArchivo}</span> hay {resultado.filas.length} {resultado.filas.length === 1 ? "fila" : "filas"}: {partes.join(", ")}.
        {cuenta("error") > 0 && " Las que tienen error no se suman: corregilas en el archivo y volvé a subirlo."}
      </p>
      <ul className="flex flex-col border-t border-border" data-testid="filas-importadas">
        {resultado.filas.map((f) => (
          <FilaVista key={f.n} fila={f} marcada={marcadas.has(f.n)} alAlternar={() => alternar(f.n)} />
        ))}
      </ul>
      {children}
    </div>
  );
}

function FilaVista({ fila, marcada, alAlternar }: { fila: FilaImportada; marcada: boolean; alAlternar: () => void }) {
  const marca = MARCA[fila.estado];
  const moneda = fila.activo?.moneda ?? "ARS";
  const importe = fila.monto !== null ? dinero(Number(fila.monto), moneda) : fila.cantidad && fila.precio ? `${numero(Number(fila.cantidad), 6, 0)} a ${dinero(Number(fila.precio), moneda)}` : null;
  const seleccionable = fila.estado !== "error" && fila.movimiento !== null;

  return (
    <li className="border-b border-border">
      <label className={cn("flex gap-3 py-3", seleccionable ? "cursor-pointer" : "opacity-80")}>
        <input type="checkbox" className="mt-1 size-4 shrink-0 accent-(--color-accent)" checked={marcada} disabled={!seleccionable} onChange={alAlternar} aria-label={`Sumar la fila ${fila.n}`} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <span className="min-w-0 truncate text-[15px] font-medium">
              {fila.tipo ? MOV[fila.tipo] : "Fila " + fila.n}
              {fila.activo ? ` · ${fila.activo.nombre}` : fila.texto && ` · ${fila.texto}`}
              {fila.activo?.ticker && fila.activo.ticker !== fila.activo.nombre && <span className="text-text-3"> {fila.activo.ticker}</span>}
            </span>
            {importe && <span className="tabular shrink-0 text-[15px]">{importe}</span>}
          </span>
          <span className="text-chico text-text-3">
            Fila {fila.n}
            {fila.fecha && ` · ${fechaCorta(fila.fecha, true)}`}
            {marca.texto && <span className={cn("font-medium", marca.clase)}> · {marca.texto}</span>}
          </span>
          {fila.motivos.length > 0 && <span className={cn("text-chico", fila.estado === "error" ? "text-loss" : fila.estado === "aviso" ? "text-warn" : "text-text-3")}>{fila.motivos.join(" ")}</span>}
        </span>
      </label>
    </li>
  );
}
