"use client";

import { arc, pie } from "d3-shape";
import { m, useReducedMotion } from "motion/react";
import { useState } from "react";
import { CATEGORICOS } from "@/components/charts/colores";
import { LOGOS_ACTIVOS } from "@/config/logos";
import { pesosCompacto, porcentaje } from "@/lib/format";

export type Porcion = { clave: string; nombre: string; ticker: string | null; logo?: string; valor: number; peso: number };

/**
 * La cartera como un anillo ancho, con el logo de cada posición adentro de su porción y el porcentaje afuera (como las
 * infografías de las carteras de Buffett). Las porciones chicas no llevan logo ni porcentaje: se ven en la lista de
 * abajo, que es la versión accesible del gráfico. Al pasar el mouse (o tocar), el centro dice cuál es.
 */
export function DonaConLogos({ porciones, total, tamano = 340 }: { porciones: Porcion[]; total: number; tamano?: number }) {
  const reducido = useReducedMotion();
  const [activa, setActiva] = useState<string | null>(null);
  const r = tamano / 2 - 34; // lugar para los porcentajes de afuera
  const interior = r * 0.6;
  const arcos = pie<Porcion>()
    .value((d) => d.valor)
    .sort(null)
    .padAngle(0.008)(porciones);
  const generador = arc<(typeof arcos)[number]>().innerRadius(interior).outerRadius(r).cornerRadius(3);
  const centroLogo = (interior + r) / 2;
  const lado = Math.min(34, (r - interior) * 0.62);
  const sel = porciones.find((p) => p.clave === activa);

  return (
    <div className="relative mx-auto aspect-square w-full" style={{ maxWidth: tamano }}>
      <svg viewBox={`${-tamano / 2} ${-tamano / 2} ${tamano} ${tamano}`} className="size-full overflow-visible" role="img" aria-label="Composición de la cartera: la lista de abajo tiene el detalle">
        <defs>
          <clipPath id="dona-logo">
            <rect x={-lado / 2} y={-lado / 2} width={lado} height={lado} rx={7} />
          </clipPath>
        </defs>
        {arcos.map((a, i) => {
          const angulo = a.endAngle - a.startAngle;
          const medio = (a.startAngle + a.endAngle) / 2;
          // Redondeado: el servidor y el navegador no dan el mismo último decimal en sin/cos (y React avisa la diferencia).
          const redondo = (v: number) => Math.round(v * 100) / 100;
          const [x, y] = [redondo(Math.sin(medio) * centroLogo), redondo(-Math.cos(medio) * centroLogo)];
          const [px, py] = [redondo(Math.sin(medio) * (r + 18)), redondo(-Math.cos(medio) * (r + 18))];
          const esResto = a.data.clave === "resto";
          const logo = a.data.logo && LOGOS_ACTIVOS.has(a.data.logo) ? `/logos/activos/${a.data.logo}.png` : null;
          const entra = angulo * centroLogo > lado + 8;
          return (
            <m.g
              key={a.data.clave}
              initial={reducido ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: activa && activa !== a.data.clave ? 0.35 : 1, scale: 1 }}
              transition={{ duration: 0.35, delay: activa === null && !reducido ? i * 0.035 : 0, ease: [0.2, 0, 0, 1] }}
              onPointerEnter={() => setActiva(a.data.clave)}
              onPointerLeave={() => setActiva(null)}
              onClick={() => setActiva((x) => (x === a.data.clave ? null : a.data.clave))}
              className="cursor-default"
            >
              <path d={generador(a) ?? ""} fill={esResto ? "var(--c-surface-2)" : CATEGORICOS[i % CATEGORICOS.length]} stroke="var(--c-bg)" strokeWidth={1} />
              {entra && !esResto && (
                <g transform={`translate(${x} ${y})`}>
                  {logo ? (
                    <>
                      <rect x={-lado / 2} y={-lado / 2} width={lado} height={lado} rx={7} fill="white" />
                      <image href={logo} x={-lado / 2} y={-lado / 2} width={lado} height={lado} clipPath="url(#dona-logo)" preserveAspectRatio="xMidYMid meet" />
                    </>
                  ) : (
                    <text textAnchor="middle" dominantBaseline="central" className="fill-[var(--c-text)] font-mono text-[11px] font-semibold">
                      {(a.data.ticker ?? a.data.nombre).slice(0, 5)}
                    </text>
                  )}
                </g>
              )}
              {a.data.peso >= 0.025 && (
                <text x={px} y={py} textAnchor="middle" dominantBaseline="central" className="tabular fill-[var(--c-text-2)] text-[12px] font-medium">
                  {porcentaje(a.data.peso, 1)}
                </text>
              )}
            </m.g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[24%] text-center">
        {sel ? (
          <>
            <span className="line-clamp-2 text-chico font-semibold">{sel.nombre}</span>
            <span className="tabular text-[22px] leading-tight font-bold tracking-[-0.02em]">{porcentaje(sel.peso, 1)}</span>
            <span className="tabular text-micro text-text-2">{pesosCompacto(sel.valor, "US$")}</span>
          </>
        ) : (
          <>
            <span className="text-micro text-text-2">En acciones</span>
            <span className="tabular text-[22px] leading-tight font-bold tracking-[-0.02em]">{pesosCompacto(total, "US$")}</span>
            <span className="text-micro text-text-2">{porciones.filter((p) => p.clave !== "resto").length} principales</span>
          </>
        )}
      </div>
    </div>
  );
}
