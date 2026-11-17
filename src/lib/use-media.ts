"use client";

import { useSyncExternalStore } from "react";

/** true si la media query se cumple. En el servidor devuelve `porDefecto`. */
export function useMedia(query: string, porDefecto = false): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = matchMedia(query);
      mq.addEventListener("change", avisar);
      return () => mq.removeEventListener("change", avisar);
    },
    () => matchMedia(query).matches,
    () => porDefecto,
  );
}

export const useEsDesktop = () => useMedia("(min-width: 64rem)", true);
export const useMovimientoReducido = () => useMedia("(prefers-reduced-motion: reduce)");
