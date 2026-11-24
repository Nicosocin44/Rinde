import { Escena } from "@/components/escenas/escena";
import { Director } from "./director";
import { EstadoDiscreto } from "@/components/ui/estado-dato";
import type { EstadoDato } from "@/lib/data/types";
import { pesos, pesosCompacto, porcentaje, plazo } from "@/lib/format";
import type { OpcionTasa } from "./datos";

/** Orden en el que aparecen antes de compararse: el mismo desorden de la escena anterior. */
const ORDEN_INICIAL = ["billetera", "plazo_fijo", "cuenta", "fci", "caucion", "lecap"];

/**
 * Escena 2 · La respuesta. Las mejores opciones de cada tipo, en la misma tasa (TEA): primero crecen
 * sus barras hasta la tasa real de hoy, en desorden; después las filas se acomodan de mayor a menor.
 * El DOM ya está ordenado (sin JS se ve el ranking final); el desorden inicial es solo un transform.
 */
export function EscenaRespuesta({ opciones, asOf, estado }: { opciones: OpcionTasa[]; asOf: string; estado: EstadoDato }) {
  const max = Math.max(...opciones.map((o) => o.tea));
  const inicial = [...opciones].sort((a, b) => ORDEN_INICIAL.indexOf(a.tipo) - ORDEN_INICIAL.indexOf(b.tipo));
  const mejor = opciones[0]!;
  return (
    <Escena
      etiqueta="La respuesta"
      alto={230}
      fluidoMobile
      className="sobre-color a-lo-ancho lamina-cerrada mt-16 bg-celeste lg:mt-24"
      director={<Director coreografia="respuesta" comienzo="top 60%" />}
      claseInterior="flex flex-col"
    >
      <div className="flex h-full flex-col justify-start gap-5 pt-[92px] pb-28 md:justify-center md:gap-10 md:pt-24 md:pb-14">
        <div data-titulo className="grid gap-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-end md:gap-12">
          <h2 className="text-h1 text-balance max-md:text-[36px]">Todas las tasas, en la misma cuenta.</h2>
          <p className="max-w-[44ch] text-[15px] leading-[22px] text-text-2 max-md:hidden md:text-[17px] md:leading-[26px]">
            Billeteras, fondos, plazos fijos, caución y letras del Tesoro hablan distinto (TNA, TEM, rendimiento diario). Acá están todas en TEA y en pesos que ganás.
          </p>
        </div>

        <ol className="flex flex-col" aria-label="Lo que más rinde hoy de cada tipo, ordenado por TEA">
          {opciones.map((o) => (
            <li key={o.id} data-fila data-desde={inicial.findIndex((x) => x.id === o.id)} data-tea={o.tea} className="relative will-change-transform">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-t border-border py-2 md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)_7rem_9rem] md:gap-x-8 md:py-3.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-display text-[16px] font-bold tracking-[-0.02em] md:text-[19px]">
                    <span className="truncate">{o.nombre}</span>
                    {o.id === mejor.id && (
                      <span data-mejor className="shrink-0 rounded-full bg-tinta px-2 py-0.5 font-sans text-[11px] font-semibold tracking-normal text-papel">
                        La más alta
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[13px] text-text-2 md:text-[14px]">
                    {o.etiquetaTipo}, {o.plazoDias === null ? "sin plazo" : `a ${plazo(o.plazoDias)}`}
                    {o.tope !== null && <>, hasta {pesosCompacto(o.tope)}</>}
                  </p>
                </div>
                <div className="col-span-2 row-start-2 h-2.5 overflow-hidden rounded-full bg-tinta/10 md:col-span-1 md:col-start-2 md:row-start-1 md:h-3.5">
                  <div data-barra className="h-full origin-left rounded-full bg-tinta" style={{ width: `${(o.tea / max) * 100}%` }} />
                </div>
                <p className="text-right font-display text-[20px] font-extrabold tracking-[-0.03em] tabular-nums md:text-[28px]">
                  <span data-cifra>{porcentaje(o.tea, 1)}</span>
                  <span className="ml-1 font-sans text-[11px] font-semibold tracking-normal opacity-70 md:text-[12px]">TEA</span>
                </p>
                <p className="hidden text-right text-[14px] leading-tight text-text-2 md:block">
                  <span className="block font-semibold text-text tabular-nums">+ {pesos(o.ganancia30, 0)}</span>
                  por mes con $ 1 M
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div data-cierre className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <p className="max-w-[36ch] font-display text-[19px] leading-[1.2] font-bold tracking-[-0.02em] md:text-[24px]">El orden lo decide la tasa. Nadie paga por estar arriba.</p>
          <EstadoDiscreto estado={estado} asOf={asOf} className="md:self-end" />
        </div>
      </div>
    </Escena>
  );
}
