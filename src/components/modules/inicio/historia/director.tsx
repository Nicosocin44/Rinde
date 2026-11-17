"use client";

import { useRef } from "react";
import { useCuandoEsteLibre } from "@/components/escenas/diferido";
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
    const [{ gsap, CON_MOVIMIENTO, SIN_MOVIMIENTO }, { COREOGRAFIAS }] = await Promise.all([import("@/components/escenas/gsap"), import("./coreografias")]);
    const q = gsap.utils.selector(el);
    const fluidoMobile = el.dataset.fluido === "true";
    const mm = gsap.matchMedia();
    mm.add({ movimiento: CON_MOVIMIENTO, mobile: "(max-width: 767px)" }, (ctx) => {
      if (!ctx.conditions?.movimiento) return;
      const mobile = Boolean(ctx.conditions.mobile);
      const fluido = fluidoMobile && mobile;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: fluido ? "top 85%" : comienzo, end: fluido ? "bottom 75%" : "bottom bottom", scrub: 0.6, invalidateOnRefresh: true },
      });
      COREOGRAFIAS[coreografia](tl, q, { mobile, datos });
      // Completa hasta 1: el resto del recorrido es la pausa.
      if (tl.duration() < 1) tl.to({}, { duration: 1 - tl.duration() });
    });
    mm.add(SIN_MOVIMIENTO, () => {
      gsap.from(q(".escena-interior"), { opacity: 0, duration: 0.12, scrollTrigger: { trigger: el, start: "top 85%", once: true } });
    });
    return () => mm.revert();
  }, [coreografia, comienzo, datos]);
  return <span ref={ref} hidden />;
}
