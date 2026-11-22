"use client";

import { useEffect, useState } from "react";
import { PriceChart, type SerieCompacta } from "@/components/charts/price-chart";
import type { VelaCompacta } from "@/lib/calculos";
import { YieldCurve } from "@/components/charts/yield-curve";
import { SegmentedControl } from "@/components/ui/segmented";
import { fijarMonedaVista } from "@/lib/favoritos/moneda-vista";
import { numero, porcentaje } from "@/lib/format";

export type SerieGrafico = {
  id: string;
  etiqueta: string;
  titulo: string;
  moneda: string;
  serie: SerieCompacta;
  /** Velas diarias: habilitan el gráfico de velas. */
  velas?: VelaCompacta[];
  /** Recorrido del día: habilita el rango "1D". */
  intradia?: VelaCompacta[];
  /** Variación de hoy (fracción), siempre visible al lado del precio. */
  variacionDia?: number | null;
  etiquetaDia?: string;
};

/**
 * Gráfico de la ficha, con una o más series para elegir (en pesos / en dólares). En dólares se ve si el activo le ganó
 * a la devaluación, que en pesos queda escondida. El selector va arriba del gráfico: en 375 px no entra al lado de los rangos.
 */
export function GraficoActivo({ series }: { series: SerieGrafico[] }) {
  const validas = series.filter((s) => s.serie.length > 1);
  const [id, setId] = useState(validas[0]?.id ?? "");
  const actual = validas.find((s) => s.id === id) ?? validas[0];
  // La moneda que se está mirando: "★ Seguir" suma el activo a Siguiendo en esa moneda.
  const monedaVista = actual ? (actual.moneda === "US$" ? "USD" : "ARS") : null;
  useEffect(() => {
    fijarMonedaVista(monedaVista);
    return () => fijarMonedaVista(null);
  }, [monedaVista]);
  if (!actual) return null;
  return (
    <div className="flex flex-col gap-4">
      {validas.length > 1 && (
        <SegmentedControl etiqueta="Moneda del gráfico" tamano="sm" className="self-start" valor={actual.id} onChange={setId} opciones={validas.map((s) => ({ valor: s.id, etiqueta: s.etiqueta }))} />
      )}
      <PriceChart
        key={actual.id}
        serie={actual.serie}
        velas={actual.velas}
        intradia={actual.intradia}
        variacionDia={actual.variacionDia}
        etiquetaDia={actual.etiquetaDia}
        titulo={actual.titulo}
        rangoInicial="1A"
        alto={320}
        moneda={actual.moneda}
      />
    </div>
  );
}

/** Curva de LECAPs y BONCAPs (días contra TEA) con la letra de la ficha marcada. */
export function CurvaConLetra({ letras, ajuste, ticker }: { letras: { id: string; dias: number; tea: number }[]; ajuste: { dias: number; tea: number }[]; ticker: string }) {
  const [marcada, setMarcada] = useState<string | null>(ticker);
  return (
    <YieldCurve
      alto={260}
      puntos={letras.map((l) => ({ id: l.id, x: l.dias, y: l.tea, etiqueta: l.id }))}
      ajuste={ajuste.map((p) => ({ x: p.dias, y: p.tea }))}
      seleccionado={marcada}
      onSeleccionar={(v) => setMarcada(v ?? ticker)}
      formatoY={(v) => porcentaje(v, 1)}
      formatoX={(v) => `${numero(v, 0)} días`}
    />
  );
}
