"use client";

import { area, curveMonotoneX, line } from "d3-shape";
import { useState } from "react";
import { escalaLineal, ticksLindos } from "@/components/charts/escalas";
import type { PuntoCamino } from "@/lib/calculos";
import { useAncho } from "@/lib/use-ancho";
import { cn } from "@/lib/cn";

/**
 * Camino a la meta: lo que ponés (gris) y lo que rinde (acento) apilados, y lo que va a costar la meta (línea punteada,
 * sube con la inflación). Una línea vertical marca la fecha que eligió la persona. Al pasar el cursor, el mes y los números.
 */
export function CaminoMeta({
  puntos,
  mesMeta,
  formatoY,
  etiquetaMes,
  alto = 220,
  className,
}: {
  puntos: PuntoCamino[];
  /** Mes (desde hoy) de la fecha de la meta. */
  mesMeta: number;
  formatoY: (v: number) => string;
  etiquetaMes: (mes: number) => string;
  alto?: number;
  className?: string;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>(640);
  const [activo, setActivo] = useState<PuntoCamino | null>(null);
  if (puntos.length < 2) return null;

  const m = { t: 12, r: 64, b: 26, l: 4 };
  const ultimo = puntos[puntos.length - 1]!;
  const maxY = Math.max(...puntos.map((p) => Math.max(p.total, p.objetivo, p.puesto)));
  const x = escalaLineal([0, ultimo.mes], [m.l, ancho - m.r]);
  const y = escalaLineal([0, maxY * 1.08], [alto - m.b, m.t]);
  const puesto = area<PuntoCamino>().x((p) => x(p.mes)).y0(y(0)).y1((p) => y(Math.min(p.puesto, p.total))).curve(curveMonotoneX)(puntos);
  const ganancia = area<PuntoCamino>().x((p) => x(p.mes)).y0((p) => y(Math.min(p.puesto, p.total))).y1((p) => y(p.total)).curve(curveMonotoneX)(puntos);
  const objetivo = line<PuntoCamino>().x((p) => x(p.mes)).y((p) => y(p.objetivo)).curve(curveMonotoneX)(puntos);
  const ticksY = ticksLindos(0, maxY, 4).filter((t) => t > 0);
  const paso = Math.max(1, Math.ceil(ultimo.mes / (ancho < 480 ? 3 : 5)));
  // Un tick cada `paso` meses y el último; se saltea el anterior al último si quedan pegados.
  const ticksX = puntos.filter((p) => p.mes === ultimo.mes || (p.mes % paso === 0 && ultimo.mes - p.mes >= paso / 2));
  const mostrado = activo ?? null;

  const mover = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mes = Math.round(x.invertir(e.clientX - rect.left));
    setActivo(puntos[Math.min(puntos.length - 1, Math.max(0, mes))] ?? null);
  };

  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div ref={ref} className="relative w-full touch-pan-y" style={{ height: alto }}>
        <svg width={ancho} height={alto} role="img" aria-label="Camino a la meta: lo que ponés, lo que rinde y lo que va a costar, mes a mes" onPointerMove={mover} onPointerLeave={() => setActivo(null)}>
          {ticksY.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={ancho - m.r} y1={y(t)} y2={y(t)} stroke="var(--c-border)" />
              <text x={ancho - m.r + 10} y={y(t)} dy="0.32em" className="fill-text-3 text-[11px] tabular">
                {formatoY(t)}
              </text>
            </g>
          ))}
          <line x1={m.l} x2={ancho - m.r} y1={y(0)} y2={y(0)} stroke="var(--c-border-strong)" />
          {puesto && <path d={puesto} fill="var(--c-text-3)" fillOpacity={0.28} />}
          {ganancia && <path d={ganancia} fill="var(--c-accent)" fillOpacity={0.55} />}
          {objetivo && <path d={objetivo} fill="none" stroke="var(--c-text)" strokeWidth={1.5} strokeDasharray="4 4" />}
          {mesMeta > 0 && mesMeta <= ultimo.mes && (
            <g>
              <line x1={x(mesMeta)} x2={x(mesMeta)} y1={m.t} y2={alto - m.b} stroke="var(--c-text-2)" strokeWidth={1} />
              <text x={x(mesMeta) - 6} y={m.t + 10} textAnchor="end" className="fill-text-2 text-[11px]">
                Tu fecha
              </text>
            </g>
          )}
          {ticksX.map((p, i) => (
            <text key={p.mes} x={x(p.mes)} y={alto - 6} textAnchor={i === 0 ? "start" : p.mes === ultimo.mes ? "end" : "middle"} className="fill-text-3 text-[11px] tabular">
              {p.mes === 0 ? "Hoy" : etiquetaMes(p.mes)}
            </text>
          ))}
          {mostrado && (
            <g>
              <line x1={x(mostrado.mes)} x2={x(mostrado.mes)} y1={m.t} y2={alto - m.b} stroke="var(--c-border-strong)" />
              <circle cx={x(mostrado.mes)} cy={y(mostrado.total)} r={4} fill="var(--c-accent)" stroke="var(--c-surface)" strokeWidth={2} />
              <circle cx={x(mostrado.mes)} cy={y(mostrado.objetivo)} r={3} fill="var(--c-text)" />
            </g>
          )}
        </svg>
        {mostrado && (
          <div className="pointer-events-none absolute top-0 left-0 rounded-(--radius-chip) bg-surface px-2.5 py-1.5 text-micro shadow-(--shadow-overlay)" aria-live="polite">
            <p className="font-medium text-text">{mostrado.mes === 0 ? "Hoy" : etiquetaMes(mostrado.mes)}</p>
            <p className="tabular text-text-2">
              Tenés {formatoY(mostrado.total)} · cuesta {formatoY(mostrado.objetivo)}
            </p>
          </div>
        )}
      </div>
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 text-micro text-text-3">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px] bg-text-3/40" /> Lo que ponés
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px] bg-accent/60" /> Lo que rinde
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="w-4 border-t-[1.5px] border-dashed border-text" /> Lo que va a costar
        </span>
      </figcaption>
    </figure>
  );
}
