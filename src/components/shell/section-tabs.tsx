"use client";

import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type Solapa = { href: string; label: string };

/**
 * Solapas de sección: control segmentado tipo Apple, pegajoso debajo de la nav, con indicador que se desliza.
 * Son rutas reales (/pesos/lecaps): se pueden compartir, indexar y volver atrás.
 */
export function SectionTabs({ solapas, etiqueta }: { solapas: Solapa[]; etiqueta: string }) {
  const pathname = usePathname();
  const activa = [...solapas].sort((a, b) => b.href.length - a.href.length).find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`))?.href ?? solapas[0]?.href;
  const contenedor = useRef<HTMLDivElement>(null);

  // En mobile, la solapa activa siempre queda a la vista dentro del carrusel.
  useEffect(() => {
    const el = contenedor.current?.querySelector<HTMLElement>('[aria-current="page"]');
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activa]);

  return (
    <div className="vidrio sticky top-[52px] z-30 -mx-4 mt-6 px-4 py-2 md:-mx-10 md:px-10 lg:top-16 lg:mx-0 lg:mt-8 lg:bg-transparent lg:px-0 lg:backdrop-filter-none">
      <LayoutGroup id={`tabs-${etiqueta}`}>
        <nav aria-label={etiqueta}>
          <div ref={contenedor} className="sin-scrollbar -mx-1 overflow-x-auto px-1">
            <ul className="inline-flex h-9 min-w-max items-stretch rounded-(--radius-control) bg-surface-2 p-[3px]">
              {solapas.map((s) => {
                const activo = s.href === activa;
                return (
                  <li key={s.href} className="flex">
                    <Link
                      href={s.href}
                      scroll={false}
                      aria-current={activo ? "page" : undefined}
                      className={cn(
                        "relative z-0 flex items-center rounded-[7px] px-3.5 text-[14px] font-medium whitespace-nowrap transition-colors duration-(--duration-short)",
                        activo ? "text-text" : "text-text-2 hover:text-text",
                      )}
                    >
                      {activo && (
                        <motion.span
                          layoutId="thumb-solapa"
                          className="absolute inset-0 -z-10 rounded-[7px] bg-surface shadow-(--shadow-thumb) dark:bg-[#2a2e35]"
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
  );
}
