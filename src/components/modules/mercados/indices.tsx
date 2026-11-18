import Link from "next/link";
import { Delta } from "@/components/ui/delta";
import type { IndiceEEUU } from "@/lib/data/types";

/**
 * Cómo viene hoy Wall Street: S&P 500, Nasdaq 100 y Dow Jones, medidos por el CEDEAR de su ETF. La cifra grande es la
 * variación en dólares (la que se parece a la del índice); abajo, la de pesos, que también suma lo que se movió el dólar.
 */
export function IndicesEEUU({ indices }: { indices: IndiceEEUU[] }) {
  if (indices.length === 0) return null;
  return (
    <section aria-labelledby="indices-eeuu" className="mb-12 lg:mb-16">
      <h2 id="indices-eeuu" className="mb-3 text-label">
        Wall Street hoy
      </h2>
      <ul className="sin-scrollbar relative -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:px-0">
        {indices.map((i) => (
          <li key={i.ticker} className="shrink-0">
            <Link
              href={`/activo/${i.ticker}`}
              className="presionable flex w-[220px] flex-col gap-1 rounded-(--radius-card) border border-border bg-surface px-4 py-3.5 hover:border-border-strong md:w-auto"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[15px] font-semibold">{i.nombre}</span>
                <span className="font-mono text-[11px] text-text-3">vía {i.ticker}</span>
              </span>
              <Delta valor={i.variacionUsd} className="font-display text-[26px] leading-tight font-bold tracking-[-0.02em]" />
              <span className="text-micro text-text-2">
                en dólares · en pesos <Delta valor={i.variacionArs} className="text-micro" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-micro text-text-3">Variación de hoy del CEDEAR del ETF que replica cada índice, en la rueda de BYMA. No es el índice en sí, pero se mueve casi igual.</p>
    </section>
  );
}
