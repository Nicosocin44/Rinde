"use client";

import { useState } from "react";
import { PriceChart, type SerieCompacta } from "@/components/charts/price-chart";
import { SegmentedControl } from "@/components/ui/segmented";
import { porcentaje } from "@/lib/format";

type Casa = "mep" | "oficial" | "blue";
const formatoBrecha = (v: number) => porcentaje(v, 1);

export function HistoricoDolar({ series, brecha }: { series: Record<Casa, SerieCompacta>; brecha: SerieCompacta }) {
  const [casa, setCasa] = useState<Casa>("mep");
  const nombre = { mep: "Dólar MEP", oficial: "Dólar oficial", blue: "Dólar blue" }[casa];
  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col gap-4">
        <SegmentedControl
          etiqueta="Qué dólar"
          valor={casa}
          onChange={setCasa}
          opciones={[
            { valor: "mep", etiqueta: "MEP" },
            { valor: "oficial", etiqueta: "Oficial" },
            { valor: "blue", etiqueta: "Blue" },
          ]}
          className="self-start"
        />
        <PriceChart key={casa} serie={series[casa]} titulo={nombre} rangoInicial="1A" alto={340} />
      </section>
      <section className="flex flex-col gap-3">
        <PriceChart serie={brecha} titulo="Brecha MEP contra oficial" rangoInicial="1A" alto={220} formato={formatoBrecha} variacionEn="puntos" tono="neutro" />
        <p className="max-w-2xl text-chico text-text-2">
          La brecha es cuánto más caro (o más barato) está el MEP que el oficial: MEP ÷ oficial − 1. Cuando es chica, comprar en el banco y en el broker cuesta parecido.
        </p>
      </section>
    </div>
  );
}
