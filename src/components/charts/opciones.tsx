"use client";

import { line } from "d3-shape";
import { useId, useState } from "react";
import { numero, pesos, pesosConSigno, porcentaje } from "@/lib/format";
import { useAncho } from "@/lib/use-ancho";
import { cn } from "@/lib/cn";
import { CATEGORICOS } from "./colores";
import { conMargen, escalaLineal, ticksLindos } from "./escalas";

type Punto = { x: number; y: number };

// ───────────────────────── Sonrisa de volatilidad ─────────────────────────

/**
 * Volatilidad implícita de cada base (calls y puts) de un vencimiento, con una línea donde está el precio.
 * Si las bases lejanas están más caras que las del medio, la curva "sonríe".
 */
export function SonrisaVolatilidad({ calls, puts, precio, ticker, alto = 260, className }: { calls: Punto[]; puts: Punto[]; precio: number; ticker: string; alto?: number; className?: string }) {
  const [ref, ancho] = useAncho<HTMLDivElement>(720);
  const [hover, setHover] = useState<{ tipo: "Call" | "Put"; p: Punto } | null>(null);
  const todos = [...calls, ...puts];
  if (todos.length < 2) return null;
  const m = { t: 16, r: 52, b: 28, l: 8 };
  const dx = conMargen([Math.min(...todos.map((p) => p.x), precio), Math.max(...todos.map((p) => p.x), precio)], 0.04);
  const dy = conMargen([Math.min(...todos.map((p) => p.y)), Math.max(...todos.map((p) => p.y))], 0.15);
  const x = escalaLineal(dx, [m.l, ancho - m.r]);
  const y = escalaLineal(dy, [alto - m.b, m.t]);
  const ticksY = ticksLindos(dy[0], dy[1], 4).filter((t) => t >= dy[0] && t <= dy[1]);
  const ticksX = ticksLindos(dx[0], dx[1], ancho < 480 ? 3 : 6).filter((t) => t >= dx[0] && t <= dx[1]);
  const trazo = line<Punto>()
    .x((p) => x(p.x))
    .y((p) => y(p.y));
  const series = [
    { tipo: "Call" as const, puntos: [...calls].sort((a, b) => a.x - b.x), color: CATEGORICOS[0]! },
    { tipo: "Put" as const, puntos: [...puts].sort((a, b) => a.x - b.x), color: CATEGORICOS[1]! },
  ];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-micro">
        {series.map((s) => (
          <span key={s.tipo} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.tipo === "Call" ? "Calls" : "Puts"}
          </span>
        ))}
        <span className="tabular min-h-5 text-text-2">{hover ? `${hover.tipo} base ${numero(hover.p.x, 0)}: ${porcentaje(hover.p.y, 1)}` : "Tocá un punto para ver su valor"}</span>
      </div>
      <div ref={ref} className="relative w-full select-none" style={{ height: alto }}>
        <svg
          width={ancho}
          height={alto}
          role="img"
          aria-label={`Volatilidad implícita por base. Calls: ${calls.map((p) => `${numero(p.x, 0)} ${porcentaje(p.y, 0)}`).join(", ")}. Puts: ${puts.map((p) => `${numero(p.x, 0)} ${porcentaje(p.y, 0)}`).join(", ")}.`}
          className="overflow-visible"
          onPointerLeave={() => setHover(null)}
        >
          {ticksY.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={ancho - m.r} y1={y(t)} y2={y(t)} stroke="var(--c-border)" />
              <text x={ancho - m.r + 10} y={y(t)} dy="0.32em" className="fill-text-3 text-[11px] tabular">
                {porcentaje(t, 0)}
              </text>
            </g>
          ))}
          {ticksX.map((t) => (
            <text key={t} x={x(t)} y={alto - 6} textAnchor="middle" className="fill-text-3 text-[11px] tabular">
              {numero(t, 0)}
            </text>
          ))}
          <line x1={x(precio)} x2={x(precio)} y1={m.t} y2={alto - m.b} stroke="var(--c-accent)" strokeDasharray="3 3" />
          <text x={x(precio)} y={m.t - 4} textAnchor="middle" className="fill-accent text-[11px] font-medium tabular">
            {ticker} {pesos(precio, 0)}
          </text>
          {series.map((s) => (
            <g key={s.tipo}>
              {s.puntos.length > 1 && <path d={trazo(s.puntos) ?? ""} fill="none" stroke={s.color} strokeWidth={1.5} strokeOpacity={0.7} />}
              {s.puntos.map((p) => {
                const activo = hover?.tipo === s.tipo && hover.p.x === p.x;
                return (
                  <g key={p.x} onPointerEnter={() => setHover({ tipo: s.tipo, p })} onClick={() => setHover({ tipo: s.tipo, p })} className="cursor-pointer">
                    <circle cx={x(p.x)} cy={y(p.y)} r={12} fill="transparent" />
                    <circle cx={x(p.x)} cy={y(p.y)} r={activo ? 5.5 : 3.5} fill={s.color} stroke="var(--c-surface)" strokeWidth={1.5} />
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ───────────────────────── Historial de una prima ─────────────────────────

/** Línea simple de una prima por día (los días sin rueda no ocupan lugar). */
export function LineaHistorial({ puntos, etiqueta, alto = 200, className }: { puntos: { fecha: string; valor: number }[]; etiqueta: string; alto?: number; className?: string }) {
  const [ref, ancho] = useAncho<HTMLDivElement>(720);
  const [hover, setHover] = useState<number | null>(null);
  if (puntos.length < 2) return null;
  const m = { t: 12, r: 64, b: 28, l: 8 };
  const valores = puntos.map((p) => p.valor);
  const dy = conMargen([Math.min(...valores), Math.max(...valores)], 0.15);
  const x = escalaLineal([0, puntos.length - 1], [m.l, ancho - m.r]);
  const y = escalaLineal(dy, [alto - m.b, m.t]);
  const ticksY = ticksLindos(dy[0], dy[1], 3).filter((t) => t >= dy[0] && t <= dy[1]);
  const d = line<{ fecha: string; valor: number }>()
    .x((_, i) => x(i))
    .y((p) => y(p.valor))(puntos);
  const etiquetasX = [0, Math.floor((puntos.length - 1) / 2), puntos.length - 1].filter((i, k, a) => a.indexOf(i) === k);
  const actual = hover !== null ? puntos[hover] : puntos.at(-1);
  return (
    <div ref={ref} className={cn("relative w-full select-none", className)} style={{ height: alto }}>
      <svg
        width={ancho}
        height={alto}
        role="img"
        aria-label={`${etiqueta}: ${puntos.map((p) => `${fechaCortaSimple(p.fecha)} ${pesos(p.valor, 2)}`).join(", ")}`}
        className="overflow-visible"
        onPointerMove={(e) => {
          const caja = e.currentTarget.getBoundingClientRect();
          setHover(Math.max(0, Math.min(puntos.length - 1, Math.round(x.invertir(e.clientX - caja.left)))));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={ancho - m.r} y1={y(t)} y2={y(t)} stroke="var(--c-border)" />
            <text x={ancho - m.r + 10} y={y(t)} dy="0.32em" className="fill-text-3 text-[11px] tabular">
              {numero(t, t < 10 ? 2 : 0)}
            </text>
          </g>
        ))}
        {etiquetasX.map((i) => (
          <text key={i} x={x(i)} y={alto - 6} textAnchor={i === 0 ? "start" : i === puntos.length - 1 ? "end" : "middle"} className="fill-text-3 text-[11px] tabular">
            {fechaCortaSimple(puntos[i]!.fecha)}
          </text>
        ))}
        <path d={d ?? ""} fill="none" stroke="var(--c-text)" strokeWidth={1.75} strokeLinejoin="round" />
        {actual && (
          <g pointerEvents="none">
            <circle cx={x(puntos.indexOf(actual))} cy={y(actual.valor)} r={4} fill="var(--c-accent)" stroke="var(--c-surface)" strokeWidth={1.5} />
            <text x={x(puntos.indexOf(actual))} y={y(actual.valor) - 10} textAnchor="middle" className="fill-text text-[11px] font-medium tabular">
              {pesos(actual.valor, 2)} · {fechaCortaSimple(actual.fecha)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/** "18/11" sin depender del año. */
const fechaCortaSimple = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

// ───────────────────────── Ganancia y pérdida de una estrategia ─────────────────────────

/**
 * Resultado de una estrategia según el precio de la acción: al vencimiento (línea llena, verde arriba de cero y roja
 * abajo) y hoy según el modelo (punteada). Al pasar el dedo o el mouse muestra el resultado en ese precio.
 */
export function GraficoResultado({
  vencimiento,
  hoy,
  precio,
  equilibrios,
  ticker,
  alto = 300,
  className,
}: {
  vencimiento: Punto[];
  hoy: Punto[] | null;
  precio: number;
  equilibrios: number[];
  ticker: string;
  alto?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [ref, ancho] = useAncho<HTMLDivElement>(720);
  const [cursor, setCursor] = useState<number | null>(null);
  if (vencimiento.length < 2) return null;
  const m = { t: 20, r: 72, b: 28, l: 8 };
  const ys = [...vencimiento.map((p) => p.y), ...(hoy ?? []).map((p) => p.y), 0];
  const dx: [number, number] = [vencimiento[0]!.x, vencimiento.at(-1)!.x];
  const dy = conMargen([Math.min(...ys), Math.max(...ys)], 0.12);
  const x = escalaLineal(dx, [m.l, ancho - m.r]);
  const y = escalaLineal(dy, [alto - m.b, m.t]);
  const ticksY = ticksLindos(dy[0], dy[1], 4).filter((t) => t >= dy[0] && t <= dy[1]);
  const ticksX = ticksLindos(dx[0], dx[1], ancho < 480 ? 3 : 6).filter((t) => t >= dx[0] && t <= dx[1]);
  const trazo = line<Punto>()
    .x((p) => x(p.x))
    .y((p) => y(p.y));
  const area = `${trazo(vencimiento)}L${x(dx[1])},${y(0)}L${x(dx[0])},${y(0)}Z`;
  const cero = y(0);
  const cerca = (serie: Punto[], valor: number) => serie.reduce((m2, p) => (Math.abs(p.x - valor) < Math.abs(m2.x - valor) ? p : m2), serie[0]!);
  const enCursor = cursor !== null ? { venc: cerca(vencimiento, cursor), hoy: hoy ? cerca(hoy, cursor) : null } : null;
  const mover = (e: React.PointerEvent<SVGSVGElement>) => {
    const caja = e.currentTarget.getBoundingClientRect();
    const valor = x.invertir(e.clientX - caja.left);
    setCursor(Math.min(dx[1], Math.max(dx[0], valor)));
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-micro">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-text" aria-hidden />
          Al vencimiento
        </span>
        {hoy && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-4 border-t border-dashed border-text-2" aria-hidden />
            Hoy, según el modelo
          </span>
        )}
        <span className="tabular min-h-5 text-text-2">
          {enCursor ? (
            <>
              Si {ticker} vale {pesos(enCursor.venc.x, 0)}: <span className={cn("font-semibold", enCursor.venc.y >= 0 ? "text-gain" : "text-loss")}>{pesosConSigno(enCursor.venc.y, 0)}</span> al vencimiento
              {enCursor.hoy && <> · {pesosConSigno(enCursor.hoy.y, 0)} hoy</>}
            </>
          ) : (
            "Pasá el dedo por el gráfico para ver el resultado en cada precio"
          )}
        </span>
      </div>
      <div ref={ref} className="relative w-full touch-pan-y select-none" style={{ height: alto }}>
        <svg
          width={ancho}
          height={alto}
          role="img"
          aria-label={`Resultado al vencimiento según el precio de ${ticker}. Puntos de equilibrio: ${equilibrios.map((e) => pesos(e, 0)).join(", ") || "ninguno"}.`}
          className="overflow-visible"
          onPointerMove={mover}
          onPointerDown={mover}
          onPointerLeave={() => setCursor(null)}
        >
          <defs>
            <clipPath id={`gana-${id}`}>
              <rect x={0} y={0} width={ancho} height={Math.max(0, cero)} />
            </clipPath>
            <clipPath id={`pierde-${id}`}>
              <rect x={0} y={cero} width={ancho} height={Math.max(0, alto - cero)} />
            </clipPath>
          </defs>
          {ticksY.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={ancho - m.r} y1={y(t)} y2={y(t)} stroke="var(--c-border)" />
              <text x={ancho - m.r + 10} y={y(t)} dy="0.32em" className="fill-text-3 text-[11px] tabular">
                {Math.abs(t) >= 1_000_000 ? `${numero(t / 1_000_000, 1)} M` : Math.abs(t) >= 1000 ? `${numero(t / 1000, 0)} mil` : numero(t, 0)}
              </text>
            </g>
          ))}
          {ticksX.map((t) => (
            <text key={t} x={x(t)} y={alto - 6} textAnchor="middle" className="fill-text-3 text-[11px] tabular">
              {numero(t, 0)}
            </text>
          ))}
          <path d={area} fill="var(--c-gain)" fillOpacity={0.14} clipPath={`url(#gana-${id})`} />
          <path d={area} fill="var(--c-loss)" fillOpacity={0.14} clipPath={`url(#pierde-${id})`} />
          <line x1={m.l} x2={ancho - m.r} y1={cero} y2={cero} stroke="var(--c-text-3)" />
          <line x1={x(precio)} x2={x(precio)} y1={m.t} y2={alto - m.b} stroke="var(--c-accent)" strokeDasharray="3 3" />
          <text x={x(precio)} y={m.t - 6} textAnchor="middle" className="fill-accent text-[11px] font-medium tabular">
            Hoy {pesos(precio, 0)}
          </text>
          {hoy && <path d={trazo(hoy) ?? ""} fill="none" stroke="var(--c-text-2)" strokeWidth={1.5} strokeDasharray="4 4" />}
          <path d={trazo(vencimiento) ?? ""} fill="none" stroke="var(--c-text)" strokeWidth={2} strokeLinejoin="round" />
          {equilibrios
            .filter((e) => e >= dx[0] && e <= dx[1])
            .map((e) => (
              <g key={e}>
                <circle cx={x(e)} cy={cero} r={4} fill="var(--c-surface)" stroke="var(--c-text)" strokeWidth={1.5} />
                <text x={x(e)} y={cero + 16} textAnchor="middle" className="fill-text-2 text-[11px] tabular">
                  {numero(e, 0)}
                </text>
              </g>
            ))}
          {enCursor && (
            <g pointerEvents="none">
              <line x1={x(enCursor.venc.x)} x2={x(enCursor.venc.x)} y1={m.t} y2={alto - m.b} stroke="var(--c-border-strong)" />
              <circle cx={x(enCursor.venc.x)} cy={y(enCursor.venc.y)} r={4.5} fill={enCursor.venc.y >= 0 ? "var(--c-gain)" : "var(--c-loss)"} stroke="var(--c-surface)" strokeWidth={1.5} />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
