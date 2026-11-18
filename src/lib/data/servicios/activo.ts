import { CEDEARS, ACCIONES_GENERAL, PANEL_LIDER } from "@data/ar/mercados";
import { DESCRIPCION_ETF, WIKIPEDIA } from "@data/ar/wikipedia";
import { cortarEnSalto, type Vela } from "@/lib/calculos";
import type { Noticia } from "@/lib/noticias";
import * as d912 from "../adapters/data912";
import * as wikipedia from "../adapters/wikipedia";
import { conRespaldo } from "../cache";
import { mercadoAbierto } from "../freshness";
import { FUENTES, type Accion, type Cedear, type PuntoSerie } from "../types";
import { cargarHistorico } from "./dolar";
import { cargarMercados } from "./mercados";
import { cargarNoticias } from "./noticias";

export type TipoActivo = "cedear" | "accion";

export type FichaActivo = {
  ticker: string;
  tipo: TipoActivo;
  nombre: string | null;
  sector: string | null;
  /** Solo acciones: panel líder (S&P Merval) o general. */
  panel: "líder" | "general" | null;
  /** Precio en pesos en BYMA (último operado) y variación del día. */
  precio: number | null;
  variacion: number | null;
  /** CEDEAR: precio en dólares implícito (con el MEP del propio CEDEAR) y dólares implícitos. */
  precioUsd: number | null;
  mepImplicito: number | null;
  cclImplicito: number | null;
  /** CEDEAR: la acción de origen en Estados Unidos (dólares). */
  subyacente: { precio: number; variacion: number | null } | null;
  /** Cierres diarios desde el último cambio de ratio (o split no ajustado). */
  velas: Vela[];
  /** true si la serie se cortó por un cambio de ratio. */
  serieCortada: boolean;
  /** MEP diario, para pasar la serie a dólares. */
  mep: PuntoSerie[];
  acerca: { texto: string; fuente: "wikipedia" | "propia"; url: string | null } | null;
  noticias: Noticia[];
  /** Otros del mismo sector (CEDEAR) o del mismo panel (acción), por volumen. */
  parecidos: { ticker: string; nombre: string | null; precio: number; variacion: number | null }[];
};

/** Normaliza el ticker de la URL: mayúsculas, solo letras, números y punto (BRK.B). */
export function normalizarTicker(t: string): string | null {
  const x = decodeURIComponent(t).trim().toUpperCase();
  return /^[A-Z0-9.]{1,10}$/.test(x) ? x : null;
}

/** ¿Es un activo que conocemos? (para no pedirle a data912 cualquier cosa que alguien escriba en la URL). */
async function ubicar(ticker: string, cedears: Cedear[], acciones: Accion[]): Promise<{ tipo: TipoActivo; cedear?: Cedear; accion?: Accion; precioPanel?: number | null; variacionPanel?: number | null } | null> {
  const cedear = cedears.find((c) => c.ticker === ticker);
  if (cedear) return { tipo: "cedear", cedear };
  const accion = acciones.find((a) => a.ticker === ticker);
  if (accion) return { tipo: "accion", accion };
  // Sin operaciones hoy no aparece en las listas: se busca en el panel completo.
  const [panelCedears, panelAcciones] = await Promise.all([d912.panel("arg_cedears").catch(() => []), d912.panel("arg_stocks").catch(() => [])]);
  const enCedears = panelCedears.find((p) => p.symbol === ticker);
  if (enCedears) return { tipo: "cedear", precioPanel: enCedears.c && enCedears.c > 0 ? enCedears.c : null, variacionPanel: enCedears.pct_change !== null ? enCedears.pct_change / 100 : null };
  const enAcciones = panelAcciones.find((p) => p.symbol === ticker);
  if (enAcciones) return { tipo: "accion", precioPanel: enAcciones.c && enAcciones.c > 0 ? enAcciones.c : null, variacionPanel: enAcciones.pct_change !== null ? enAcciones.pct_change / 100 : null };
  return null;
}

async function velasDe(tipo: TipoActivo, ticker: string): Promise<{ velas: Vela[]; cortada: boolean }> {
  try {
    const h = await d912.historico(tipo === "cedear" ? "cedears" : "stocks", ticker);
    const todas: Vela[] = h
      .filter((p) => p.c > 0)
      .map((p) => ({ fecha: p.date.slice(0, 10), apertura: p.o ?? p.c, maximo: p.h ?? p.c, minimo: p.l ?? p.c, cierre: p.c, volumen: p.v ?? 0 }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    const velas = cortarEnSalto(todas);
    return { velas, cortada: velas.length < todas.length };
  } catch {
    return { velas: [], cortada: false };
  }
}

async function acercaDe(ticker: string): Promise<FichaActivo["acerca"]> {
  if (DESCRIPCION_ETF[ticker]) return { texto: DESCRIPCION_ETF[ticker]!, fuente: "propia", url: null };
  const titulo = WIKIPEDIA[ticker];
  if (!titulo) return null;
  try {
    const r = await wikipedia.resumen(titulo);
    return r ? { texto: r.texto, fuente: "wikipedia", url: r.url } : null;
  } catch {
    return null;
  }
}

/**
 * Todo lo de un activo para su ficha: precio, serie histórica, datos del CEDEAR, descripción y noticias.
 * Si una parte falla (Wikipedia, noticias, la serie), la ficha se muestra igual sin esa parte.
 * null = no es un CEDEAR ni una acción que cotice en BYMA.
 */
export async function cargarActivo(ticker: string) {
  const mercados = await cargarMercados();
  const cedears = mercados.ok ? mercados.data.cedears : [];
  const acciones = mercados.ok ? mercados.data.acciones : [];
  const ubicado = await ubicar(ticker, cedears, acciones);
  if (!ubicado) return null;

  return conRespaldo<FichaActivo>(`activo:${ticker}`, [FUENTES.data912, FUENTES.argentinadatos, FUENTES.wikipedia], async () => {
    const [serie, historicoDolar, acerca, noticias, usa] = await Promise.all([
      velasDe(ubicado.tipo, ticker),
      cargarHistorico(),
      acercaDe(ticker),
      cargarNoticias(),
      ubicado.tipo === "cedear" ? d912.panel("usa_stocks").catch(() => []) : Promise.resolve([]),
    ]);
    const c = ubicado.cedear;
    const a = ubicado.accion;
    const enUsa = usa.find((p) => p.symbol === ticker);
    const meta = CEDEARS[ticker];
    const ultimo = serie.velas.at(-1);

    const parecidos =
      ubicado.tipo === "cedear"
        ? cedears.filter((x) => x.ticker !== ticker && meta && x.sector === meta.sector).map((x) => ({ ticker: x.ticker, nombre: x.nombre, precio: x.precioArs, variacion: x.variacion }))
        : acciones.filter((x) => x.ticker !== ticker && x.panel === (a?.panel ?? (PANEL_LIDER[ticker] ? "líder" : "general"))).map((x) => ({ ticker: x.ticker, nombre: x.nombre, precio: x.precio, variacion: x.variacion }));

    if (!c && !a && !ubicado.precioPanel && !ultimo) throw new Error("Sin precio ni serie para este activo");

    return {
      data: {
        ticker,
        tipo: ubicado.tipo,
        nombre: meta?.nombre ?? PANEL_LIDER[ticker] ?? ACCIONES_GENERAL[ticker] ?? null,
        sector: meta?.sector ?? null,
        panel: ubicado.tipo === "accion" ? (PANEL_LIDER[ticker] ? "líder" : "general") : null,
        precio: c?.precioArs ?? a?.precio ?? ubicado.precioPanel ?? ultimo?.cierre ?? null,
        variacion: c?.variacion ?? a?.variacion ?? ubicado.variacionPanel ?? null,
        precioUsd: c?.precioUsd ?? null,
        mepImplicito: c?.mepImplicito ?? null,
        cclImplicito: c?.cclImplicito ?? null,
        subyacente: enUsa && enUsa.c && enUsa.c > 0 ? { precio: enUsa.c, variacion: enUsa.pct_change !== null ? enUsa.pct_change / 100 : null } : null,
        velas: serie.velas,
        serieCortada: serie.cortada,
        mep: historicoDolar.ok ? historicoDolar.data.mep : [],
        acerca,
        noticias: noticias.ok ? noticias.data.noticias.filter((n) => n.tickers.includes(ticker)).slice(0, 8) : [],
        parecidos: parecidos.slice(0, 6),
      },
      asOf: new Date().toISOString(),
      status: mercadoAbierto() ? "delayed" : "close",
    };
  });
}
