import { z } from "zod";
import { traerJson } from "../http";

/**
 * Yahoo Finance (API de gráficos, sin autenticación): recorrido del día de un ETF de EE.UU. en velas de 5 minutos.
 * Verificado el 18/11/2026 con SPY, QQQ y DIA: 79 puntos de la rueda regular y el cierre anterior.
 * No es una API oficial: antes del lanzamiento comercial hay que revisar sus condiciones (ver PROGRESO.md).
 */
const graficoSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: z.object({ chartPreviousClose: z.number().optional(), previousClose: z.number().optional(), regularMarketPrice: z.number().optional() }),
          timestamp: z.array(z.number()).optional(),
          indicators: z.object({ quote: z.array(z.object({ close: z.array(z.number().nullable()).optional() })) }),
        }),
      )
      .nullable(),
  }),
});

export type RecorridoDelDia = {
  /** Cierre de la rueda anterior: la línea punteada del gráfico. */
  previo: number;
  /** Precios cada 5 minutos, del más viejo al más nuevo. */
  puntos: number[];
};

/** Recorrido del día de un ticker de EE.UU. Caché de 5 minutos. null si no hay datos suficientes. */
export async function recorridoDelDia(ticker: string): Promise<RecorridoDelDia | null> {
  const r = await traerJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=5m`, graficoSchema, {
    fuente: "yahoo",
    revalidate: 300,
    timeoutMs: 6000,
    headers: { "user-agent": "Mozilla/5.0" },
  });
  const res = r.chart.result?.[0];
  if (!res) return null;
  const puntos = (res.indicators.quote[0]?.close ?? []).filter((x): x is number => typeof x === "number" && x > 0);
  const previo = res.meta.chartPreviousClose ?? res.meta.previousClose;
  if (puntos.length < 2 || !previo || previo <= 0) return null;
  return { previo, puntos };
}
