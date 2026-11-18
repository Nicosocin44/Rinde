import type { EstadoDato } from "@/lib/data/types";
import { fechaCorta, hora } from "@/lib/format";
import { cn } from "@/lib/cn";

/** "En vivo", "Demorado 20 min · 16:29", "Cierre del 18 nov", "Desactualizado: último dato del 15 nov". */
export function textoEstado(estado: EstadoDato, asOf?: string | null): string {
  switch (estado) {
    case "live":
      return "En vivo";
    case "delayed":
      return asOf && asOf.length > 10 ? `Demorado 20 min · ${hora(asOf)}` : "Demorado 20 min";
    case "close":
      return asOf ? `Cierre del ${fechaCorta(asOf)}` : "Cierre del día";
    case "stale":
      return asOf ? `Desactualizado: último dato del ${fechaCorta(asOf)}` : "Desactualizado";
    case "sample":
      return "Datos de ejemplo";
  }
}

const COLOR: Record<EstadoDato, string> = { live: "bg-gain", delayed: "bg-warn", sample: "bg-warn", stale: "bg-warn", close: "bg-current opacity-60" };

/**
 * Estado del dato, corto (pedido de los fundadores, 18/11/2026: sin notas de fuente, pero el punto solo no se entiende):
 * un punto de color y dos o tres palabras. Toma el color del texto que lo rodea, así funciona también sobre las láminas
 * de color del Inicio.
 */
export function EstadoDiscreto({ estado, asOf, className }: { estado: EstadoDato; asOf?: string | null; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-micro whitespace-nowrap", className)}>
      <span className={cn("inline-flex size-1.5 shrink-0 rounded-full", COLOR[estado])} aria-hidden />
      {textoEstado(estado, asOf)}
    </span>
  );
}
