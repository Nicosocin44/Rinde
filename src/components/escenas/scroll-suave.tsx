"use client";

import "lenis/dist/lenis.css";
import Lenis from "lenis";
import { useEffect } from "react";
import { gsap, ScrollTrigger } from "./gsap";

/**
 * Scroll suave (Lenis) solo en la home, sincronizado con ScrollTrigger. En el celular queda el scroll
 * nativo (syncTouch apagado), que ya es suave y no compite con el dedo. Con movimiento reducido no se monta.
 */
export function ScrollSuave() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.11, anchors: { offset: -96 }, autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);
  return null;
}
