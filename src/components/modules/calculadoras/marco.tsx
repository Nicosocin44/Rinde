import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Marco de cada calculadora: inputs a la izquierda (arriba en mobile), resultado grande + gráfico a la derecha,
 * explicación en una línea, "Compartir resultado" y link a la fórmula.
 */
export function MarcoCalculadora({ entradas, resultado, pie, ancla }: { entradas: ReactNode; resultado: ReactNode; pie?: ReactNode; ancla: string }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-16">
      <div className="flex flex-col gap-5 lg:sticky lg:top-[132px] lg:self-start">{entradas}</div>
      <div className="flex min-w-0 flex-col gap-6">
        {resultado}
        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          {pie}
          <Link href={`/metodologia#${ancla}`} className="text-chico text-text-2 underline decoration-border-strong decoration-dotted underline-offset-4 hover:text-text">
            Ver la fórmula
          </Link>
        </div>
        <p className="text-micro">Es una simulación con los supuestos que elegiste, no una promesa de rendimiento ni una recomendación.</p>
      </div>
    </div>
  );
}

export function Resultado({ etiqueta, cifra, detalle }: { etiqueta: string; cifra: ReactNode; detalle?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <p className="text-label">{etiqueta}</p>
      <div className="text-hero">{cifra}</div>
      {detalle && <div className="text-[16px] leading-[24px] text-text-2">{detalle}</div>}
    </div>
  );
}
