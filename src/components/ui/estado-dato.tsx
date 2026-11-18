"use client";

import { useState } from "react";
import type { EstadoDato } from "@/lib/data/types";
import { fechaCorta, hora } from "@/lib/format";
import { cn } from "@/lib/cn";

const ETIQUETA: Record<EstadoDato, string> = {
  live: "En vivo",
  delayed: "Demorado 20 min",
  close: "Cierre",
  stale: "Desactualizado",
  sample: "Datos de ejemplo",
};

/** "Demorado 20 min · 16:29", "Cierre del 18 nov", "Último dato: 15 nov". */
export function textoEstado(estado: EstadoDato, asOf?: string | null): string {
  if (estado === "close") return asOf ? `Cierre del ${fechaCorta(asOf)}` : "Cierre del día";
  if (estado === "stale") return asOf ? `Último dato: ${fechaCorta(asOf)}` : ETIQUETA.stale;
  if (asOf && asOf.length > 10) return `${ETIQUETA[estado]} · ${hora(asOf)}`;
  return ETIQUETA[estado];
}

const COLOR: Record<EstadoDato, string> = { live: "bg-gain", delayed: "bg-warn", sample: "bg-warn", stale: "bg-warn", close: "bg-text-3" };

/**
 * Estado del dato, discreto (pedido de los fundadores, 18/11/2026): un punto de color sin texto. Al tocarlo dice si el
 * dato está demorado o es del cierre, y de qué hora. Con el dato en vivo no se muestra nada.
 */
export function EstadoDiscreto({ estado, asOf, className }: { estado: EstadoDato; asOf?: string | null; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  if (estado === "live") return null;
  const texto = textoEstado(estado, asOf);
  return (
    <button
      type="button"
      onClick={() => setAbierto((x) => !x)}
      aria-expanded={abierto}
      aria-label={abierto ? texto : `${texto}. Tocá para ver el detalle.`}
      title={texto}
      className={cn("inline-flex min-h-6 items-center gap-1.5 rounded-full text-micro text-text-3 hover:text-text-2", className)}
    >
      <span className={cn("inline-flex size-1.5 shrink-0 rounded-full", COLOR[estado])} aria-hidden />
      {abierto && <span className="whitespace-nowrap">{texto}</span>}
    </button>
  );
}
