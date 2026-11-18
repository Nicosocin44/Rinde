// Generado por scripts/guardar-tasas.mjs: no editar a mano.
import type { FotoTasas } from "./tipos";
import m0 from "./2026-11.json";

/** Una foto por día hábil de las tasas, desde que empezamos a guardarlas. */
export const HISTORIAL_TASAS: Record<string, FotoTasas> = { ...(m0 as Record<string, FotoTasas>) };
