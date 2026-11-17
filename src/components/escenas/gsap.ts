import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Motor de movimiento (GSAP + ScrollTrigger). No se importa de forma estática: se carga con
 * `cuandoEsteLibre()` para que no compita con la carga de la página.
 * Regla de movimiento (DISENO.md §7): acción → llegada → pausa. Nada en loop.
 */
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/** Media queries para `gsap.matchMedia()`: la coreografía completa, o fundidos simples. */
export const CON_MOVIMIENTO = "(prefers-reduced-motion: no-preference)";
export const SIN_MOVIMIENTO = "(prefers-reduced-motion: reduce)";
