import { z } from "zod";
import { traerJson } from "../http";

/**
 * Yahoo Finance (API de gráficos, sin autenticación): recorrido del día de un ETF de EE.UU. en velas de 5 minutos y,
 * más abajo, la historia diaria de una acción de EE.UU.
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

// ───────────────────────── Historia diaria ─────────────────────────

const serieNum = z.array(z.number().nullable()).optional();
const diarioSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          timestamp: z.array(z.number()).optional(),
          indicators: z.object({ quote: z.array(z.object({ open: serieNum, high: serieNum, low: serieNum, close: serieNum, volume: serieNum })) }),
        }),
      )
      .nullable(),
  }),
});

export type VelaYahoo = { fecha: string; apertura: number; maximo: number; minimo: number; cierre: number; volumen: number };

/**
 * Pasa la respuesta de Yahoo a velas diarias: descarta los días sin cierre y completa apertura, máximo y mínimo con el
 * cierre si faltan. Puro (se testea aparte).
 */
export function aVelas(timestamps: number[], q: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }): VelaYahoo[] {
  const salida: VelaYahoo[] = [];
  timestamps.forEach((t, i) => {
    const cierre = q.close?.[i];
    if (typeof cierre !== "number" || !(cierre > 0)) return;
    const num = (x: number | null | undefined) => (typeof x === "number" && x > 0 ? x : cierre);
    salida.push({ fecha: new Date(t * 1000).toISOString().slice(0, 10), apertura: num(q.open?.[i]), maximo: num(q.high?.[i]), minimo: num(q.low?.[i]), cierre, volumen: q.volume?.[i] ?? 0 });
  });
  // Un día puede venir repetido (la rueda en curso): queda el último.
  return [...new Map(salida.map((v) => [v.fecha, v])).values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Cierres diarios de los últimos 5 años de una acción de EE.UU. (en dólares, ajustados por splits). Sirve para los
 * CEDEARs cuya historia no publica data912 (verificado el 19/11/2026 con NBIS, BRK-B y otros). Caché de 6 horas.
 */
export async function historicoDiario(ticker: string): Promise<VelaYahoo[]> {
  const r = await traerJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=5y&interval=1d`, diarioSchema, {
    fuente: "yahoo",
    revalidate: 21_600,
    timeoutMs: 9000,
    headers: { "user-agent": "Mozilla/5.0" },
  });
  const res = r.chart.result?.[0];
  if (!res?.timestamp) return [];
  return aVelas(res.timestamp, res.indicators.quote[0] ?? {});
}
