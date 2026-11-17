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
 * Barra superior de 64 px, translúcida. La hairline inferior aparece recién al scrollear.
 * En mobile: wordmark (o el título compacto de la página) y buscador.
 */
export function TopNav() {
  const pathname = usePathname();
  const { setPaletaAbierta, tituloCompacto } = useShell();
  // En mobile no montamos la nav de escritorio ni sus controles: ahorra mediciones de layout en celulares.
  const esDesktop = useEsDesktop();
  const [scrolleado, setScrolleado] = useState(false);

  useEffect(() => {
    const alScrollear = () => setScrolleado(window.scrollY > 4);
    alScrollear();
    window.addEventListener("scroll", alScrollear, { passive: true });
    return () => window.removeEventListener("scroll", alScrollear);
  }, []);

  return (
    <header
      className={cn(
        "vidrio sticky top-0 z-40 transition-[box-shadow] duration-(--duration-short)",
        scrolleado ? "shadow-[inset_0_-1px_0_var(--c-border)]" : "shadow-[inset_0_-1px_0_transparent]",
      )}
      style={{ viewTransitionName: "barra-superior" }}
    >
      <div className="contenedor flex h-[52px] items-center justify-between gap-6 lg:h-16">
        <div className="relative flex min-w-0 flex-1 items-center lg:flex-none">
          <Wordmark className={cn("transition-opacity duration-(--duration-short) lg:opacity-100", tituloCompacto && "opacity-0 lg:opacity-100")} />
          {/* Título compacto estilo iOS: aparece cuando el título grande sale de pantalla (solo mobile). */}
          <span
            aria-hidden={!tituloCompacto}
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 flex items-center truncate text-[17px] font-semibold tracking-[-0.01em] transition-[opacity,transform] duration-(--duration-short) lg:hidden",
              tituloCompacto ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
            )}
          >
            {tituloCompacto}
          </span>
        </div>

        {esDesktop && (
        <nav aria-label="Principal" className="hidden lg:block">
          <LayoutGroup id="nav">
            <ul className="flex items-center gap-1">
              {navPrincipal.map((item) => {
                const activo = rutaActiva(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={activo ? "page" : undefined}
                      className={cn(
                        "relative flex h-10 items-center px-3 text-[14px] font-medium transition-colors duration-(--duration-micro)",
                        activo ? "text-text" : "text-text-2 hover:text-text",
                      )}
                    >
                      {item.label}
                      {activo && (
                        <m.span
                          layoutId="punto-nav"
                          className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-text"
                          transition={{ type: "spring", stiffness: 420, damping: 36, mass: 1 }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </LayoutGroup>
        </nav>
        )}

        <div className="flex items-center justify-end gap-1.5 lg:flex-1 lg:gap-2">
          <button
            type="button"
            onClick={() => setPaletaAbierta(true)}
            className="hidden h-9 items-center gap-2 rounded-(--radius-control) border border-border pr-1.5 pl-3 text-[13px] text-text-3 transition-colors hover:border-border-strong hover:text-text-2 xl:flex"
          >
            <Search className="size-[15px]" />
            <span className="pr-6">Buscar</span>
            <kbd className="rounded-[5px] border border-border bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] text-text-3">⌘K</kbd>
          </button>
          <button
            type="button"
            aria-label="Buscar"
            onClick={() => setPaletaAbierta(true)}
            className="inline-flex size-10 items-center justify-center rounded-(--radius-control) text-text-2 hover:bg-surface-2 hover:text-text xl:hidden"
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
            <ButtonLink href="/cartera" variante="primario" tamano="sm">
              Mi cartera
            </ButtonLink>
          </div>
        </div>
      </div>
    </header>
  );
}
