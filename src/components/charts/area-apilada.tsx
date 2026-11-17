"use client";

import { area, curveMonotoneX } from "d3-shape";
import { motion } from "motion/react";
import { useState } from "react";
import { useAncho } from "@/lib/use-ancho";
import { cn } from "@/lib/cn";
import { escalaLineal, ticksLindos } from "./escalas";

export type PuntoApilado = { x: number; base: number; extra: number };

/**
 * Área apilada: base en gris (lo que pusiste) y extra en celeste (lo que ganaste), con la cifra final grande arriba
 * (la pone el contenedor). Scrub: al pasar el cursor, `onScrub` informa el punto.
 */
export function AreaApilada({
  puntos,
  alto = 260,
  formatoY,
  formatoX,
  onScrub,
  className,
}: {
  puntos: PuntoApilado[];
  alto?: number;
  formatoY: (v: number) => string;
  formatoX: (x: number) => string;
  onScrub?: (p: PuntoApilado | null) => void;
  className?: string;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>(640);
  const [activo, setActivo] = useState<PuntoApilado | null>(null);
  if (puntos.length < 2) return <div style={{ height: alto }} />;
  const m = { t: 12, r: 64, b: 26, l: 4 };
  const maxY = Math.max(...puntos.map((p) => p.base + Math.max(0, p.extra)));
  const x = escalaLineal([puntos[0]!.x, puntos[puntos.length - 1]!.x], [m.l, ancho - m.r]);
  const y = escalaLineal([0, maxY * 1.05], [alto - m.b, m.t]);
  const base = area<PuntoApilado>().x((p) => x(p.x)).y0(y(0)).y1((p) => y(p.base)).curve(curveMonotoneX)(puntos);
  const total = area<PuntoApilado>().x((p) => x(p.x)).y0((p) => y(p.base)).y1((p) => y(p.base + Math.max(0, p.extra))).curve(curveMonotoneX)(puntos);
  const ticksY = ticksLindos(0, maxY, 3).filter((t) => t > 0);
  const paso = Math.max(1, Math.round(puntos.length / (ancho < 480 ? 4 : 6)));
  const ticksX = puntos.filter((_, i) => i % paso === 0 || i === puntos.length - 1);

  const mover = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xv = x.invertir(e.clientX - rect.left);
    const p = puntos.reduce((mejor, q) => (Math.abs(q.x - xv) < Math.abs(mejor.x - xv) ? q : mejor), puntos[0]!);
    setActivo(p);
    onScrub?.(p);
  };

  return (
    <div ref={ref} className={cn("relative w-full touch-pan-y", className)} style={{ height: alto }}>
      <svg
        width={ancho}
        height={alto}
        role="img"
        aria-label="Evolución: lo que ponés y lo que ganás"
        onPointerMove={mover}
        onPointerLeave={() => {
          setActivo(null);
          onScrub?.(null);
        }}
      >
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={ancho - m.r} y1={y(t)} y2={y(t)} stroke="var(--c-border)" />
            <text x={ancho - m.r + 10} y={y(t)} dy="0.32em" className="fill-text-3 text-[11px] tabular">
              {formatoY(t)}
            </text>
          </g>
        ))}
        <line x1={m.l} x2={ancho - m.r} y1={y(0)} y2={y(0)} stroke="var(--c-border-strong)" />
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          {base && <path d={base} fill="var(--c-text-3)" fillOpacity={0.28} />}
          {total && <path d={total} fill="var(--c-accent)" fillOpacity={0.55} />}
        </motion.g>
        {ticksX.map((p, i) => (
          <text key={p.x} x={x(p.x)} y={alto - 6} textAnchor={i === 0 ? "start" : i === ticksX.length - 1 ? "end" : "middle"} className="fill-text-3 text-[11px] tabular">
            {formatoX(p.x)}
          </text>
        ))}
        {activo && (
          <g>
            <line x1={x(activo.x)} x2={x(activo.x)} y1={m.t} y2={alto - m.b} stroke="var(--c-border-strong)" />
            <circle cx={x(activo.x)} cy={y(activo.base + Math.max(0, activo.extra))} r={4} fill="var(--c-accent)" stroke="var(--c-surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
    </div>
  );
}
