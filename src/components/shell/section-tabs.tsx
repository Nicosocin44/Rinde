"use client";

import { LayoutGroup, m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Solapa = { href: string; label: string };

/**
 * Solapas de sección: control segmentado tipo Apple, pegajoso debajo de la nav, con indicador que se desliza.
 * Son rutas reales (/pesos/lecaps): se pueden compartir, indexar y volver atrás.
 */
export function SectionTabs({ solapas, etiqueta, extra }: { solapas: Solapa[]; etiqueta: string; /** Algo a la derecha de las solapas (en Mercados, el botón de Siguiendo). */ extra?: ReactNode }) {
  const pathname = usePathname();
  const activa = [...solapas].sort((a, b) => b.href.length - a.href.length).find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`))?.href ?? solapas[0]?.href;
  const contenedor = useRef<HTMLDivElement>(null);

  // En mobile, la solapa activa siempre queda a la vista dentro del carrusel.
  useEffect(() => {
    const el = contenedor.current?.querySelector<HTMLElement>('[aria-current="page"]');
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activa]);

  return (
    <div className="sticky top-[76px] z-30 -mx-4 mt-8 px-4 py-1 md:-mx-10 md:px-10 lg:top-[92px] lg:mx-0 lg:mt-10 lg:px-0">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <LayoutGroup id={`tabs-${etiqueta}`}>
            <nav aria-label={etiqueta}>
              <div ref={contenedor} className="sin-scrollbar -mx-1 overflow-x-auto px-1">
                <ul className="inline-flex h-12 min-w-max items-stretch rounded-full bg-surface-2 p-1">
                  {solapas.map((s) => {
                    const activo = s.href === activa;
                    return (
                      <li key={s.href} className="flex">
                        <Link
                          href={s.href}
                          scroll={false}
                          aria-current={activo ? "page" : undefined}
                          className={cn(
                            "relative z-0 flex items-center rounded-full px-5 text-[15px] font-semibold whitespace-nowrap transition-colors duration-(--duration-short)",
                            activo ? "text-on-inverse" : "text-text-2 hover:text-text",
                          )}
                        >
                          {activo && (
                            <m.span
                              layoutId="thumb-solapa"
                              className="absolute inset-0 -z-10 rounded-full bg-inverse"
                              transition={{ type: "spring", stiffness: 420, damping: 36, mass: 1 }}
                            />
                          )}
                          {s.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </nav>
          </LayoutGroup>
        </div>
        {extra}
      </div>
    </div>
  );
}
