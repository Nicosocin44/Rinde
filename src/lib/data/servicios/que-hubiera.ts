import { ajustarRatios, aPesos, hoyAR, sumarDias } from "@/lib/calculos";
import * as ad from "../adapters/argentinadatos";
import * as binance from "../adapters/binance";
import * as d912 from "../adapters/data912";
import { conRespaldo } from "../cache";
import { FUENTES } from "../types";
import { cargarHistorico } from "./dolar";
import { cargarMacro } from "./macro";

/** Serie compacta [fecha, valor] para mandar al navegador. */
export type SerieQH = [string, number][];

/** Los activos para elegir en "si comprabas…": los más conocidos de cada tipo, con historia en data912. */
export const ACTIVOS_QH = [
  { ticker: "SPY", nombre: "ETF S&P 500", clase: "cedears" },
  { ticker: "AAPL", nombre: "Apple", clase: "cedears" },
  { ticker: "NVDA", nombre: "Nvidia", clase: "cedears" },
  { ticker: "MELI", nombre: "Mercado Libre", clase: "cedears" },
  { ticker: "GGAL", nombre: "Grupo Galicia", clase: "stocks" },
  { ticker: "YPFD", nombre: "YPF", clase: "stocks" },
] as const;

export type DatosQH = {
  mep: SerieQH;
  blue: SerieQH;
  /** TNA de los depósitos a 30 días (fracción). */
  plazoFijo: SerieQH;
  /** IPC mensual (fracción) y expectativa del REM para proyectar el mes en curso. */
  ipc: SerieQH;
  remMensual: number | null;
  /** Precio en pesos de cada activo elegible. */
  activos: Record<string, SerieQH>;
  /** Bitcoin en pesos: Binance × dólar cripto de cada día (desde que hay dólar cripto, feb 2023). */
  bitcoin: SerieQH;
};

/** Diario el último año y medio, semanal antes: alcanza para períodos de 1 mes a 5 años y pesa poco. */
export function compactar(serie: { fecha: string; valor: number }[], hoy: string): SerieQH {
  const corte = sumarDias(hoy, -550);
  const desde = sumarDias(hoy, -(5 * 365 + 40));
  const salida: SerieQH = [];
  let semana = "";
  for (const p of [...serie].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    if (p.fecha < desde || !(p.valor > 0)) continue;
    if (p.fecha >= corte) {
      salida.push([p.fecha, p.valor]);
      continue;
    }
    const s = String(Math.floor(Date.parse(p.fecha) / (7 * 86_400_000)));
    if (s !== semana) salida.push([p.fecha, p.valor]);
    semana = s;
  }
  return salida;
}

async function historia(clase: "cedears" | "stocks", ticker: string) {
  try {
    const h = await d912.historico(clase, ticker);
    // Cambios de ratio y splits ajustados (SPY cambió de ratio en mayo de 2026; YPF tuvo un split de 10 en agosto).
    const serie = h.filter((p) => p.c > 0).map((p) => ({ fecha: p.date.slice(0, 10), cierre: p.c }));
    const a = ajustarRatios(serie);
    return serie.slice(a.desde).map((p, i) => ({ fecha: p.fecha, valor: p.cierre * a.factores[a.desde + i]! }));
  } catch {
    return [];
  }
}

/** Todo lo que necesita la calculadora "¿Qué hubiera pasado si…?". Cada serie que falla queda vacía (su opción no aparece). */
export async function cargarQueHubiera() {
  return conRespaldo<DatosQH>("que-hubiera", [FUENTES.argentinadatos, FUENTES.data912, FUENTES.binance], async () => {
    const hoy = hoyAR();
    const [dolar, pf, macro, cripto, velasBtc, ...series] = await Promise.all([
      cargarHistorico(),
      ad.depositos30Dias().catch(() => []),
      cargarMacro(),
      ad.historicoDolar("cripto").catch(() => []),
      binance.velasDiarias("BTC").catch(() => []),
      ...ACTIVOS_QH.map((a) => historia(a.clase, a.ticker)),
    ]);
    if (!dolar.ok) throw new Error("No pudimos traer la historia del dólar");
    const rem = macro.ok ? macro.data.rem : null;
    const proximos = rem?.mensual.slice(0, 6) ?? [];
    const btcArs = aPesos(
      velasBtc.map((v) => ({ fecha: v.fecha, cierre: v.cierre })),
      cripto.map((p) => ({ fecha: p.fecha.slice(0, 10), valor: p.venta })),
    );
    return {
      data: {
        mep: compactar(dolar.data.mep.map((p) => ({ fecha: p.fecha.slice(0, 10), valor: p.valor })), hoy),
        blue: compactar(dolar.data.blue.map((p) => ({ fecha: p.fecha.slice(0, 10), valor: p.valor })), hoy),
        plazoFijo: compactar(pf, hoy),
        ipc: macro.ok ? macro.data.inflacionMensual.filter((p) => p.fecha >= sumarDias(hoy, -(6 * 365))).map((p) => [p.fecha, p.valor] as [string, number]) : [],
        remMensual: proximos.length ? proximos.reduce((s, r) => s + r.valor, 0) / proximos.length : null,
        activos: Object.fromEntries(ACTIVOS_QH.map((a, i) => [a.ticker, compactar(series[i] ?? [], hoy)])),
        bitcoin: compactar(btcArs.map((p) => ({ fecha: p.fecha, valor: p.cierre })), hoy),
      },
      asOf: new Date().toISOString(),
      status: "close",
    };
  });
}
