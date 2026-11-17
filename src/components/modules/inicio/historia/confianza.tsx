"use client";

import Link from "next/link";
import { Escena } from "@/components/escenas/escena";
import { FreshnessBadge } from "@/components/ui/frescura";
import { hora } from "@/lib/format";
import type { FuenteEstado } from "./datos";

const REGLAS = [
  { titulo: "Neutral", texto: "El orden lo decide la tasa o el precio. Que una empresa sea socia no la sube ni un lugar, y hay un test automático que lo verifica." },
  { titulo: "Con la cuenta a la vista", texto: "Cada fórmula está escrita en la metodología, completada con los valores de hoy." },
  { titulo: "Sin números de relleno", texto: "Si una fuente falla, te mostramos el último dato con su hora. Nunca un valor inventado." },
];

/**
 * Escena 7 · Confianza. Las fuentes reales, cada una con su estado en este momento: entran como filas
 * y cada una "prende" su estado. Al lado, las tres reglas que sostienen todo lo anterior.
 */
export function EscenaConfianza({ fuentes }: { fuentes: FuenteEstado[] }) {
  return (
    <Escena
      etiqueta="Confianza"
      alto={180}
      altoMobile={170}
      comienzo="top 60%"
      fluidoMobile
      armar={(tl, q) => {
        tl.from(q("[data-titulo]"), { y: 40, opacity: 0, duration: 0.1, ease: "power2.out" }, 0);
        q("[data-fuente]").forEach((f, i) => {
          tl.from(f, { y: 26, opacity: 0, duration: 0.08, ease: "power2.out" }, 0.1 + i * 0.05);
          tl.from(f.querySelector("[data-estado]"), { opacity: 0, x: 10, duration: 0.05 }, 0.16 + i * 0.05);
        });
        tl.from(q("[data-regla]"), { y: 24, opacity: 0, duration: 0.08, stagger: 0.05, ease: "power2.out" }, 0.18);
      }}
      claseInterior="flex flex-col"
    >
      <div className="flex h-full flex-col justify-start gap-6 pt-20 pb-10 md:justify-center md:gap-12 md:pt-24 md:pb-14">
        <div data-titulo className="grid gap-2 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)] md:items-end md:gap-12">
          <h2 className="text-h1 text-balance max-md:text-[36px]">Ningún número sin su fuente.</h2>
          <p className="max-w-[40ch] text-[15px] leading-[22px] text-text-2 max-md:hidden md:text-[17px] md:leading-[26px]">
            Todo lo que viste hasta acá sale de estas fuentes públicas, en este momento. Así están ahora mismo:
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] md:gap-16">
          <ul aria-label="Fuentes de datos y su estado ahora">
            {fuentes.map((f) => (
              <li key={f.id} data-fuente className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-t border-border py-2.5 last:border-b md:grid-cols-[10rem_minmax(0,1fr)_auto] md:py-3.5">
                <a href={f.url} target="_blank" rel="noreferrer" className="font-display text-[16px] font-bold tracking-[-0.02em] hover:underline md:text-[19px]">
                  {f.nombre}
                </a>
                <span className="col-span-2 row-start-2 truncate text-[13px] text-text-2 md:col-span-1 md:col-start-2 md:row-start-1 md:text-[14px]">{f.usadaPara}</span>
                <span data-estado className="col-start-2 row-start-1 md:col-start-3">
                  {f.estado === "error" ? (
                    <span className="inline-flex items-center gap-1.5 text-micro text-warn">
                      <span className="size-1.5 rounded-full bg-warn" />
                      Sin respuesta ahora
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-micro">
                      <FreshnessBadge estado={f.estado} asOf={f.asOf} />
                      {f.asOf && f.estado !== "close" && <span className="tabular-nums">{hora(f.asOf)}</span>}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-5 md:gap-7">
            {REGLAS.map((r) => (
              <div key={r.titulo} data-regla>
                <p className="font-display text-[19px] font-bold tracking-[-0.02em] md:text-[22px]">{r.titulo}</p>
                <p className="mt-1 text-[14px] leading-[21px] text-text-2 md:text-[15px] md:leading-[23px]">{r.texto}</p>
              </div>
            ))}
            <Link href="/metodologia" className="self-start text-[15px] font-semibold underline decoration-border-strong underline-offset-4 hover:decoration-text">
              Leer la metodología
            </Link>
          </div>
        </div>
      </div>
    </Escena>
  );
}
