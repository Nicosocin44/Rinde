"use client";

import { Download, Plus, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { pais } from "@/config/countries/ar";
import { PriceChart } from "@/components/charts/price-chart";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/estados";
import { EstadoDiscreto } from "@/components/ui/estado-dato";
import { SegmentedControl } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { repositorioLocal, movimientosACsv, validarImportacion } from "@/lib/cartera/repositorio";
import type { PosicionValuada } from "@/lib/calculos";
import { generarIdeas } from "@/lib/insights/reglas";
import { dinero, fechaCorta, numero } from "@/lib/format";
import { Comparacion, Distribucion, HeroCartera, Ideas, Posiciones, type Unidad } from "./partes";
import { FormMovimiento } from "./form-movimiento";
import { useCartera } from "./use-cartera";

const MOV: Record<string, string> = { compra: "Compra", venta: "Venta", deposito: "Depósito", retiro: "Retiro", cupon: "Cupón", dividendo: "Dividendo", interes: "Interés" };

export function CarteraVista() {
  const params = useSearchParams();
  const forzado = params.get("estado");
  const { datos, estado, precios, errorPrecios, analisis, recargar, guardar } = useCartera();
  const [unidad, setUnidad] = useState<Unidad>("ARS");
  const [cargar, setCargar] = useState(params.get("cargar") === "1");
  const [detalle, setDetalle] = useState<PosicionValuada | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const ideas = useMemo(() => {
    if (!analisis || !precios) return [];
    const meses = analisis.inicio ? Math.round((Date.parse(analisis.hoy) - Date.parse(analisis.inicio)) / (30.44 * 86_400_000)) : 0;
    return generarIdeas({
      posiciones: analisis.posiciones,
      total: analisis.totalArs,
      hoy: analisis.hoy,
      feriados: new Set(pais.feriadosRespaldo),
      mejorLiquida: precios.mejores.liquida,
      mejorPlazoFijo30: precios.mejores.a30?.tipo === "plazo_fijo" ? precios.mejores.a30 : null,
      lecaps: precios.mejores.lecaps,
      rendimientoArs: analisis.rendimiento.ars?.twr?.toNumber() ?? null,
      inflacionPeriodo: analisis.benchmarks.ipc,
      mesesPeriodo: meses,
      objetivoPesos: datos?.ajustes?.objetivoPesos ? datos.ajustes.objetivoPesos / 100 : null,
    });
  }, [analisis, precios, datos]);

  const exportar = async (formato: "json" | "csv") => {
    if (!datos) return;
    const contenido = formato === "json" ? JSON.stringify({ ...datos, exportado: new Date().toISOString() }, null, 2) : movimientosACsv(datos);
    const blob = new Blob([contenido], { type: formato === "json" ? "application/json" : "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cartera-${new Date().toISOString().slice(0, 10)}.${formato}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importar = async (f: File) => {
    try {
      const r = validarImportacion(JSON.parse(await f.text()));
      if (!r.ok) return toast(r.error);
      await repositorioLocal.reemplazar(r.datos);
      await recargar();
      toast(`Importamos ${r.datos.movimientos.length} movimientos`);
    } catch {
      toast("El archivo no es un JSON válido.");
    }
  };

  const borrar = async (id: string) => {
    await repositorioLocal.borrarMovimiento(id);
    await recargar();
    setDetalle(null);
    toast("Movimiento borrado");
  };

  const empezarVacia = async () => {
    await repositorioLocal.guardarAjustes({ id: "ajustes", demoDescartada: true });
    await recargar();
  };

  const acciones = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variante="primario" onClick={() => setCargar(true)} data-testid="abrir-cargar">
        <Plus />
        Cargar movimiento
      </Button>
      {estado === "propia" && (
        <>
          <Button variante="fantasma" onClick={() => exportar("json")}>
            <Download />
            JSON
          </Button>
          <Button variante="fantasma" onClick={() => exportar("csv")}>
            <Download />
            CSV
          </Button>
        </>
      )}
      <Button variante="fantasma" onClick={() => archivo.current?.click()}>
        <Upload />
        Importar
      </Button>
      <input ref={archivo} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} />
    </div>
  );

  const formulario = (
    <Sheet abierto={cargar} onCambio={setCargar} titulo="Cargar movimiento" descripcion={estado === "demo" ? "Al guardar, empieza tu cartera y se oculta la de ejemplo." : undefined}>
      <FormMovimiento
        precios={precios}
        activosExistentes={estado === "propia" ? (datos?.activos ?? []) : []}
        onGuardar={async (a, m) => {
          await guardar(a, m);
          setCargar(false);
          toast("Movimiento guardado");
        }}
      />
    </Sheet>
  );

  if (estado === "cargando" || forzado === "carga") return <EsqueletoCartera />;

  if (estado === "vacia" || forzado === "vacio") {
    return (
      <>
        <EmptyState
          titulo="Todavía no cargaste nada."
          ayuda="Cargá lo que tenés (billetera, plazo fijo, CEDEARs, bonos, cripto o dólares) y te mostramos cuánto rinde todo junto, en pesos, en dólares y contra la inflación."
          accion={acciones}
        />
        {formulario}
      </>
    );
  }

  if (forzado === "error" || (errorPrecios && !analisis)) {
    return <ErrorState titulo="No pudimos traer los precios para valuar tu cartera." detalle="Tus movimientos están guardados en este navegador. Probá de nuevo en un minuto." />;
  }

  if (!analisis) return <EsqueletoCartera />;

  const serie = analisis.serie.map((p) => [p.fecha, unidad === "USD" ? p.usd : unidad === "REAL" ? (p.real ?? p.ars) : p.ars] as [string, number]);
  const movimientos = detalle ? (datos?.movimientos ?? []).filter((m) => m.activoId === detalle.activoId).sort((a, b) => b.fecha.localeCompare(a.fecha)) : [];

  return (
    <div className="flex flex-col gap-16 lg:gap-20">
      {estado === "demo" && (
        <div role="status" className="-mb-6 flex flex-col gap-3 border-l-2 border-warn pl-4 sm:flex-row sm:items-center sm:justify-between lg:-mb-10">
          <div>
            <p className="font-medium text-warn">Datos de ejemplo</p>
            <p className="text-chico text-text-2">Es una cartera inventada con precios reales, para que veas cómo funciona. Cargá la tuya: se guarda solo en tu navegador.</p>
          </div>
          <Button variante="secundario" tamano="sm" onClick={empezarVacia}>
            Empezar con la mía
          </Button>
        </div>
      )}

      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <HeroCartera a={analisis} unidad={unidad} />
          <SegmentedControl
            etiqueta="Unidad"
            valor={unidad}
            onChange={setUnidad}
            opciones={[
              { valor: "ARS", etiqueta: "Pesos" },
              { valor: "USD", etiqueta: "Dólares" },
              { valor: "REAL", etiqueta: "Real" },
            ]}
          />
        </div>
        {serie.length > 2 && (
          <PriceChart
            key={unidad}
            serie={serie}
            titulo={unidad === "USD" ? "Valor en dólares MEP" : unidad === "REAL" ? "Valor en pesos constantes" : "Valor en pesos"}
            rangoInicial="Max"
            moneda={unidad === "USD" ? "US$" : "$"}
            decimales={unidad === "USD" ? 2 : 0}
            alto={240}
            compacto
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {acciones}
          {precios && estado !== "demo" && <EstadoDiscreto estado="delayed" asOf={precios.asOf} />}
        </div>
      </section>

      <Comparacion a={analisis} />
      <Ideas ideas={ideas} />
      <div className="grid gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <Distribucion a={analisis} />
        <Posiciones posiciones={analisis.posiciones} total={analisis.totalArs} onElegir={setDetalle} />
      </div>
      {analisis.sinPrecio.length > 0 && <p className="text-micro">Sin precio de mercado hoy: {analisis.sinPrecio.join(", ")}. Los valuamos al costo.</p>}
      <p className="text-micro">
        Valuación con precios de cierre o con demora (data912, CriptoYa, Binance) y MEP de ArgentinaDatos. Las letras sin precio histórico se valúan a la tasa de compra. No es asesoramiento financiero: es una foto de
        tu cartera con la cuenta a la vista.
      </p>

      {formulario}
      <Sheet abierto={detalle !== null} onCambio={(v) => !v && setDetalle(null)} titulo={detalle?.activo.nombre ?? ""} descripcion={detalle ? `${detalle.activo.ticker ?? ""} · ${movimientos.length} movimientos` : undefined}>
        {detalle && (
          <ul className="flex flex-col">
            {movimientos.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
                <div>
                  <p className="text-[15px] font-medium">{MOV[m.tipo]}</p>
                  <p className="text-chico text-text-3">{fechaCorta(m.fecha, true)}</p>
                </div>
                <div className="text-right">
                  <p className="tabular text-[15px]">
                    {["billetera", "plazo_fijo", "fci", "efectivo_usd"].includes(detalle.activo.tipo) || m.tipo === "cupon" || m.tipo === "dividendo"
                      ? dinero(Number(m.cantidad) * Number(m.precio), detalle.activo.moneda)
                      : `${numero(Number(m.cantidad), 6, 0)} a ${dinero(Number(m.precio), detalle.activo.moneda)}`}
                  </p>
                  {estado === "propia" && (
                    <button type="button" onClick={() => borrar(m.id)} className="text-micro hover:text-loss">
                      Borrar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  );
}

function EsqueletoCartera() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Cargando tu cartera">
      <Skeleton className="h-14 w-72" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-[240px] w-full rounded-(--radius-card)" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
