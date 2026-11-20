import { bonoPorTicker } from "@data/ar/bonos-usd";
import { ACCIONES_GENERAL, CEDEARS, PANEL_LIDER } from "@data/ar/mercados";
import { TICKER_EEUU_DE_CEDEAR } from "@data/ar/sec";
import { cronograma, hoyAR, valuar } from "@/lib/calculos";
import { conPagosReinvertidos } from "@/lib/calculos/comparar";
import * as binance from "../adapters/binance";
import * as d912 from "../adapters/data912";
import * as yahoo from "../adapters/yahoo";
import { velasDe, normalizarTicker } from "./activo";
import { cargarBalances } from "./balances";
import { cargarHistorico } from "./dolar";
import { claseDeFicha, velas912 } from "./fichas";
import { cargarMercados } from "./mercados";
import { compactar, type SerieQH } from "./que-hubiera";

/** Cuántos activos se pueden comparar a la vez (más de 5 líneas no se leen). */
export const MAXIMO_COMPARAR = 5;

export type ClaseComparable = "cedear" | "accion" | "bono" | "cripto";

export type ActivoComparable = {
  ticker: string;
  nombre: string;
  clase: ClaseComparable;
  sector: string | null;
  /** Moneda de la serie: los CEDEARs y acciones cotizan en pesos; los bonos (especie D) y la cripto, en dólares. */
  moneda: "ARS" | "USD";
  /** [fecha, precio]: diario el último año y medio, semanal antes (hasta 5 años). En los bonos, con los pagos reinvertidos. */
  serie: SerieQH;
  /** CEDEAR sin historia en data912: la serie es la de la acción en EE.UU., en dólares (Yahoo). */
  historiaEeuu: boolean;
};

export type Comparacion = {
  activos: ActivoComparable[];
  /** Tickers que no se pudieron comparar (no existen, no tienen historia o son letras). */
  sinDatos: string[];
  /** Dólar MEP diario, para pasar todo a una misma moneda. */
  mep: SerieQH;
  asOf: string;
};

/** La lista de la URL (?t=AAPL,MELI): tickers válidos, sin repetir, hasta 5. */
export function listaDeTickers(t: string | string[] | undefined): string[] {
  const crudo = (Array.isArray(t) ? t.join(",") : (t ?? "")).split(",");
  const salida: string[] = [];
  for (const x of crudo) {
    const n = x.trim() ? normalizarTicker(x) : null;
    if (n && !salida.includes(n)) salida.push(n);
  }
  return salida.slice(0, MAXIMO_COMPARAR);
}

const NOMBRES_CRIPTO = { BTC: "Bitcoin", ETH: "Ether" } as const;

async function activoComparable(ticker: string, hoy: string): Promise<ActivoComparable | null> {
  const base = { ticker, historiaEeuu: false, sector: null as string | null };
  if (ticker === "BTC" || ticker === "ETH") {
    const v = await binance.velasDiarias(ticker).catch(() => []);
    return v.length > 1 ? { ...base, nombre: NOMBRES_CRIPTO[ticker], clase: "cripto", moneda: "USD", serie: compactar(v.map((x) => ({ fecha: x.fecha, valor: x.cierre })), hoy) } : null;
  }
  const clase = claseDeFicha(ticker);
  if (clase === "cripto" || clase === "lecap") return null; // stablecoins y letras: no tienen una historia que comparar
  if (clase === "bono") {
    const def = bonoPorTicker.get(ticker);
    const v = await velas912("bonds", `${ticker}D`);
    if (!def || v.length < 2) return null;
    // Rendimiento total: los cupones y amortizaciones cobrados se reinvierten (si no, cada pago parece una caída del ~8 %).
    const pagos = cronograma(def).map((f) => ({ fecha: f.fecha, monto: f.cupon.plus(f.amortizacion).toNumber() }));
    const total = conPagosReinvertidos(
      v.map((x): [string, number] => [x.fecha, x.cierre]),
      pagos,
    );
    return { ...base, nombre: def.nombre, clase: "bono", moneda: "USD", serie: compactar(total.map(([fecha, valor]) => ({ fecha, valor })), hoy) };
  }
  const mercados = await cargarMercados();
  const cedear = mercados.ok ? mercados.data.cedears.find((c) => c.ticker === ticker) : undefined;
  const accion = mercados.ok ? mercados.data.acciones.find((a) => a.ticker === ticker) : undefined;
  if (!cedear && !accion) return null;
  const tipo = cedear ? "cedear" : "accion";
  const nombre = CEDEARS[ticker]?.nombre ?? PANEL_LIDER[ticker] ?? ACCIONES_GENERAL[ticker] ?? cedear?.nombre ?? accion?.nombre ?? ticker;
  const sector = CEDEARS[ticker]?.sector ?? null;
  const { velas } = await velasDe(tipo, ticker);
  if (velas.length > 1) return { ...base, sector, nombre, clase: tipo, moneda: "ARS", serie: compactar(velas.map((x) => ({ fecha: x.fecha, valor: x.cierre })), hoy) };
  if (tipo !== "cedear") return null;
  // CEDEAR nuevo, sin historia en data912: la de la acción en EE.UU.
  const eeuu = await yahoo.historicoDiario(TICKER_EEUU_DE_CEDEAR[ticker] ?? ticker).catch(() => []);
  return eeuu.length > 1 ? { ...base, sector, nombre, clase: "cedear", moneda: "USD", historiaEeuu: true, serie: compactar(eeuu.map((x) => ({ fecha: x.fecha, valor: x.cierre })), hoy) } : null;
}

/** Las series de los activos a comparar y el MEP. Cada activo que falla queda en `sinDatos`: el resto se compara igual. */
export async function cargarComparacion(tickers: string[]): Promise<Comparacion> {
  const hoy = hoyAR();
  const [dolar, ...activos] = await Promise.all([cargarHistorico(), ...tickers.map((t) => activoComparable(t, hoy).catch(() => null))]);
  return {
    activos: activos.filter((a): a is ActivoComparable => a !== null),
    sinDatos: tickers.filter((_, i) => !activos[i]),
    mep: dolar.ok ? compactar(dolar.data.mep.map((p) => ({ fecha: p.fecha.slice(0, 10), valor: p.valor })), hoy) : [],
    asOf: new Date().toISOString(),
  };
}

export type NumerosEmpresa = {
  ticker: string;
  per: number | null;
  margenNeto: number | null;
  roe: number | null;
  crecimientoIngresos: number | null;
  rendimientoDividendo: number | null;
  /** Fecha del balance más reciente del que salen los números. */
  balanceAl: string | null;
};

/**
 * Los números de la empresa de cada CEDEAR o acción (de sus balances: CNV o SEC). El PER y el dividendo solo para
 * empresas de EE.UU. con balances en dólares, como en la ficha. null si no es una empresa o no hay balances.
 */
export async function numerosDeEmpresas(activos: { ticker: string; clase: ClaseComparable; sector: string | null }[]): Promise<(NumerosEmpresa | null)[]> {
  const empresas = activos.filter((a) => (a.clase === "cedear" || a.clase === "accion") && a.sector !== "ETF");
  const usa = empresas.some((a) => a.clase === "cedear") ? await d912.panel("usa_stocks").catch(() => []) : [];
  return Promise.all(
    activos.map(async (a) => {
      if (!empresas.includes(a)) return null;
      const r = await cargarBalances(a.ticker, a.clase as "cedear" | "accion", a.sector);
      const b = r.ok ? r.data.resumen : null;
      if (!b) return null;
      const precio = a.clase === "cedear" ? usa.find((p) => p.symbol === (TICKER_EEUU_DE_CEDEAR[a.ticker] ?? a.ticker))?.c : null;
      const v = b.moneda === "USD" && b.formularioAnual.startsWith("10-K") && precio ? valuar(b, precio) : null;
      return {
        ticker: a.ticker,
        per: v?.per ?? null,
        margenNeto: b.indicadores.margenNeto,
        roe: b.indicadores.roe,
        crecimientoIngresos: b.indicadores.crecimientoIngresos,
        rendimientoDividendo: v?.rendimientoDividendo ?? null,
        balanceAl: b.ultimo.fin,
      };
    }),
  );
}
