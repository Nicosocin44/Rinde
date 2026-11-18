"use client";

import { useState } from "react";
import { PriceChart, type SerieCompacta } from "@/components/charts/price-chart";
import { SegmentedControl } from "@/components/ui/segmented";

/**
 * Gráfico de la ficha: el precio en pesos o en dólares (cada cierre dividido por el MEP de ese día).
 * En dólares se ve si el activo le ganó a la devaluación, que en pesos queda escondida.
 * El selector de moneda va arriba del gráfico (no al lado de los rangos): en 375 px no entran los dos en una fila.
 */
export function GraficoActivo({ ticker, enPesos, enDolares }: { ticker: string; enPesos: SerieCompacta; enDolares: SerieCompacta }) {
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const hayDolares = enDolares.length > 1;
  const serie = moneda === "ARS" || !hayDolares ? enPesos : enDolares;
  return (
    <div className="flex flex-col gap-4">
      {hayDolares && (
        <SegmentedControl
          etiqueta="Moneda del gráfico"
          tamano="sm"
          className="self-start"
          valor={moneda}
          onChange={setMoneda}
          opciones={[
            { valor: "ARS", etiqueta: "En pesos" },
            { valor: "USD", etiqueta: "En dólares" },
          ]}
        />
      )}
      <PriceChart key={moneda} serie={serie} titulo={`${ticker} ${moneda === "ARS" ? "en pesos" : "en dólares MEP"}`} rangoInicial="1A" alto={320} moneda={moneda === "ARS" ? "$" : "US$"} />
    </div>
  );
}
