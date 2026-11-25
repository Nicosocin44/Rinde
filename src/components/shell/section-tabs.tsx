"use client";

import { LayoutGroup, m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useEsconderAlBajar } from "@/lib/use-esconder-al-bajar";

export type Solapa = { href: string; label: string };

/**
 * Si las solapas ya quedaron pegadas arriba: la marca (un div vacío justo antes) pasó la altura a la que quedan fijas.
 * La marca no se mueve con la animación de esconderse, así que la cuenta no depende de ella.
 */
function estanPegadas(barraEl: HTMLElement | null, marcaEl: HTMLElement | null): boolean {
  if (!barraEl || !marcaEl) return false;
  const estilo = getComputedStyle(barraEl);
  return marcaEl.getBoundingClientRect().top + parseFloat(estilo.marginTop) <= parseFloat(estilo.top) + 1;
}

/**
 * Solapas de sección: control segmentado tipo Apple, pegajoso debajo de la nav, con indicador que se desliza.
 * Son rutas reales (/pesos/lecaps): se pueden compartir, indexar y volver atrás.
 *
 * Mientras se baja leyendo, ya pegadas arriba, se esconden junto con la barra superior; vuelven apenas se scrollea
 * para arriba (useEsconderAlBajar).
 */
export function SectionTabs({ solapas, etiqueta, sinSolapa = [] }: { solapas: Solapa[]; etiqueta: string; /** Páginas de la sección que no son de ninguna solapa: ahí no se marca ninguna. */ sinSolapa?: string[] }) {
  const pathname = usePathname();
  const activa = sinSolapa.includes(pathname)
    ? undefined
    : ([...solapas].sort((a, b) => b.href.length - a.href.length).find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`))?.href ?? solapas[0]?.href);
  const contenedor = useRef<HTMLDivElement>(null);
  const primera = useRef(true);
  const barra = useRef<HTMLDivElement>(null);
  const marca = useRef<HTMLDivElement>(null);
  // Se pueden esconder recién cuando quedaron pegadas.
  const oculta = useEsconderAlBajar(barra, () => estanPegadas(barra.current, marca.current));
  // Pegadas, llevan detrás una franja de fondo (de la barra de arriba para abajo, a todo el ancho): el contenido que pasa
  // por debajo desaparece prolijo en vez de verse encimado alrededor de las píldoras.
  const [pegadas, setPegadas] = useState(false);
  useEffect(() => {
    const revisar = () => setPegadas(estanPegadas(barra.current, marca.current));
    window.addEventListener("scroll", revisar, { passive: true });
    window.addEventListener("resize", revisar);
    return () => {
      window.removeEventListener("scroll", revisar);
      window.removeEventListener("resize", revisar);
    };
  }, []);

  // En mobile, la solapa activa siempre queda a la vista (centrada) dentro del carrusel. Se mueve solo el carrusel, no
  // la página; al cargar, sin animación (un scroll suave al cargar se corta y la última solapa quedaba fuera de la vista).
  useEffect(() => {
    const c = contenedor.current;
    const el = c?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!c || !el) return;
    const r = el.getBoundingClientRect();
    const left = c.scrollLeft + r.left - c.getBoundingClientRect().left - (c.clientWidth - r.width) / 2;
    c.scrollTo({ left, behavior: primera.current ? "auto" : "smooth" });
    primera.current = false;
  }, [activa]);

  return (
    <>
      <div ref={marca} aria-hidden />
      <div
        ref={barra}
        data-oculta={oculta || undefined}
        data-pegadas={pegadas || undefined}
        className={cn(
          "sticky top-[76px] z-30 -mx-4 mt-8 px-4 py-1 transition-[translate,opacity] duration-(--duration-short) ease-(--ease-standard) motion-reduce:transition-none md:-mx-10 md:px-10 lg:top-[92px] lg:mx-0 lg:mt-10 lg:px-0",
          // La franja: desde arriba de todo (cubre también el espacio entre las dos barras) hasta debajo de las solapas.
          pegadas &&
            "before:pointer-events-none before:absolute before:bottom-[-6px] before:left-1/2 before:-z-10 before:h-[calc(100%+82px)] before:w-screen before:-translate-x-1/2 before:border-b before:border-border before:bg-bg/85 before:backdrop-blur-md lg:before:h-[calc(100%+98px)]",
          // Escondidas: suben fuera de la pantalla (por detrás de la barra superior, z-40) y no se pueden tocar.
          oculta && "pointer-events-none -translate-y-[calc(100%+76px)] opacity-0 lg:-translate-y-[calc(100%+92px)]",
        )}
      >
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
    </>
  );
}
