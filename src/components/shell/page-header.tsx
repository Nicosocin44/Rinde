"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useShell } from "./shell-context";

/** Color de la lámina según el tema de la sección (DISENO.md §3). */
const TEMAS = {
  verde: "sobre-color bg-verde",
  celeste: "sobre-color bg-celeste",
  lila: "sobre-color bg-lila",
  sol: "sobre-color bg-sol",
  coral: "sobre-color bg-coral",
  tinta: "inversa bg-bg text-text",
} as const;

/**
 * Encabezado de página. Con `tema`, es una lámina de color de ancho casi completo con un titular grande
 * (como la home); sin tema, queda sobre el fondo (páginas de lectura). En mobile, el título se colapsa a la
 * barra superior al scrollear.
 */
export function PageHeader({
  titulo,
  bajada,
  acciones,
  eyebrow,
  tema,
  className,
}: {
  tema?: keyof typeof TEMAS;
  titulo: string;
  bajada?: ReactNode;
  acciones?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { setTituloCompacto } = useShell();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setTituloCompacto(e && !e.isIntersecting && e.boundingClientRect.top < 0 ? titulo : null), {
      rootMargin: "-52px 0px 0px 0px",
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      setTituloCompacto(null);
    };
  }, [titulo, setTituloCompacto]);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10",
        tema ? cn("a-lo-ancho lamina-cerrada mt-2 pt-12 pb-10 lg:mt-4 lg:pt-20 lg:pb-14", TEMAS[tema]) : "pt-6 lg:pt-14",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3 lg:gap-5">
        {eyebrow && <div className="text-chico font-medium text-text-2">{eyebrow}</div>}
        <h1 ref={ref} className={cn("text-balance", tema ? "font-display text-[48px] leading-[0.95] font-extrabold tracking-[-0.05em] md:text-[80px] xl:text-[104px]" : "text-h1")}>
          {titulo}
        </h1>
        {bajada && <div className="max-w-2xl text-[16px] leading-[24px] text-pretty text-text-2 lg:text-[19px] lg:leading-[29px]">{bajada}</div>}
      </div>
      {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
    </div>
  );
}
