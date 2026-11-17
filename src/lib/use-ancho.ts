"use client";

import { useEffect, useRef, useState } from "react";

/** Ancho del elemento, actualizado con ResizeObserver. Arranca en `inicial` (el servidor no conoce el ancho). */
export function useAncho<T extends HTMLElement>(inicial = 640) {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(inicial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      if (e) setAncho(Math.round(e.contentRect.width));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, ancho] as const;
}
