"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ProviderMark } from "@/components/ui/provider-mark";
import { SegmentedControl } from "@/components/ui/segmented";
import type { TipoMovimiento } from "@/lib/inversores/datos";
import { fechaCorta, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";

export type FilaMovimiento = { clave: string; ticker: string | null; logo?: string; nombre: string; pesoAntes: number; pesoAhora: number; acciones: string | null; href: string | null; argentino: boolean };
export type TrimestreMovimientos = { periodo: string; etiqueta: string; presentado: string; grupos: Record<TipoMovimiento, FilaMovimiento[]> };

const TITULOS: Record<TipoMovimiento, string> = { nueva: "Posiciones nuevas", aumento: "Aumentó", reduccion: "Redujo", salida: "Vendió todo" };
const VISIBLES = 6;

/**
 * Los movimientos de cada informe contra el anterior, agrupados (como las apps que siguen carteras): de cuánto a
 * cuánto pasó el peso de cada posición en la cartera. Con un selector para ver informes anteriores.
 */
export function MovimientosInversor({ trimestres }: { trimestres: TrimestreMovimientos[] }) {
  const [periodo, setPeriodo] = useState(trimestres[0]?.periodo ?? "");
  const t = trimestres.find((x) => x.periodo === periodo) ?? trimestres[0];
  if (!t) return null;
  const vacio = Object.values(t.grupos).every((g) => g.length === 0);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-chico text-text-2">Peso en su cartera, contra el informe anterior · presentado el {fechaCorta(t.presentado, true)}</p>
        {trimestres.length > 1 && (
          <SegmentedControl etiqueta="Informe" tamano="sm" valor={t.periodo} onChange={setPeriodo} opciones={trimestres.map((x) => ({ valor: x.periodo, etiqueta: x.etiqueta }))} />
        )}
      </div>
      {vacio ? (
        <p className="text-text-2">No cambió nada en este informe.</p>
      ) : (
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-2">
          {(["nueva", "salida", "aumento", "reduccion"] as const).map((tipo) =>
            t.grupos[tipo].length ? <Grupo key={`${t.periodo}-${tipo}`} titulo={TITULOS[tipo]} filas={t.grupos[tipo]} /> : null,
          )}
        </div>
      )}
    </div>
  );
}

function Grupo({ titulo, filas }: { titulo: string; filas: FilaMovimiento[] }) {
  const [todas, setTodas] = useState(false);
  const visibles = todas ? filas : filas.slice(0, VISIBLES);
  return (
    <section className="flex min-w-0 flex-col">
      <h3 className="mb-2 text-[17px] font-semibold">{titulo}</h3>
      <ul className="flex flex-col">
        {visibles.map((f) => {
          const contenido = (
            <>
              <ProviderMark activo={f.logo} sigla={(f.ticker ?? f.nombre).slice(0, 2)} tamano={32} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  {f.ticker && <span className="font-mono text-[13px] font-semibold">{f.ticker}</span>}
                  {f.argentino && <span className="rounded-full bg-accent/10 px-1.5 py-px text-[11px] font-medium text-accent">Argentina</span>}
                </span>
                <span className="block truncate text-chico text-text-2">{f.nombre}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className="tabular flex items-center gap-1.5 text-[15px]">
                  <span className="text-text-3">{porcentaje(f.pesoAntes, 1)}</span>
                  <ArrowRight aria-label="pasó a" className="size-3.5 text-text-3" />
                  <span className="font-semibold">{porcentaje(f.pesoAhora, 1)}</span>
                </span>
                {f.acciones && <span className="text-micro text-text-2">{f.acciones}</span>}
              </span>
            </>
          );
          return (
            <li key={f.clave} className="border-t border-border first:border-t-0">
              {f.href ? (
                <Link href={f.href} className="-mx-2 flex items-center gap-3 rounded-[14px] px-2 py-2.5 hover:bg-surface-2">
                  {contenido}
                </Link>
              ) : (
                <div className="flex items-center gap-3 py-2.5">{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>
      {filas.length > VISIBLES && (
        <button type="button" onClick={() => setTodas((x) => !x)} className={cn("mt-1 self-start text-chico font-medium text-accent hover:underline")}>
          {todas ? "Ver menos" : `Ver las ${filas.length}`}
        </button>
      )}
    </section>
  );
}
