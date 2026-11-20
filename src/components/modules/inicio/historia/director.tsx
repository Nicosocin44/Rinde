"use client";

import { useRef } from "react";
import { useCuandoEsteLibre } from "@/components/escenas/diferido";
import { EVENTO_ALTO_ESCENA } from "@/components/escenas/si-no-entra";
import type { DatosMacizo, NombreCoreografia } from "./coreografias";

/**
 * El único pedazo de cliente de cada escena: un <span> oculto que toma su sección (renderizada en el
 * servidor) y le conecta la coreografía. GSAP y las coreografías se cargan cuando el navegador queda
 * libre, así no compiten con la carga de la portada. Antes de eso, la escena se ve en su estado final.
 */
export function Director({ coreografia, comienzo = "top 70%", datos }: { coreografia: NombreCoreografia; comienzo?: string; datos?: DatosMacizo }) {
  const ref = useRef<HTMLSpanElement>(null);
  useCuandoEsteLibre(async () => {
    const el = ref.current?.closest<HTMLElement>("[data-escena]");
    if (!el) return;
    const [{ gsap, ScrollTrigger, CON_MOVIMIENTO, SIN_MOVIMIENTO }, { COREOGRAFIAS }] = await Promise.all([import("@/components/escenas/gsap"), import("./coreografias")]);
    const q = gsap.utils.selector(el);
    const fluidoMobile = el.dataset.fluido === "true";
    const mm = gsap.matchMedia();
    mm.add({ movimiento: CON_MOVIMIENTO, mobile: "(max-width: 767px)" }, (ctx) => {
      if (!ctx.conditions?.movimiento) return;
      const mobile = Boolean(ctx.conditions.mobile);
      // Fluida: en mobile si la escena lo pide, o en cualquier pantalla donde su contenido no entra (data-bajo, de
      // SiNoEntra). Entonces la coreografía se reparte en el recorrido de la escena en vez de en la escena fija.
      const fluidoMovil = fluidoMobile && mobile;
      const bajo = () => el.dataset.bajo === "true";
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: () => (fluidoMovil || bajo() ? "top 85%" : comienzo),
          // Si no entra, la coreografía termina con el centro de la escena en el centro de la pantalla: así se ve
          // completa (por ejemplo, las tasas ya ordenadas) mientras el título todavía está a la vista.
          end: () => (fluidoMovil ? "bottom 75%" : bajo() ? "center center" : "bottom bottom"),
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
      COREOGRAFIAS[coreografia](tl, q, { mobile, datos });
      // Completa hasta 1: el resto del recorrido es la pausa.
      if (tl.duration() < 1) tl.to({}, { duration: 1 - tl.duration() });
    });
    mm.add(SIN_MOVIMIENTO, () => {
      gsap.from(q(".escena-interior"), { opacity: 0, duration: 0.12, scrollTrigger: { trigger: el, start: "top 85%", once: true } });
    });
    // Si una escena pasa de fija a fluida (o al revés), cambian los altos de la página: se recalculan los recorridos.
    const recalcular = () => ScrollTrigger.refresh();
    window.addEventListener(EVENTO_ALTO_ESCENA, recalcular);
    return () => {
      window.removeEventListener(EVENTO_ALTO_ESCENA, recalcular);
      mm.revert();
    };
  }, [coreografia, comienzo, datos]);
  return <span ref={ref} hidden />;
}
