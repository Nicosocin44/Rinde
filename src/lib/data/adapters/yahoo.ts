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
          meta: z.object({ chartPreviousClose: z.number().optional(), previousClose: z.number().optional(), regularMarketPrice: z.number().optional(), regularMarketTime: z.number().optional() }),
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

// ───────────────────────── Última rueda de un índice argentino ─────────────────────────

export type RuedaDelDia = RecorridoDelDia & {
  /** Último valor de la rueda. */
  ultimo: number;
  /** Variación contra el cierre de la rueda anterior (fracción). */
  variacion: number;
  /** Hora del último dato (ISO). */
  hora: string;
};

/**
 * La última rueda de un índice de BYMA en la serie de 5 minutos de Yahoo, que trae todo el día de Nueva York:
 * - Cuenta como rueda un día hábil con al menos dos datos distintos entre `abre` y `cierra` (Yahoo también publica
 *   puntos los fines de semana y feriados, todos con el último cierre: se descartan).
 * - El cierre oficial de cada día se publica un rato después de la rueda (queda quieto hasta el día siguiente): es el
 *   último dato del día, no el de las 17 h.
 * - La base es el cierre oficial de la rueda anterior. Puro (se testea aparte).
 */
export function ultimaRueda(timestamps: number[], cierres: (number | null)[], { abre, cierra, utcOffset }: { abre: number; cierra: number; utcOffset: number }): RuedaDelDia | null {
  type Punto = { t: number; v: number };
  const porDia = new Map<string, { rueda: Punto[]; ultimo: Punto }>();
  timestamps.forEach((t, i) => {
    const v = cierres[i];
    if (typeof v !== "number" || !(v > 0)) return;
    const local = new Date((t + utcOffset * 3600) * 1000);
    const hora = local.getUTCHours() + local.getUTCMinutes() / 60;
    const dia = local.toISOString().slice(0, 10);
    const d = porDia.get(dia) ?? { rueda: [], ultimo: { t, v } };
    if (t >= d.ultimo.t) d.ultimo = { t, v };
    if (hora >= abre && hora <= cierra) d.rueda.push({ t, v });
    porDia.set(dia, d);
  });
  const habil = (dia: string) => ![0, 6].includes(new Date(`${dia}T12:00:00Z`).getUTCDay());
  const dias = [...porDia.keys()].sort().filter((dia) => {
    const r = porDia.get(dia)!.rueda;
    return habil(dia) && r.length >= 2 && new Set(r.map((p) => p.v)).size >= 2;
  });
  if (dias.length < 2) return null;
  const hoy = porDia.get(dias.at(-1)!)!;
  const previo = porDia.get(dias.at(-2)!)!.ultimo.v;
  const puntos = hoy.rueda.map((p) => p.v);
  // Si el cierre oficial llegó después de la rueda, la línea termina en él.
  if (hoy.ultimo.t > hoy.rueda.at(-1)!.t && hoy.ultimo.v !== puntos.at(-1)) puntos.push(hoy.ultimo.v);
  return { previo, puntos, ultimo: hoy.ultimo.v, variacion: hoy.ultimo.v / previo - 1, hora: new Date(hoy.ultimo.t * 1000).toISOString() };
}

/**
 * Última rueda de un índice de BYMA (el MSCI Merval: ^768692-ARS-STRD en pesos, ^768692-USD-STRD en dólares).
 * Verificado el 20/11/2026: dato minuto a minuto, en línea con BYMA. Caché de 15 segundos.
 */
export async function ruedaIndiceAr(simbolo: string, rueda: { abre: number; cierra: number; utcOffset: number }): Promise<RuedaDelDia | null> {
  const r = await traerJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(simbolo)}?range=5d&interval=5m`, graficoSchema, {
    fuente: "yahoo",
    revalidate: 15,
    timeoutMs: 6000,
    headers: { "user-agent": "Mozilla/5.0" },
  });
  const res = r.chart.result?.[0];
  if (!res?.timestamp) return null;
  const salida = ultimaRueda(res.timestamp, res.indicators.quote[0]?.close ?? [], rueda);
  // Durante la rueda, el último punto de 5 minutos puede tener hasta 5 minutos: el precio de `meta` es el del momento.
  // Solo si es del mismo día que la rueda (un domingo, `meta` trae el cierre del viernes con la hora del domingo).
  const ahora = res.meta.regularMarketPrice;
  const horaAhora = res.meta.regularMarketTime;
  const diaAr = (ms: number) => new Date(ms + rueda.utcOffset * 3600_000).toISOString().slice(0, 10);
  if (salida && ahora && ahora > 0 && horaAhora && horaAhora * 1000 > new Date(salida.hora).getTime() && diaAr(horaAhora * 1000) === diaAr(new Date(salida.hora).getTime())) {
    return { ...salida, ultimo: ahora, variacion: ahora / salida.previo - 1, puntos: [...salida.puntos.slice(0, -1), ahora], hora: new Date(horaAhora * 1000).toISOString() };
  }
  return salida;
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
