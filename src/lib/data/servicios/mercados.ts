import { pais } from "@/config/countries/ar";
import { bonoPorTicker, BONOS_USD } from "@data/ar/bonos-usd";
import { ACCIONES_GENERAL, CEDEARS, PANEL_LIDER } from "@data/ar/mercados";
import { resolverProveedor } from "@data/ar/proveedores";
import { cronograma, fechaLiquidacion, hoyAR, metricasBono, spread } from "@/lib/calculos";
import * as criptoya from "../adapters/criptoya";
import * as d912 from "../adapters/data912";
import { conRespaldo } from "../cache";
import { mercadoAbierto } from "../freshness";
import { FUENTES, type Accion, type BonoUsd, type Cedear, type Cripto, type Excluido, type ObligacionNegociable } from "../types";
import { enBanda, mediana } from "../validacion";
import { cargarFeriados } from "./feriados";
import type { z } from "zod";
import type { d912MepSchema, d912PanelSchema } from "../schemas";

type Panel = z.infer<typeof d912PanelSchema>;

const estadoData912 = (): "delayed" | "close" => (mercadoAbierto() ? "delayed" : "close");
const precio = (p: Panel[number] | undefined) => (p && p.c && p.c > 0 ? p.c : null);

// ───────────────────────── Bonos soberanos ─────────────────────────

/**
 * TIR, duration y paridad de los soberanos USD. Precio: especie D (dólar MEP), por 100 VN original.
 * BYMA cotiza los bonos con el cupón corrido incluido (precio sucio), así que lo usamos tal cual.
 */
export function normalizarBonos(panel: Panel, liquidacion: string): { bonos: BonoUsd[]; excluidos: Excluido[] } {
  const porSimbolo = new Map(panel.map((p) => [p.symbol, p]));
  const bonos: BonoUsd[] = [];
  const excluidos: Excluido[] = [];
  for (const def of BONOS_USD) {
    const d = porSimbolo.get(`${def.ticker}D`);
    const ars = porSimbolo.get(def.ticker);
    const precioUsd = precio(d);
    if (!precioUsd) {
      excluidos.push({ id: def.ticker, reason: "Sin precio en dólares" });
      continue;
    }
    const m = metricasBono(def, precioUsd, liquidacion);
    if (!m || !enBanda(m.tir.toNumber(), pais.bandas.tirBonoUsd)) {
      excluidos.push({ id: def.ticker, reason: "TIR fuera del rango plausible" });
      continue;
    }
    const flujo = m.proximoPago;
    const cupon = cronograma(def).find((f) => f.fecha === flujo?.fecha);
    const residual = m.residual.toNumber();
    bonos.push({
      ticker: def.ticker,
      nombre: def.nombre,
      ley: def.ley,
      vencimiento: def.vencimiento,
      precioUsd,
      precioArs: precio(ars),
      variacion: d?.pct_change !== null && d?.pct_change !== undefined ? d.pct_change / 100 : null,
      tir: m.tir.toNumber(),
      duration: m.duration.toNumber(),
      paridad: m.paridad.toNumber(),
      cuponActual: cupon && residual > 0 ? (cupon.cupon.toNumber() * def.frecuencia) / cupon.residualAntes.toNumber() : 0,
      residual,
      proximoPago: flujo ? { fecha: flujo.fecha, monto: flujo.cupon.plus(flujo.amortizacion).toNumber() } : null,
      volumen: d?.v ?? 0,
    });
  }
  return { bonos: bonos.sort((a, b) => a.duration - b.duration), excluidos };
}

export function normalizarOns(panel: Panel): ObligacionNegociable[] {
  // Las ONs en dólares MEP terminan en D. Nos quedamos con las que operaron hoy.
  const porSimbolo = new Map(panel.map((p) => [p.symbol, p]));
  return panel
    .filter((p) => p.symbol.endsWith("D") && (p.v ?? 0) > 0 && precio(p))
    .map((p) => {
      const base = p.symbol.slice(0, -1);
      const ars = porSimbolo.get(`${base}O`) ?? porSimbolo.get(base);
      return {
        ticker: base,
        emisor: null,
        precioUsd: precio(p),
        precioArs: precio(ars),
        variacion: p.pct_change !== null ? p.pct_change / 100 : null,
        volumen: p.v ?? 0,
        operaciones: p.q_op ?? 0,
      };
    })
    .filter((o) => o.precioUsd !== null && o.precioUsd > 20 && o.precioUsd < 200)
    .sort((a, b) => b.volumen - a.volumen);
}

export async function cargarBonos() {
  return conRespaldo<{ bonos: BonoUsd[]; ons: ObligacionNegociable[]; liquidacion: string }>("bonos", [FUENTES.data912], async () => {
    const feriados = await cargarFeriados();
    const liquidacion = fechaLiquidacion(hoyAR(), "24hs", feriados);
    const [bonos, corp] = await Promise.all([d912.panel("arg_bonds"), d912.panel("arg_corp").catch(() => [] as Panel)]);
    const { bonos: lista, excluidos } = normalizarBonos(bonos, liquidacion);
    if (lista.length === 0) throw new Error("Sin bonos válidos");
    return { data: { bonos: lista, ons: normalizarOns(corp).slice(0, 60), liquidacion }, asOf: new Date().toISOString(), status: estadoData912(), excluded: excluidos };
  });
}

export { bonoPorTicker };

// ───────────────────────── CEDEARs y acciones ─────────────────────────

type Mep = z.infer<typeof d912MepSchema>;

/** true si el símbolo es la especie en dólares (D) o cable (C) de otro que también está en el panel: AAPLD, YPFDD, BMA.D. */
function esEspecieDerivada(simbolo: string, todos: ReadonlySet<string>): boolean {
  if (simbolo.endsWith(".D")) return todos.has(simbolo.slice(0, -2));
  return /[DC]$/.test(simbolo) && todos.has(simbolo.slice(0, -1));
}

export function normalizarCedears(panel: Panel, mep: Mep, ccl: Map<string, number>): Cedear[] {
  const mepPorTicker = new Map(mep.filter((m) => m.panel === "cedear").map((m) => [m.ticker, m]));
  const todos = new Set(panel.map((p) => p.symbol));
  return panel
    .filter((p) => precio(p) && (p.v ?? 0) > 0 && !esEspecieDerivada(p.symbol, todos))
    .map((p) => {
      const m = mepPorTicker.get(p.symbol);
      const meta = CEDEARS[p.symbol];
      const usd = m?.usd_bid && m.usd_ask ? (m.usd_bid + m.usd_ask) / 2 : null;
      return {
        ticker: p.symbol,
        nombre: meta?.nombre ?? null,
        sector: meta?.sector ?? null,
        precioArs: precio(p)!,
        precioUsd: usd,
        variacion: p.pct_change !== null ? p.pct_change / 100 : null,
        mepImplicito: m?.mark ?? null,
        cclImplicito: ccl.get(p.symbol) ?? null,
        volumenArs: (p.v ?? 0) * (precio(p) ?? 0),
      };
    })
    .sort((a, b) => b.volumenArs - a.volumenArs);
}

export function normalizarAcciones(panel: Panel): Accion[] {
  const todos = new Set(panel.map((p) => p.symbol));
  return panel
    .filter((p) => precio(p) && !esEspecieDerivada(p.symbol, todos))
    .map((p) => ({
      ticker: p.symbol,
      nombre: PANEL_LIDER[p.symbol] ?? ACCIONES_GENERAL[p.symbol] ?? null,
      panel: PANEL_LIDER[p.symbol] ? ("líder" as const) : ("general" as const),
      precio: precio(p)!,
      variacion: p.pct_change !== null ? p.pct_change / 100 : null,
      volumen: (p.v ?? 0) * (precio(p) ?? 0),
    }))
    .sort((a, b) => (a.panel === b.panel ? b.volumen - a.volumen : a.panel === "líder" ? -1 : 1));
}

export async function cargarMercados() {
  return conRespaldo<{ cedears: Cedear[]; acciones: Accion[]; mepPromedio: number | null }>("mercados", [FUENTES.data912], async () => {
    const [cedears, mep, ccl, acciones] = await Promise.all([
      d912.panel("arg_cedears"),
      d912.mepImplicitos().catch(() => [] as Mep),
      d912.cclImplicitos().catch(() => []),
      d912.panel("arg_stocks"),
    ]);
    const cclMapa = new Map(ccl.filter((c) => c.CCL_mark && c.CCL_mark > 0).map((c) => [c.ticker_ar, c.CCL_mark!]));
    const lista = normalizarCedears(cedears, mep, cclMapa);
    const meps = lista.slice(0, 30).map((c) => c.mepImplicito).filter((x): x is number => x !== null && x > 0);
    return {
      data: { cedears: lista, acciones: normalizarAcciones(acciones), mepPromedio: meps.length ? mediana(meps) : null },
      asOf: new Date().toISOString(),
      status: estadoData912(),
    };
  });
}

// ───────────────────────── Cripto ─────────────────────────

const CRIPTOS = [
  { simbolo: "BTC", nombre: "Bitcoin", id: "btc" },
  { simbolo: "ETH", nombre: "Ether", id: "eth" },
  { simbolo: "USDT", nombre: "Tether (USDT)", id: "usdt" },
  { simbolo: "USDC", nombre: "USD Coin (USDC)", id: "usdc" },
] as const;

export async function cargarCripto() {
  return conRespaldo<Cripto[]>("cripto", [FUENTES.criptoya], async () => {
    const ahora = Date.now() / 1000;
    const resultados = await Promise.all(
      CRIPTOS.map(async (c) => {
        const [ars, usd] = await Promise.all([criptoya.exchanges(c.id, "ars"), c.id === "btc" || c.id === "eth" ? criptoya.exchanges(c.id, "usd").catch(() => null) : null]);
        const exchanges = Object.entries(ars)
          .filter(([id, p]) => p.totalAsk > 0 && p.totalBid > 0 && ahora - p.time < pais.frescura.criptoMaxMin * 60 && !id.endsWith("p2p"))
          .map(([id, p]) => ({ id, nombre: resolverProveedor(id).nombre, compras: p.totalAsk, vendes: p.totalBid, spread: spread(p.totalAsk, p.totalBid).toNumber(), asOf: new Date(p.time * 1000).toISOString() }));
        const med = mediana(exchanges.map((e) => e.compras));
        const sanos = exchanges.filter((e) => Math.abs(e.compras / med - 1) < 0.1).sort((a, b) => a.compras - b.compras);
        const usdMed = usd ? mediana(Object.values(usd).filter((p) => p.ask > 0 && ahora - p.time < 7200).map((p) => (p.ask + p.bid) / 2)) : null;
        return {
          simbolo: c.simbolo,
          nombre: c.nombre,
          precioArs: mediana(sanos.map((e) => (e.compras + e.vendes) / 2)),
          precioUsd: usdMed && Number.isFinite(usdMed) ? usdMed : c.id === "usdt" || c.id === "usdc" ? 1 : null,
          exchanges: sanos,
        } satisfies Cripto;
      }),
    );
    return { data: resultados, asOf: new Date().toISOString(), status: "live" };
  });
}
