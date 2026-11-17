"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CON_MOVIMIENTO, gsap, SIN_MOVIMIENTO, useGSAP } from "./gsap";

type Selector = (sel: string) => Element[];

/**
 * Escena de la historia: un contenedor alto con un interior pegajoso (sticky) de una pantalla.
 * `armar` recibe una línea de tiempo de duración 1 atada al recorrido del contenedor
 * (0 = la escena empieza a entrar, 1 = termina de salir). Conviene que la coreografía termine
 * antes del 1: lo que sobra es la pausa, con todo quieto (DISENO.md §7).
 *
 * Sin JavaScript o antes de hidratar, se ve el estado final (el HTML ya viene armado).
 * Con movimiento reducido, el interior aparece con un fundido de 120 ms y nada más.
 */
export function Escena({
  id,
  etiqueta,
  alto = 220,
  altoMobile,
  comienzo = "top 70%",
  armar,
  className,
  claseInterior,
  children,
}: {
  id?: string;
  etiqueta: string;
  /** Alto total del contenedor, en % de la pantalla (100 = sin recorrido extra). */
  alto?: number;
  altoMobile?: number;
  /** Cuándo empieza la línea de tiempo (sintaxis de ScrollTrigger). */
  comienzo?: string;
  armar: (tl: gsap.core.Timeline, q: Selector, esMobile: boolean) => void;
  className?: string;
  claseInterior?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();
      mm.add({ movimiento: CON_MOVIMIENTO, mobile: "(max-width: 767px)" }, (ctx) => {
        if (!ctx.conditions?.movimiento) return;
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: comienzo, end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true },
        });
        armar(tl, q, Boolean(ctx.conditions.mobile));
        // Completa hasta 1: el resto del recorrido es la pausa.
        if (tl.duration() < 1) tl.to({}, { duration: 1 - tl.duration() });
      });
      mm.add(SIN_MOVIMIENTO, () => {
        gsap.from(q(".escena-interior"), { opacity: 0, duration: 0.12, scrollTrigger: { trigger: el, start: "top 85%", once: true } });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      id={id}
      aria-label={etiqueta}
      className={cn("escena h-(--alto-m) md:h-(--alto)", className)}
      style={{ "--alto": `${alto}svh`, "--alto-m": `${altoMobile ?? alto}svh` } as React.CSSProperties}
    >
      <div className={cn("escena-interior", claseInterior)}>{children}</div>
    </section>
  );
}
