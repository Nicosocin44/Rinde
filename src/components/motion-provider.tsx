"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Las funciones de animación (incluido el layout compartido) se bajan en segundo plano, no en la carga inicial. */
const cargarFunciones = () => import("./motion-funciones").then((m) => m.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={cargarFunciones} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
