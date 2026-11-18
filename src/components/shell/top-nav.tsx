"use client";

import { Search } from "lucide-react";
import { LayoutGroup, m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navPrincipal } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useEsDesktop } from "@/lib/use-media";
import { ToggleModo, ToggleTema } from "./preferencias-controles";
import { useShell } from "./shell-context";
import { Wordmark } from "./wordmark";

export function rutaActiva(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Barra superior: una cápsula flotante y translúcida, separada de los bordes. La sección activa tiene una
 * píldora de fondo que se desliza entre ítems. Al scrollear, la cápsula se compacta y gana sombra.
 */
export function TopNav() {
  const pathname = usePathname();
  const { setPaletaAbierta, tituloCompacto } = useShell();
  // En mobile no montamos la nav de escritorio ni sus controles: ahorra mediciones de layout en celulares.
  const esDesktop = useEsDesktop();
  const [scrolleado, setScrolleado] = useState(false);

  useEffect(() => {
    const alScrollear = () => setScrolleado(window.scrollY > 8);
    alScrollear();
    window.addEventListener("scroll", alScrollear, { passive: true });
    return () => window.removeEventListener("scroll", alScrollear);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 lg:px-6 lg:pt-4" style={{ viewTransitionName: "barra-superior" }}>
      <div
        className={cn(
          "vidrio mx-auto flex max-w-[1240px] items-center justify-between gap-4 rounded-full border border-border pr-2 pl-5 transition-[height,box-shadow,background-color] duration-(--duration-base) ease-(--ease-standard)",
          scrolleado ? "h-14 shadow-(--shadow-overlay)" : "h-14 lg:h-16",
        )}
      >
        <div className="relative flex min-w-0 flex-1 items-center lg:flex-none">
          <Wordmark className={cn("transition-opacity duration-(--duration-short) lg:opacity-100", tituloCompacto && "opacity-0 lg:opacity-100")} />
          {/* Título compacto estilo iOS: aparece cuando el título grande sale de pantalla (solo mobile). */}
          <span
            aria-hidden={!tituloCompacto}
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 flex items-center truncate font-display text-[18px] font-bold tracking-[-0.02em] transition-[opacity,transform] duration-(--duration-short) lg:hidden",
              tituloCompacto ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
            )}
          >
            {tituloCompacto}
          </span>
        </div>

        {esDesktop && (
          <nav aria-label="Principal" className="hidden lg:block">
            <LayoutGroup id="nav">
              <ul className="flex items-center">
                {navPrincipal.map((item) => {
                  const activo = rutaActiva(pathname, item.href);
                  return (
                    // En pantallas medianas "Inicio" se esconde (el logo ya lleva al inicio) para que entren todas las secciones.
                    <li key={item.href} className={item.href === "/" ? "hidden xl:block" : undefined}>
                      <Link
                        href={item.href}
                        aria-current={activo ? "page" : undefined}
                        className={cn(
                          "relative z-0 flex h-10 items-center rounded-full px-2.5 text-[14px] xl:px-4 xl:text-[15px] font-medium transition-colors duration-(--duration-short)",
                          activo ? "text-on-inverse" : "text-text-2 hover:text-text",
                        )}
                      >
                        {activo && (
                          <m.span
                            layoutId="pildora-nav"
                            className="absolute inset-0 -z-10 rounded-full bg-inverse"
                            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 1 }}
                          />
                        )}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </LayoutGroup>
          </nav>
        )}

        <div className="flex items-center justify-end gap-1 lg:flex-1 lg:gap-1.5">
          <button
            type="button"
            onClick={() => setPaletaAbierta(true)}
            className="hidden h-10 items-center gap-2 rounded-full pr-2 pl-3.5 text-[14px] text-text-3 transition-colors hover:bg-surface-2 hover:text-text-2 xl:flex"
          >
            <Search className="size-[15px]" />
            <span className="pr-2">Buscar</span>
          </button>
          <button
            type="button"
            aria-label="Buscar"
            onClick={() => setPaletaAbierta(true)}
            className="inline-flex size-10 items-center justify-center rounded-full text-text-2 hover:bg-surface-2 hover:text-text xl:hidden"
          >
            <Search className="size-[18px]" />
          </button>
          {esDesktop && (
            <div className="hidden lg:block">
              <ToggleModo />
            </div>
          )}
          <ToggleTema />
          <div className="hidden lg:block">
            <ButtonLink href="/cartera" variante="primario" tamano="sm" flecha>
              Mi cartera
            </ButtonLink>
          </div>
        </div>
      </div>
    </header>
  );
}
