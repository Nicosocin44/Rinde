import { cn } from "@/lib/cn";

/**
 * Sparkline de 80×24: trazo de 1,5, sin ejes, con punto final.
 * Verde o rojo según la variación del período (primer punto contra último); `tono` lo fuerza.
 */
export function Sparkline({
  valores,
  ancho = 80,
  alto = 24,
  tono,
  className,
  relleno = false,
  grosor = 1.5,
}: {
  valores: number[];
  ancho?: number;
  alto?: number;
  /** "tinta" usa el color del texto: es el que va sobre tarjetas de color pleno. */
  tono?: "gain" | "loss" | "neutro" | "accent" | "tinta";
  className?: string;
  relleno?: boolean;
  grosor?: number;
}) {
  const v = valores.filter((x) => Number.isFinite(x));
  if (v.length < 2) return <span className={cn("inline-block", className)} style={{ width: ancho, height: alto }} aria-hidden />;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const rango = max - min || 1;
  const margen = 2.5;
  const puntos = v.map((y, i) => [(i / (v.length - 1)) * (ancho - margen * 2) + margen, alto - margen - ((y - min) / rango) * (alto - margen * 2)] as const);
  const d = puntos.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const final = puntos[puntos.length - 1]!;
  const direccion = tono ?? (v[v.length - 1]! > v[0]! ? "gain" : v[v.length - 1]! < v[0]! ? "loss" : "neutro");
  const color = { gain: "var(--c-gain)", loss: "var(--c-loss)", neutro: "var(--c-text-3)", accent: "var(--c-accent)", tinta: "var(--c-text)" }[direccion];
  const id = `sp-${Math.round(v[0]! * 1000)}-${v.length}-${direccion}`;
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} className={cn("overflow-visible", className)} aria-hidden>
      {relleno && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.16" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L${final[0].toFixed(1)} ${alto} L${margen} ${alto} Z`} fill={`url(#${id})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={final[0]} cy={final[1]} r={grosor + 0.5} fill={color} />
    </svg>
  );
}
