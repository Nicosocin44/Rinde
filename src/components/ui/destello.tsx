"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Destello de una cotización que cambia: un segundo de fondo verde si subió o rojo si bajó, y se apaga solo.
 * Envuelve la cifra ya dibujada; `valor` es el número que se compara contra el anterior. En la primera carga no hace nada.
 */
export function Destello({ valor, children, className }: { valor: number | null | undefined; children: React.ReactNode; className?: string }) {
  const [anterior, setAnterior] = useState(valor);
  const [tono, setTono] = useState<"sube" | "baja" | null>(null);
  const [pulso, setPulso] = useState(0);
  if (valor !== anterior) {
    // Patrón "guardar información de renders anteriores" (como NumberTicker): React lo procesa antes de pintar.
    setAnterior(valor);
    if (typeof valor === "number" && typeof anterior === "number") {
      setTono(valor > anterior ? "sube" : "baja");
      setPulso((p) => p + 1);
    }
  }
  return (
    // Dos clases que alternan (con animaciones de distinto nombre) reinician el destello sin volver a montar la cifra:
    // así el NumberTicker de adentro puede rodar del valor viejo al nuevo.
    <span className={cn("destello", tono && `destello-${tono}-${pulso % 2}`, className)}>
      {children}
    </span>
  );
}
