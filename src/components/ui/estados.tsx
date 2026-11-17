import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Skeleton con la misma forma que el contenido final; brillo muy sutil (4 % → 8 %). Nunca spinners. */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden className={cn("block rounded-(--radius-chip) animate-brillo bg-(--skeleton-a)", className)} style={style} />;
}

/** Estado vacío tipográfico: una frase, una línea de ayuda y un botón. Sin ilustraciones. */
export function EmptyState({ titulo, ayuda, accion, className }: { titulo: string; ayuda?: string; accion?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-2 py-10", className)}>
      <p className="text-h3">{titulo}</p>
      {ayuda && <p className="max-w-md text-chico text-text-2">{ayuda}</p>}
      {accion && <div className="mt-3">{accion}</div>}
    </div>
  );
}

/**
 * Estado de error de un widget. Humano y concreto: qué pasó y qué mostramos en su lugar.
 * Ej.: "No pudimos actualizar el dólar cripto. Mostramos el último dato (18:12)."
 */
export function ErrorState({ titulo, detalle, className, compacto = false }: { titulo: string; detalle?: string; className?: string; compacto?: boolean }) {
  return (
    <div role="status" className={cn("flex flex-col gap-1", compacto ? "py-4" : "py-10", className)}>
      <p className={cn(compacto ? "text-[15px] font-medium" : "text-h3")}>{titulo}</p>
      {detalle && <p className="max-w-md text-chico text-text-2">{detalle}</p>}
    </div>
  );
}
