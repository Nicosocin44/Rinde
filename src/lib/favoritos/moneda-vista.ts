"use client";

import { useSyncExternalStore } from "react";

/**
 * En qué moneda está mirando la persona la ficha abierta ("En pesos" / "En dólares" del gráfico). Lo fija el gráfico y
 * lo lee "★ Seguir", para sumar el activo a Siguiendo en esa moneda. null si la ficha no tiene selector de moneda.
 */
let actual: "ARS" | "USD" | null = null;
const oyentes = new Set<() => void>();

export function fijarMonedaVista(moneda: "ARS" | "USD" | null): void {
  if (moneda === actual) return;
  actual = moneda;
  oyentes.forEach((fn) => fn());
}

export function useMonedaVista(): "ARS" | "USD" | null {
  return useSyncExternalStore(
    (fn) => {
      oyentes.add(fn);
      return () => oyentes.delete(fn);
    },
    () => actual,
    () => null,
  );
}
