"use client";

import { arc, pie } from "d3-shape";
import { m } from "motion/react";
import type { ReactNode } from "react";

import { CATEGORICOS } from "./colores";
export { CATEGORICOS };

/**
 * Donut fino (anillo de 14 px) con el total en el centro. La leyenda va aparte, como lista con porcentajes.
 * 6 tonos apagados; si hay más categorías, el resto se agrupa en "Otros" antes de llegar acá.
 */
export function Donut({ datos, tamano = 200, centro, activo, onActivo }: { datos: { clave: string; valor: number }[]; tamano?: number; centro?: ReactNode; activo?: string | null; onActivo?: (k: string | null) => void }) {
  const r = tamano / 2;
  const arcos = pie<{ clave: string; valor: number }>()
    .value((d) => d.valor)
    .sort(null)
    .padAngle(0.012)(datos);
  const generador = arc<(typeof arcos)[number]>()
    .innerRadius(r - 14)
    .outerRadius(r)
    .cornerRadius(2);
  return (
    <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} viewBox={`${-r} ${-r} ${tamano} ${tamano}`} role="img" aria-label="Distribución de la cartera">
        {arcos.map((a, i) => (
          <m.path
            key={a.data.clave}
            d={generador(a) ?? ""}
            fill={CATEGORICOS[i % CATEGORICOS.length]}
            initial={{ opacity: 0 }}
            animate={{ opacity: activo && activo !== a.data.clave ? 0.3 : 1 }}
            transition={{ duration: 0.2, delay: activo === undefined ? i * 0.04 : 0 }}
            onPointerEnter={() => onActivo?.(a.data.clave)}
            onPointerLeave={() => onActivo?.(null)}
          />
        ))}
      </svg>
      {centro && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{centro}</div>}
    </div>
  );
}
