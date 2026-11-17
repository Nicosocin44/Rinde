import type { CotizacionDolar, Pulso } from "@/lib/data/types";
import { delta, pesos, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CintaMovil } from "./cinta-movil";

/**
 * Cinta de cotizaciones: una banda de color sol, inclinada, con los mismos datos reales de la página.
 * Avanza solo mientras scrolleás y frena cuando parás (DISENO.md §7: nada en loop).
 */
export function CintaCotizaciones({ cotizaciones, pulso, className }: { cotizaciones: CotizacionDolar[]; pulso: Pulso; className?: string }) {
  const items: { k: string; v: string; d?: number | null }[] = [
    ...cotizaciones.filter((c) => c.id !== "mayorista").map((c) => ({ k: `Dólar ${c.nombre}`, v: pesos(c.venta, c.venta >= 10_000 ? 0 : 2), d: c.variacion })),
    ...(pulso.riesgoPais ? [{ k: "Riesgo país", v: `${pulso.riesgoPais.valor} pb`, d: pulso.riesgoPais.variacion }] : []),
    ...(pulso.mejorTasa ? [{ k: "Mejor tasa sin plazo", v: `${porcentaje(pulso.mejorTasa.tna, 1)} TNA` }] : []),
  ];
  if (!items.length) return null;
  const fila = (copia: number) => (
    <ul aria-hidden={copia > 0 || undefined} className="flex shrink-0 items-center">
      {items.map((it) => (
        <li key={`${copia}-${it.k}`} className="flex items-baseline gap-3 px-5 whitespace-nowrap lg:px-7">
          <span className="text-[15px] font-semibold opacity-70">{it.k}</span>
          <span className="font-display text-[26px] font-extrabold tracking-[-0.03em] tabular-nums lg:text-[34px]">{it.v}</span>
          {it.d !== undefined && it.d !== null && <span className="text-[15px] font-bold tabular-nums">{delta(it.d, 2).replace("+", "▲ ").replace("−", "▼ ")}</span>}
          <span aria-hidden className="ml-5 self-center text-[20px] opacity-50 lg:ml-7">
            ✺
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn("sangrado relative z-10 overflow-x-clip py-8", className)} aria-label="Cotizaciones de hoy" role="region">
      <div className="sobre-color -mx-[8vw] -rotate-2 bg-sol py-4 lg:py-5">
        <CintaMovil>
          {fila(0)}
          {fila(1)}
          {fila(2)}
        </CintaMovil>
      </div>
    </div>
  );
}
