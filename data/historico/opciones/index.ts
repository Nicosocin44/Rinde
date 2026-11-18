// Generado por scripts/guardar-opciones.mjs: no editar a mano.
import type { FotoOpciones } from "./tipos";
import m0 from "./2026-11.json";

/** Una foto por día hábil de las opciones, desde que empezamos a guardarlas. (JSON → tupla: TypeScript no infiere tuplas de un JSON.) */
export const HISTORIAL_OPCIONES: Record<string, FotoOpciones> = { ...(m0 as unknown as Record<string, FotoOpciones>) };
