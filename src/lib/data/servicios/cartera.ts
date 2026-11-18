import { z } from "zod";
import * as ad from "../adapters/argentinadatos";
import * as d912 from "../adapters/data912";
import { traerJson } from "../http";
import { revalidar } from "../freshness";
import { cargarCripto } from "./mercados";
import { cargarPesos } from "./pesos";
import { mejoresDelDia } from "@/lib/rankings/pesos";
import type { OpcionPesos } from "../types";

/**
 * Precios para valuar una cartera: actuales (con variación del día) e históricos semanales de los últimos
 * 2 años, más las series de referencia (MEP, IPC y tasa de plazo fijo a 30 días).
 */
export type PreciosCartera = {
  actuales: Record<string, { precio: number; variacion: number | null }>;
  historicos: Record<string, [string, number][]>;
  mep: [string, number][];
  /** IPC mensual en fracción, con la fecha de fin de mes. */
  ipc: [string, number][];
  /** TNA promedio de depósitos a 30 días (fracción), BCRA. */
  pf30: [string, number][];
  mejores: { liquida: OpcionPesos | null; a30: OpcionPesos | null; lecaps: OpcionPesos[] };
  asOf: string;
};

const binanceSchema = z.array(z.tuple([z.number(), z.string(), z.string(), z.string(), z.string()]).rest(z.unknown()));

const hace2Anios = () => new Date(Date.now() - 730 * 86_400_000).toISOString().slice(0, 10);

/** Una muestra por semana (el último dato de cada semana) desde hace 2 años, más el último. */
function semanal(serie: [string, number][]): [string, number][] {
  const desde = hace2Anios();
  const filtrada = serie.filter(([f, v]) => f >= desde && Number.isFinite(v) && v > 0);
  const porSemana = new Map<string, [string, number]>();
  for (const p of filtrada) {
    const t = Date.parse(p[0]);
    porSemana.set(String(Math.floor(t / (7 * 86_400_000))), p);
  }
  return [...porSemana.values()];
}

/**
 * Corta la serie en el último salto de más de 55 % en un día (cambio de ratio de un CEDEAR o split no ajustado):
 * antes del salto los precios no son comparables con los de hoy.
 */
function sinSaltos(serie: [string, number][]): [string, number][] {
  for (let i = serie.length - 1; i > 0; i--) {
    const r = serie[i]![1] / serie[i - 1]![1];
    if (r > 1.55 || r < 0.45) return serie.slice(i);
  }
  return serie;
}

async function historico912(clase: "stocks" | "cedears" | "bonds", ticker: string): Promise<[string, number][]> {
  try {
    const h = await d912.historico(clase, ticker);
    return semanal(sinSaltos(h.map((p) => [p.date, p.c])));
  } catch {
    return [];
  }
}

async function historicoBinance(simbolo: "BTC" | "ETH"): Promise<[string, number][]> {
  try {
    const k = await traerJson(`https://api.binance.com/api/v3/klines?symbol=${simbolo}USDT&interval=1w&limit=110`, binanceSchema, { fuente: "Binance", revalidate: revalidar("historico"), timeoutMs: 8000 });
    return k.map((r) => [new Date(r[0]).toISOString().slice(0, 10), Number(r[4])]);
  } catch {
    return [];
  }
}

export async function cargarPreciosCartera(ids: string[]): Promise<PreciosCartera> {
  const unicos = [...new Set(ids)].slice(0, 60);
  const porTipo = (t: string) => unicos.filter((i) => i.startsWith(`${t}:`)).map((i) => i.slice(t.length + 1));
  const [cedears, stocks, bonos, notas, corp, cripto, mepH, ipc, pf, pesos] = await Promise.all([
    porTipo("cedear").length ? d912.panel("arg_cedears").catch(() => []) : [],
    porTipo("accion").length ? d912.panel("arg_stocks").catch(() => []) : [],
    porTipo("bono").length || porTipo("lecap").length ? d912.panel("arg_bonds").catch(() => []) : [],
    porTipo("lecap").length ? d912.panel("arg_notes").catch(() => []) : [],
    porTipo("on").length ? d912.panel("arg_corp").catch(() => []) : [],
    porTipo("cripto").length ? cargarCripto() : null,
    ad.historicoDolar("bolsa").catch(() => []),
    ad.inflacionMensual().catch(() => []),
    // Ya normalizada: la fuente mezcla fracción y porcentaje (dividir todo por 100 dejaba días de 2024 en 0,3 %).
    ad.depositos30Dias().catch(() => []),
    cargarPesos(),
  ]);

  const actuales: PreciosCartera["actuales"] = {};
  const historicos: PreciosCartera["historicos"] = {};
  const buscar = (panel: { symbol: string; c: number | null; pct_change: number | null }[], s: string) => panel.find((p) => p.symbol === s);
  const registrar = (id: string, p: { c: number | null; pct_change: number | null } | undefined) => {
    if (p?.c && p.c > 0) actuales[id] = { precio: p.c, variacion: p.pct_change !== null ? p.pct_change / 100 : null };
  };

  const tareas: Promise<void>[] = [];
  for (const t of porTipo("cedear")) {
    registrar(`cedear:${t}`, buscar(cedears, t));
    tareas.push(historico912("cedears", t).then((h) => void (historicos[`cedear:${t}`] = h)));
  }
  for (const t of porTipo("accion")) {
    registrar(`accion:${t}`, buscar(stocks, t));
    tareas.push(historico912("stocks", t).then((h) => void (historicos[`accion:${t}`] = h)));
  }
  for (const t of porTipo("bono")) {
    registrar(`bono:${t}`, buscar(bonos, `${t}D`));
    tareas.push(historico912("bonds", `${t}D`).then((h) => void (historicos[`bono:${t}`] = h)));
  }
  for (const t of porTipo("on")) {
    registrar(`on:${t}`, buscar(corp, `${t}D`));
    tareas.push(historico912("bonds", `${t}D`).then((h) => void (historicos[`on:${t}`] = h)));
  }
  for (const t of porTipo("lecap")) registrar(`lecap:${t}`, buscar(notas, t) ?? buscar(bonos, t));
  for (const t of porTipo("cripto")) {
    const c = cripto?.ok ? cripto.data.find((x) => x.simbolo === t) : null;
    if (t === "USDT" || t === "USDC") actuales[`cripto:${t}`] = { precio: 1, variacion: 0 };
    else if (c?.precioUsd) actuales[`cripto:${t}`] = { precio: c.precioUsd, variacion: null };
    if (t === "BTC" || t === "ETH") tareas.push(historicoBinance(t).then((h) => void (historicos[`cripto:${t}`] = h)));
  }
  await Promise.all(tareas);

  const opciones = pesos.ok ? pesos.data.opciones : [];
  const { liquida, a30 } = mejoresDelDia(opciones);
  return {
    actuales,
    historicos,
    mep: semanal(mepH.map((p) => [p.fecha, p.venta])),
    ipc: ipc.filter((p) => p.fecha >= "2020-01-01").map((p) => [p.fecha, p.valor / 100]),
    pf30: semanal(pf.map((p) => [p.fecha, p.valor])),
    mejores: { liquida, a30, lecaps: opciones.filter((o) => o.tipo === "lecap") },
    asOf: new Date().toISOString(),
  };
}
