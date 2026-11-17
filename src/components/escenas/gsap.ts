"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Punto único de entrada a GSAP: registra los plugins una sola vez.
 * Regla de movimiento (DISENO.md §7): acción → llegada → pausa. Nada en loop.
 */
gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };

/** Media queries para `gsap.matchMedia()`: la coreografía completa, o fundidos simples. */
export const CON_MOVIMIENTO = "(prefers-reduced-motion: no-preference)";
export const SIN_MOVIMIENTO = "(prefers-reduced-motion: reduce)";
