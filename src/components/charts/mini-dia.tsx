import { cn } from "@/lib/cn";

/**
 * Minigráfico del día (como el de las cotizaciones de Yahoo): el recorrido de la rueda, una línea punteada en el cierre
 * anterior y el área entre las dos. Verde si el día viene positivo, rojo si no (lo decide quien lo usa, con `positivo`).
 */
export function MiniDia({ puntos, previo, positivo, ancho = 96, alto = 40, className }: { puntos: number[]; previo: number; positivo: boolean; ancho?: number; alto?: number; className?: string }) {
  if (puntos.length < 2) return null;
  const min = Math.min(previo, ...puntos);
  const max = Math.max(previo, ...puntos);
  const rango = max - min || 1;
  const margen = 2;
  const x = (i: number) => margen + (i / (puntos.length - 1)) * (ancho - margen * 2);
  const y = (v: number) => margen + (1 - (v - min) / rango) * (alto - margen * 2);
  const linea = puntos.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const base = y(previo);
  const area = `${linea} L${x(puntos.length - 1).toFixed(1)} ${base.toFixed(1)} L${x(0).toFixed(1)} ${base.toFixed(1)} Z`;
  const color = positivo ? "var(--c-gain)" : "var(--c-loss)";
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} className={cn("shrink-0 overflow-visible", className)} aria-hidden>
      <path d={area} fill={color} fillOpacity={0.14} />
      <line x1={0} x2={ancho} y1={base} y2={base} stroke="var(--c-text-3)" strokeWidth={1} strokeDasharray="1.5 2.5" />
      <path d={linea} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
