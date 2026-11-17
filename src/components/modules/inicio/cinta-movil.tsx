"use client";

import { useRef, type ReactNode } from "react";
import { CON_MOVIMIENTO, gsap, ScrollTrigger, useGSAP } from "@/components/escenas/gsap";

/**
 * Mueve la cinta en función de la posición del scroll: es una función pura de `scrollY`, así que
 * cuando dejás de scrollear, la cinta queda quieta. Bajar la corre a la izquierda; subir, a la derecha.
 */
export function CintaMovil({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(CON_MOVIMIENTO, () => {
        const setX = gsap.quickSetter(el, "x", "px");
        // Cada copia mide un tercio; el desplazamiento se envuelve dentro de una copia.
        let periodo = el.scrollWidth / 3;
        const pintar = (scroll: number) => {
          const x = (scroll * 0.45) % periodo;
          setX(-x);
        };
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
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className="cinta">
      {children}
    </div>
  );
}
