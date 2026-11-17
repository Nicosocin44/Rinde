"use client";

import { useRef, type ReactNode } from "react";
import { useCuandoEsteLibre } from "@/components/escenas/diferido";

/**
 * Mueve la cinta en función de la posición del scroll: es una función pura de `scrollY`, así que
 * cuando dejás de scrollear, la cinta queda quieta. Bajar la corre a la izquierda; subir, a la derecha.
 * GSAP se carga cuando el navegador queda libre.
 */
export function CintaMovil({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useCuandoEsteLibre(async () => {
    const el = ref.current;
    if (!el) return;
    const { gsap, ScrollTrigger, CON_MOVIMIENTO } = await import("@/components/escenas/gsap");
    const mm = gsap.matchMedia();
    mm.add(CON_MOVIMIENTO, () => {
      const setX = gsap.quickSetter(el, "x", "px");
      // Cada copia mide un tercio; el desplazamiento se envuelve dentro de una copia.
      let periodo = el.scrollWidth / 3;
      const pintar = (scroll: number) => setX(-((scroll * 0.45) % periodo));
      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => pintar(self.scroll()),
        onRefresh: (self) => {
          periodo = el.scrollWidth / 3;
          pintar(self.scroll());
        },
      });
      pintar(st.scroll());
    });
    return () => mm.revert();
  }, []);
  return (
    <div ref={ref} className="cinta">
      {children}
    </div>
  );
}
