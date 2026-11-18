import { CEDEARS, ACCIONES_GENERAL, PANEL_LIDER } from "@data/ar/mercados";
import { DESCRIPCION_ETF, WIKIPEDIA } from "@data/ar/wikipedia";
import { cortarEnSalto, type Vela } from "@/lib/calculos";
import { describirEmpresa, menciona, nombreParaBuscar } from "@/lib/activos/perfil";
import type { Noticia } from "@/lib/noticias";
import * as d912 from "../adapters/data912";
import * as wikidata from "../adapters/wikidata";
import type { PerfilEmpresa } from "../adapters/wikidata";
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
  subyacente: { precio: number; variacion: number | null; volumen: number | null } | null;
  /** Las puntas y el movimiento del día en BYMA (data912). */
  hoy: { compra: number | null; venta: number | null; operaciones: number | null; nominales: number | null } | null;
  /** Perfil de la empresa (Wikidata): país, sede, fundación, empleados, web, industria. null si no lo encontramos. */
  perfil: PerfilEmpresa | null;
  /** Si los parecidos son del mismo sector o, si no lo conocemos, los más operados. */
  parecidosPor: "sector" | "panel" | "volumen";
  /** Cierres diarios desde el último cambio de ratio (o split no ajustado). */
  velas: Vela[];
  /** true si la serie se cortó por un cambio de ratio. */
  serieCortada: boolean;
  /** MEP diario, para pasar la serie a dólares. */
  mep: PuntoSerie[];
  acerca: { texto: string; fuente: "wikipedia" | "wikidata" | "propia"; url: string | null; enIngles?: boolean } | null;
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

/**
 * Descripción del activo, en este orden: la nuestra (ETF), el artículo de Wikipedia verificado a mano, el artículo en
 * castellano que Wikidata asocia a la empresa del ticker y, si no hay, una línea armada con su perfil de Wikidata.
 */
async function acercaDe(ticker: string, perfil: PerfilEmpresa | null): Promise<FichaActivo["acerca"]> {
  if (DESCRIPCION_ETF[ticker]) return { texto: DESCRIPCION_ETF[ticker]!, fuente: "propia", url: null };
  const titulo = WIKIPEDIA[ticker] ?? (perfil?.wikipediaEs ? decodeURIComponent(perfil.wikipediaEs.split("/wiki/").pop() ?? "") : null);
  if (titulo) {
    try {
      const r = await wikipedia.resumen(titulo);
      if (r) return { texto: r.texto, fuente: "wikipedia", url: r.url };
    } catch {
      // Sigue con el perfil.
    }
  }
  if (!perfil) return null;
  return { texto: describirEmpresa(perfil), fuente: "wikidata", url: perfil.wikipediaEn ?? `https://www.wikidata.org/wiki/${perfil.id}`, enIngles: !!perfil.wikipediaEn };
}

async function perfilDe(ticker: string): Promise<PerfilEmpresa | null> {
  try {
    return await wikidata.perfil(ticker);
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

  return conRespaldo<FichaActivo>(`activo:${ticker}`, [FUENTES.data912, FUENTES.argentinadatos, FUENTES.wikipedia, FUENTES.wikidata], async () => {
    const perfil = await perfilDe(ticker);
    const [serie, historicoDolar, acerca, noticias, usa, panelHoy] = await Promise.all([
      velasDe(ubicado.tipo, ticker),
      cargarHistorico(),
      acercaDe(ticker, perfil),
      cargarNoticias(),
      ubicado.tipo === "cedear" ? d912.panel("usa_stocks").catch(() => []) : Promise.resolve([]),
      d912.panel(ubicado.tipo === "cedear" ? "arg_cedears" : "arg_stocks").catch(() => []),
    ]);
    const c = ubicado.cedear;
    const a = ubicado.accion;
    const enUsa = usa.find((p) => p.symbol === ticker);
    const meta = CEDEARS[ticker];
    const ultimo = serie.velas.at(-1);
    const nombre = meta?.nombre ?? PANEL_LIDER[ticker] ?? ACCIONES_GENERAL[ticker] ?? perfil?.nombre ?? null;
    const fila = panelHoy.find((p) => p.symbol === ticker);

    // Parecidos: del mismo sector (CEDEAR curado) o panel (acción); si no conocemos el sector, los CEDEARs más operados.
    const parecidosPor: FichaActivo["parecidosPor"] = ubicado.tipo === "accion" ? "panel" : meta ? "sector" : "volumen";
    const parecidos =
      parecidosPor === "sector"
        ? cedears.filter((x) => x.ticker !== ticker && x.sector === meta!.sector).map((x) => ({ ticker: x.ticker, nombre: x.nombre, precio: x.precioArs, variacion: x.variacion }))
        : parecidosPor === "volumen"
          ? cedears.filter((x) => x.ticker !== ticker).map((x) => ({ ticker: x.ticker, nombre: x.nombre, precio: x.precioArs, variacion: x.variacion }))
          : acciones.filter((x) => x.ticker !== ticker && x.panel === (a?.panel ?? (PANEL_LIDER[ticker] ? "líder" : "general"))).map((x) => ({ ticker: x.ticker, nombre: x.nombre, precio: x.precio, variacion: x.variacion }));

    // Noticias: las que el clasificador ya asoció al ticker, más las que nombran a la empresa (sirve para las que no
    // están en nuestras listas, como Nebius).
    const buscar = nombre ? nombreParaBuscar(nombre) : null;
    const delActivo = noticias.ok ? noticias.data.noticias.filter((n) => n.tickers.includes(ticker) || (buscar !== null && menciona(`${n.titulo} ${n.resumen}`, buscar))) : [];

    if (!c && !a && !ubicado.precioPanel && !ultimo) throw new Error("Sin precio ni serie para este activo");

    return {
      data: {
        ticker,
        tipo: ubicado.tipo,
        nombre,
        sector: meta?.sector ?? null,
        panel: ubicado.tipo === "accion" ? (PANEL_LIDER[ticker] ? "líder" : "general") : null,
        precio: c?.precioArs ?? a?.precio ?? ubicado.precioPanel ?? ultimo?.cierre ?? null,
        variacion: c?.variacion ?? a?.variacion ?? ubicado.variacionPanel ?? null,
        precioUsd: c?.precioUsd ?? null,
        mepImplicito: c?.mepImplicito ?? null,
        cclImplicito: c?.cclImplicito ?? null,
        subyacente: enUsa && enUsa.c && enUsa.c > 0 ? { precio: enUsa.c, variacion: enUsa.pct_change !== null ? enUsa.pct_change / 100 : null, volumen: enUsa.v } : null,
        hoy: fila ? { compra: fila.px_bid && fila.px_bid > 0 ? fila.px_bid : null, venta: fila.px_ask && fila.px_ask > 0 ? fila.px_ask : null, operaciones: fila.q_op, nominales: fila.v } : null,
        perfil,
        parecidosPor,
        velas: serie.velas,
        serieCortada: serie.cortada,
        mep: historicoDolar.ok ? historicoDolar.data.mep : [],
        acerca,
        noticias: delActivo.slice(0, 8),
        parecidos: parecidos.slice(0, 6),
      },
      asOf: new Date().toISOString(),
      status: mercadoAbierto() ? "delayed" : "close",
    };
  });
}
