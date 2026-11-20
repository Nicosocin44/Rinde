import { bonoPorTicker } from "@data/ar/bonos-usd";
import { LECAPS } from "@data/ar/lecaps";
import { WIKIPEDIA } from "@data/ar/wikipedia";
import { cortarEnSalto, hoyAR, inflacionEsperadaHasta, resumenBono, type ResumenBono, type Vela } from "@/lib/calculos";
import type { Noticia } from "@/lib/noticias";
import * as ad from "../adapters/argentinadatos";
import * as binance from "../adapters/binance";
import * as d912 from "../adapters/data912";
import * as wikipedia from "../adapters/wikipedia";
import { conRespaldo } from "../cache";
import { mercadoAbierto } from "../freshness";
import { FUENTES, type BonoUsd, type Cripto, type CurvaLecaps, type Lecap, type PuntoSerie } from "../types";
import { cargarCotizaciones } from "./dolar";
import { cargarMacro } from "./macro";
import { cargarBonos, cargarCripto } from "./mercados";
import { cargarNoticias } from "./noticias";
import { noticiasDeActivo } from "./noticias-activo";
import { cargarPesos } from "./pesos";

/**
 * Fichas de bonos soberanos, LECAPs/BONCAPs y cripto (la de CEDEARs y acciones está en ./activo).
 * Cada una se degrada por partes: si falla la historia, las noticias o Wikipedia, se muestra el resto.
 */

export type ClaseFicha = "bono" | "lecap" | "cripto";

const CRIPTOS = ["BTC", "ETH", "USDT", "USDC"] as const;
type SimboloCripto = (typeof CRIPTOS)[number];

/** ¿Qué tipo de ficha es este ticker? null = CEDEAR, acción o desconocido (lo resuelve ./activo). */
export function claseDeFicha(ticker: string): ClaseFicha | null {
  if ((CRIPTOS as readonly string[]).includes(ticker)) return "cripto";
  if (bonoPorTicker.has(ticker)) return "bono";
  // Letras: las de la tabla, o cualquier ticker con forma de LECAP/BONCAP (S30N6, T15E7) que aparezca en la curva del día.
  if (LECAPS.some((l) => l.ticker === ticker) || /^[ST]\d{2}[A-Z]\d$/.test(ticker)) return "lecap";
  return null;
}

export async function velas912(clase: "bonds", ticker: string): Promise<Vela[]> {
  try {
    const h = await d912.historico(clase, ticker);
    const todas = h
      .filter((p) => p.c > 0)
      .map((p) => ({ fecha: p.date.slice(0, 10), apertura: p.o ?? p.c, maximo: p.h ?? p.c, minimo: p.l ?? p.c, cierre: p.c, volumen: p.v ?? 0 }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    return cortarEnSalto(todas);
  } catch {
    return [];
  }
}

async function wiki(ticker: string) {
  const titulo = WIKIPEDIA[ticker];
  if (!titulo) return null;
  try {
    return await wikipedia.resumen(titulo);
  } catch {
    return null;
  }
}

async function noticiasDe(filtro: (n: Noticia) => boolean, orden?: (n: Noticia) => number): Promise<Noticia[]> {
  const r = await cargarNoticias();
  if (!r.ok) return [];
  const lista = r.data.noticias.filter(filtro);
  return (orden ? [...lista].sort((a, b) => orden(b) - orden(a)) : lista).slice(0, 6);
}

const estado = () => (mercadoAbierto() ? ("delayed" as const) : ("close" as const));

// ───────────────────────── Bonos ─────────────────────────

export type FichaBono = {
  bono: BonoUsd;
  liquidacion: string;
  resumen: ResumenBono;
  /** Cierres de la especie en dólares (D) y en pesos. */
  velasUsd: Vela[];
  velasArs: Vela[];
  /** El mismo bono con la otra ley (AL30 ↔ GD30), si cotiza. */
  par: BonoUsd | null;
  otros: BonoUsd[];
  noticias: Noticia[];
};

export async function cargarFichaBono(ticker: string) {
  return conRespaldo<FichaBono>(`ficha:bono:${ticker}`, [FUENTES.data912], async () => {
    const def = bonoPorTicker.get(ticker);
    const bonos = await cargarBonos();
    if (!def || !bonos.ok) throw new Error("No pudimos traer los bonos");
    const bono = bonos.data.bonos.find((b) => b.ticker === ticker);
    if (!bono) throw new Error(`${ticker} no tiene precio en dólares hoy`);
    const [velasUsd, velasArs, noticias] = await Promise.all([velas912("bonds", `${ticker}D`), velas912("bonds", ticker), noticiasDe((n) => n.mercados.includes("bonos")).then((p) => noticiasDeActivo({ tipo: "bono", ticker, nombre: def?.nombre ?? null }, [], p))]);
    return {
      data: {
        bono,
        liquidacion: bonos.data.liquidacion,
        resumen: resumenBono(def, hoyAR()),
        velasUsd,
        velasArs,
        par: bonos.data.bonos.find((b) => b.ticker !== ticker && b.vencimiento === bono.vencimiento && b.ley !== bono.ley) ?? null,
        otros: bonos.data.bonos.filter((b) => b.ticker !== ticker).sort((a, b) => a.duration - b.duration),
        noticias,
      },
      asOf: bonos.asOf,
      status: estado(),
    };
  });
}

// ───────────────────────── LECAPs y BONCAPs ─────────────────────────

export type FichaLetra = {
  letra: Lecap;
  curva: CurvaLecaps;
  /** Inflación esperada (REM) desde la liquidación hasta el vencimiento. */
  inflacionHasta: number | null;
  informeRem: string | null;
  /** El mejor plazo fijo para comparar (el de plazo más parecido sin pasarse). */
  plazoFijo: { nombre: string; tea: number; plazoDias: number } | null;
  /** Las letras de vencimiento más cercano, para comparar. */
  vecinas: Lecap[];
  noticias: Noticia[];
};

export async function cargarFichaLetra(ticker: string) {
  return conRespaldo<FichaLetra>(`ficha:lecap:${ticker}`, [FUENTES.data912, FUENTES.argentinadatos], async () => {
    const [pesos, macro, noticias] = await Promise.all([cargarPesos(), cargarMacro(), noticiasDe((n) => n.mercados.includes("tasas")).then((p) => noticiasDeActivo({ tipo: "lecap", ticker, nombre: null }, [], p))]);
    if (!pesos.ok) throw new Error("No pudimos traer las letras");
    const { curva } = pesos.data;
    const letra = curva.letras.find((l) => l.ticker === ticker);
    if (!letra) throw new Error(`${ticker} no tiene precio hoy (o ya venció)`);
    const rem = macro.ok ? macro.data.rem : null;
    const pfs = pesos.data.opciones.filter((o) => o.tipo === "plazo_fijo" && !o.condicionEspecial && o.plazoDias !== null && o.plazoDias <= Math.max(30, letra.dias));
    const plazo = Math.max(...pfs.map((o) => o.plazoDias ?? 0));
    const pf = pfs.filter((o) => o.plazoDias === plazo).sort((a, b) => b.tea - a.tea)[0];
    return {
      data: {
        letra,
        curva,
        inflacionHasta: rem ? inflacionEsperadaHasta(rem.mensual, curva.liquidacion, letra.vencimiento) : null,
        informeRem: rem?.informe ?? null,
        plazoFijo: pf ? { nombre: pf.nombre, tea: pf.tea, plazoDias: pf.plazoDias ?? 30 } : null,
        vecinas: curva.letras.filter((l) => l.ticker !== ticker && l.enCurva).sort((a, b) => Math.abs(a.dias - letra.dias) - Math.abs(b.dias - letra.dias)).slice(0, 4).sort((a, b) => a.dias - b.dias),
        noticias,
      },
      asOf: pesos.asOf,
      status: estado(),
    };
  });
}

// ───────────────────────── Cripto ─────────────────────────

const PALABRAS_CRIPTO: Record<SimboloCripto, RegExp> = {
  BTC: /bitcoin|btc/i,
  ETH: /ether|eth\b/i,
  USDT: /usdt|tether|stablecoin|d[oó]lar cripto/i,
  USDC: /usdc|stablecoin|d[oó]lar cripto/i,
};

export type FichaCripto = {
  cripto: Cripto;
  /** BTC y ETH: velas diarias en dólares (Binance). */
  velasUsd: Vela[];
  /** Últimas 24 horas en velas de 5 minutos (Binance): BTC/ETH en dólares, y USDT en pesos (para USDT y para pasar a pesos). */
  intradiaUsd: Vela[];
  intradiaUsdtArs: Vela[];
  /** Dólar cripto (pesos por USDT), diario: para pasar a pesos y para la ficha de USDT y USDC. */
  dolarCripto: PuntoSerie[];
  mep: number | null;
  acerca: { texto: string; url: string } | null;
  noticias: Noticia[];
};

export async function cargarFichaCripto(simbolo: SimboloCripto) {
  return conRespaldo<FichaCripto>(`ficha:cripto:${simbolo}`, [FUENTES.criptoya, FUENTES.binance, FUENTES.argentinadatos], async () => {
    const [criptos, velasUsd, intradiaUsd, intradiaUsdtArs, dolarCripto, cotizaciones, acerca, noticias] = await Promise.all([
      cargarCripto(),
      simbolo === "BTC" || simbolo === "ETH" ? binance.velasDiarias(simbolo).catch(() => [] as Vela[]) : Promise.resolve([] as Vela[]),
      simbolo === "BTC" || simbolo === "ETH" ? binance.velasDelDia(`${simbolo}USDT`).catch(() => [] as Vela[]) : Promise.resolve([] as Vela[]),
      binance.velasDelDia("USDTARS").catch(() => [] as Vela[]),
      ad.historicoDolar("cripto").catch(() => []),
      cargarCotizaciones(),
      wiki(simbolo),
      noticiasDe(
        (n) => n.mercados.includes("cripto"),
        (n) => (PALABRAS_CRIPTO[simbolo].test(n.titulo) ? 2 : 0) + (PALABRAS_CRIPTO[simbolo].test(n.resumen) ? 1 : 0),
      ).then((p) =>
        noticiasDeActivo(
          { tipo: "cripto", ticker: simbolo, nombre: null },
          p.filter((n) => PALABRAS_CRIPTO[simbolo].test(n.titulo)),
          p.filter((n) => !PALABRAS_CRIPTO[simbolo].test(n.titulo)),
        ),
      ),
    ]);
    if (!criptos.ok) throw new Error("No pudimos traer los precios de cripto");
    const cripto = criptos.data.find((c) => c.simbolo === simbolo);
    if (!cripto) throw new Error(`Sin precio de ${simbolo}`);
    return {
      data: {
        cripto,
        velasUsd,
        intradiaUsd,
        intradiaUsdtArs,
        dolarCripto: dolarCripto.map((p) => ({ fecha: p.fecha.slice(0, 10), valor: p.venta })).sort((a, b) => a.fecha.localeCompare(b.fecha)),
        mep: cotizaciones.ok ? (cotizaciones.data.find((c) => c.id === "mep")?.venta ?? null) : null,
        acerca: acerca ? { texto: acerca.texto, url: acerca.url } : null,
        noticias,
      },
      asOf: criptos.asOf,
      status: "live",
    };
  });
}

export function esCripto(t: string): t is SimboloCripto {
  return (CRIPTOS as readonly string[]).includes(t);
}
