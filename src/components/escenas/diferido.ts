"use client";

import { useEffect } from "react";

/**
 * Corre `montar` cuando el navegador queda libre (o a los 1,5 s como máximo) y desmonta al salir.
 * `montar` puede ser asíncrona (para cargar GSAP o Lenis con import()) y devolver su limpieza.
 */
export function useCuandoEsteLibre(montar: () => Promise<(() => void) | void>, deps: React.DependencyList) {
  useEffect(() => {
    let vivo = true;
    let limpiar: (() => void) | void;
    const correr = () => {
      void montar().then((l) => {
        if (vivo) limpiar = l;
        else l?.();
      });
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const id = w.requestIdleCallback ? w.requestIdleCallback(correr, { timeout: 1500 }) : window.setTimeout(correr, 300);
    return () => {
      vivo = false;
      if (w.cancelIdleCallback) w.cancelIdleCallback(id);
      else window.clearTimeout(id);
      limpiar?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
