"use client";

import { curveMonotoneX, line } from "d3-shape";
import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { mesAnio, porcentaje } from "@/lib/format";
import { useAncho } from "@/lib/use-ancho";
import { cn } from "@/lib/cn";
import { conMargen, escalaLineal, ticksLindos } from "./escalas";

export type PuntoCurva = { id: string; x: number; y: number; etiqueta: string; fechaX?: string; color?: string };

/**
 * Curva de rendimiento: puntos de 6 px + curva ajustada suave, con el ticker visible al hacer hover.
 * Hover sincronizable con una tabla (`seleccionado` / `onSeleccionar`). El punto seleccionado crece y se pinta de accent.
 * Interacción firma 5: la curva se dibuja en 600 ms la primera vez que entra en pantalla.
 */
export function YieldCurve({
  puntos,
  ajuste,
  seleccionado,
  onSeleccionar,
  alto = 280,
  mini = false,
  formatoY = (v) => porcentaje(v, 0),
  formatoX,
  etiquetaEjeX = "días",
  className,
  ajustesExtra = [],
}: {
  puntos: PuntoCurva[];
  ajuste: { x: number; y: number }[];
  /** Curvas adicionales (por ejemplo, bonos ley NY y ley local), cada una con su color. */
  ajustesExtra?: { puntos: { x: number; y: number }[]; color: string }[];
  seleccionado?: string | null;
  onSeleccionar?: (id: string | null) => void;
  alto?: number;
  mini?: boolean;
  formatoY?: (v: number) => string;
  formatoX?: (v: number) => string;
  etiquetaEjeX?: string;
  className?: string;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>(mini ? 360 : 720);
  const svgRef = useRef<SVGSVGElement>(null);
  const enVista = useInView(svgRef, { once: true, margin: "0px 0px -10% 0px" });

  if (puntos.length === 0) return <div className={cn("h-full", className)} style={{ height: alto }} />;

  const m = mini ? { t: 22, r: 12, b: 12, l: 12 } : { t: 28, r: 48, b: 28, l: 8 };
  const xs = puntos.map((p) => p.x);
  const ys = [...puntos.map((p) => p.y), ...ajuste.map((p) => p.y), ...ajustesExtra.flatMap((a) => a.puntos.map((p) => p.y))];
  const dx = conMargen([Math.min(...xs), Math.max(...xs)], 0.06);
  const dy = conMargen([Math.min(...ys), Math.max(...ys)], mini ? 0.25 : 0.18);
  const x = escalaLineal(dx, [m.l, ancho - m.r]);
  const y = escalaLineal(dy, [alto - m.b, m.t]);
  const ticksY = ticksLindos(dy[0], dy[1], mini ? 2 : 4).filter((t) => t >= dy[0] && t <= dy[1]);
  const ticksX = ticksLindos(dx[0], dx[1], ancho < 480 ? 3 : 5).filter((t) => t >= dx[0] && t <= dx[1] && t >= 0);
  const trazo = line<{ x: number; y: number }>()
    .x((p) => x(p.x))
    .y((p) => y(p.y))
    .curve(curveMonotoneX)(ajuste);
  const sel = puntos.find((p) => p.id === seleccionado) ?? null;
  const etiquetasFijas = mini ? [puntos[0], puntos[puntos.length - 1]].filter(Boolean) : [];

  return (
    <div ref={ref} className={cn("relative w-full select-none", className)} style={{ height: alto }}>
      <svg
        ref={svgRef}
        width={ancho}
        height={alto}
        role="img"
        aria-label={`Curva de rendimiento: ${puntos.map((p) => `${p.etiqueta} ${formatoY(p.y)}`).join(", ")}`}
        onPointerLeave={() => onSeleccionar?.(null)}
        className="overflow-visible"
      >
        {!mini &&
          ticksY.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={ancho - m.r} y1={y(t)} y2={y(t)} stroke="var(--c-border)" />
              <text x={ancho - m.r + 10} y={y(t)} dy="0.32em" className="fill-text-3 text-[11px] tabular">
                {formatoY(t)}
              </text>
            </g>
          ))}
        {!mini &&
          ticksX.map((t) => (
            <text key={t} x={x(t)} y={alto - 6} textAnchor="middle" className="fill-text-3 text-[11px] tabular">
              {formatoX ? formatoX(t) : `${Math.round(t)} ${etiquetaEjeX}`}
            </text>
          ))}

        {trazo && (
          <motion.path
            d={trazo}
            fill="none"
            stroke="var(--c-text-3)"
            strokeWidth={1.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={enVista ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
          />
        )}

        {ajustesExtra.map((a, k) => {
          const d = line<{ x: number; y: number }>()
            .x((p) => x(p.x))
            .y((p) => y(p.y))
            .curve(curveMonotoneX)(a.puntos);
          return d ? (
            <motion.path
              key={k}
              d={d}
              fill="none"
              stroke={a.color}
              strokeOpacity={0.55}
              strokeWidth={1.5}
              initial={{ pathLength: 0 }}
              animate={enVista ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
            />
          ) : null;
        })}

        {puntos.map((p, i) => {
          const activo = p.id === seleccionado;
          return (
            <g key={p.id} onPointerEnter={() => onSeleccionar?.(p.id)} onClick={() => onSeleccionar?.(p.id)} className={onSeleccionar ? "cursor-pointer" : undefined}>
              {/* Zona táctil amplia, invisible. */}
              {onSeleccionar && <circle cx={x(p.x)} cy={y(p.y)} r={16} fill="transparent" />}
              <motion.circle
                cx={x(p.x)}
                cy={y(p.y)}
                initial={{ opacity: 0 }}
                animate={{ opacity: enVista ? 1 : 0, r: activo ? 6 : 3.5 }}
                transition={{ opacity: { delay: 0.35 + i * 0.03, duration: 0.2 }, r: { type: "spring", stiffness: 420, damping: 30 } }}
                fill={activo ? "var(--c-accent)" : (p.color ?? "var(--c-text)")}
                stroke="var(--c-surface)"
                strokeWidth={activo ? 2 : 1.5}
              />
            </g>
          );
        })}

        {etiquetasFijas.map((p) =>
          p ? (
            <text key={p.id} x={x(p.x)} y={y(p.y) - 10} textAnchor={p === puntos[0] ? "start" : "end"} className="fill-text-3 text-[11px] font-medium">
              {p.etiqueta}
            </text>
          ) : null,
        )}
      </svg>

      {/* Chip chico pegado al punto (no una caja flotante gigante). */}
      {sel && !mini && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-(--radius-chip) bg-inverse px-2 py-1 text-[12px] font-medium whitespace-nowrap text-on-inverse"
          style={{ left: Math.min(Math.max(x(sel.x), 48), ancho - 48), top: y(sel.y) - 12 }}
        >
          {sel.etiqueta} · <span className="tabular">{formatoY(sel.y)}</span>
          {sel.fechaX && <span className="opacity-60"> · {mesAnio(sel.fechaX)}</span>}
        </div>
      )}
    </div>
  );
}
