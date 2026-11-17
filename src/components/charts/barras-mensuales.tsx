import { cn } from "@/lib/cn";

/**
 * Barras verticales finas para series mensuales (inflación). Las proyecciones (REM) van con trazo punteado.
 * SVG estático: no necesita JS.
 */
export function BarrasMensuales({
  datos,
  alto = 72,
  className,
  etiquetaUltimo = true,
}: {
  datos: { mes: string; valor: number; proyectado?: boolean }[];
  alto?: number;
  className?: string;
  etiquetaUltimo?: boolean;
}) {
  if (datos.length === 0) return null;
  const max = Math.max(...datos.map((d) => d.valor), 0.0001);
  const ancho = 100 / datos.length;
  const ultimoReal = [...datos].reverse().find((d) => !d.proyectado);
  return (
    <svg viewBox={`0 0 100 ${alto}`} preserveAspectRatio="none" className={cn("w-full", className)} style={{ height: alto }} role="img" aria-label="Inflación mensual">
      {datos.map((d, i) => {
        const h = Math.max(1.5, (d.valor / max) * (alto - 6));
        const esUltimo = d === ultimoReal && etiquetaUltimo;
        return (
          <rect
            key={d.mes}
            x={i * ancho + ancho * 0.22}
            y={alto - h}
            width={ancho * 0.56}
            height={h}
            rx={Math.min(1.2, ancho * 0.2)}
            fill={d.proyectado ? "transparent" : esUltimo ? "var(--c-accent)" : "var(--c-text-3)"}
            fillOpacity={d.proyectado ? 0 : esUltimo ? 1 : 0.45}
            stroke={d.proyectado ? "var(--c-text-3)" : "none"}
            strokeDasharray={d.proyectado ? "1.5 1.5" : undefined}
            strokeWidth={d.proyectado ? 0.6 : 0}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}
