import { bonoPorTicker } from "@data/ar/bonos-usd";
import { SUBYACENTES_OPCIONES } from "@data/ar/opciones";
import { parsearSimbolo } from "@/lib/calculos";
import { nombreMes, numero } from "@/lib/format";
import { cargarOpciones } from "./opciones";
import { cargarBonos, cargarCripto, cargarMercados } from "./mercados";
import { cargarPesos } from "./pesos";
import { cargarCotizaciones } from "./dolar";
import { claseDeFicha } from "./fichas";

export type ClaseActivo = "cedear" | "accion" | "bono" | "lecap" | "cripto" | "opcion";

/** El precio de hoy de un activo, con su nombre y en qué moneda cotiza, para las alertas. */
export type PrecioActivo = {
  ticker: string;
  nombre: string;
  clase: ClaseActivo;
  /** Bonos: dólares por 100 nominales. LECAPs: pesos por 100 nominales. Opciones: prima por acción. El resto: pesos. */
  precio: number;
  moneda: "ARS" | "USD";
  variacion: number | null;
  /**
   * El mismo activo en la otra moneda (para Siguiendo, que muestra cada uno en la moneda en que se siguió). CEDEARs, bonos
   * y cripto: el precio de su especie o par en esa moneda. Acciones y LECAPs: pasado al dólar MEP. La variación en la otra
   * moneda suma lo que se movió el MEP hoy. null si no hay cómo calcularlo.
   */
  otra?: { precio: number | null; variacion: number | null };
};

/** Variación en la otra moneda: la del activo y la del MEP del día, compuestas. */
function variacionEnOtra(variacion: number | null, mepVar: number | null, hacia: "USD" | "ARS"): number | null {
  if (variacion === null || mepVar === null) return null;
  return hacia === "USD" ? (1 + variacion) / (1 + mepVar) - 1 : (1 + variacion) * (1 + mepVar) - 1;
}

/**
 * Precios de una lista de tickers de cualquier tipo. Solo carga lo que hace falta (por ejemplo, si no hay bonos, no
 * pide los bonos) y cada parte sale de los mismos servicios cacheados que las pantallas. Los que no encuentra no vuelven.
 */
export async function preciosDeActivos(tickers: string[]): Promise<Record<string, PrecioActivo>> {
  const porClase = new Map<string, string[]>();
  for (const t of tickers) {
    const clase = subyacenteDeOpcion(t) ? "opcion" : (claseDeFicha(t) ?? "mercado");
    porClase.set(clase, [...(porClase.get(clase) ?? []), t]);
  }
  const quiere = (c: string) => (porClase.get(c)?.length ?? 0) > 0;
  const subyacentes = [...new Set((porClase.get("opcion") ?? []).map((t) => subyacenteDeOpcion(t)!))];
  const [mercados, bonos, pesos, cripto, opciones, cotizaciones] = await Promise.all([
    quiere("mercado") ? cargarMercados() : null,
    quiere("bono") ? cargarBonos() : null,
    quiere("lecap") ? cargarPesos() : null,
    quiere("cripto") ? cargarCripto() : null,
    Promise.all(subyacentes.map((s) => cargarOpciones(s))),
    quiere("mercado") || quiere("bono") || quiere("lecap") ? cargarCotizaciones() : null,
  ]);
  const mepDato = cotizaciones?.ok ? cotizaciones.data.find((x) => x.id === "mep") : undefined;
  const mep = mepDato?.venta && mepDato.venta > 0 ? mepDato.venta : null;
  const mepVar = mepDato?.variacion ?? null;
  const aUsd = (ars: number | null | undefined) => (ars && mep ? ars / mep : null);

  const salida: Record<string, PrecioActivo> = {};
  for (const t of porClase.get("mercado") ?? []) {
    const c = mercados?.ok ? mercados.data.cedears.find((x) => x.ticker === t) : undefined;
    const a = mercados?.ok ? mercados.data.acciones.find((x) => x.ticker === t) : undefined;
    if (c) salida[t] = { ticker: t, nombre: c.nombre ?? t, clase: "cedear", precio: c.precioArs, moneda: "ARS", variacion: c.variacion, otra: { precio: c.precioUsd ?? aUsd(c.precioArs), variacion: variacionEnOtra(c.variacion, mepVar, "USD") } };
    else if (a) salida[t] = { ticker: t, nombre: a.nombre ?? t, clase: "accion", precio: a.precio, moneda: "ARS", variacion: a.variacion, otra: { precio: aUsd(a.precio), variacion: variacionEnOtra(a.variacion, mepVar, "USD") } };
  }
  for (const t of porClase.get("bono") ?? []) {
    const b = bonos?.ok ? bonos.data.bonos.find((x) => x.ticker === t) : undefined;
    if (b) salida[t] = { ticker: t, nombre: bonoPorTicker.get(t)?.nombre ?? t, clase: "bono", precio: b.precioUsd, moneda: "USD", variacion: b.variacion, otra: { precio: b.precioArs ?? (mep ? b.precioUsd * mep : null), variacion: variacionEnOtra(b.variacion, mepVar, "ARS") } };
  }
  for (const t of porClase.get("lecap") ?? []) {
    const l = pesos?.ok ? pesos.data.curva.letras.find((x) => x.ticker === t) : undefined;
    if (l) salida[t] = { ticker: t, nombre: `${l.tipo} ${l.ticker}`, clase: "lecap", precio: l.precio, moneda: "ARS", variacion: l.variacion, otra: { precio: aUsd(l.precio), variacion: variacionEnOtra(l.variacion, mepVar, "USD") } };
  }
  for (const t of porClase.get("cripto") ?? []) {
    const k = cripto?.ok ? cripto.data.find((x) => x.simbolo === t) : undefined;
    if (k) salida[t] = { ticker: t, nombre: k.nombre, clase: "cripto", precio: k.precioArs, moneda: "ARS", variacion: null, otra: { precio: k.precioUsd, variacion: null } };
  }
  // Opciones: la prima de referencia (punto medio de las puntas, o el último si operó hoy).
  for (const t of porClase.get("opcion") ?? []) {
    for (const r of opciones) {
      if (!r.ok) continue;
      for (const v of r.data.vencimientos) {
        const f = v.filas.find((x) => x.call?.simbolo === t || x.put?.simbolo === t);
        const lado = f?.call?.simbolo === t ? f.call : f?.put;
        const precio = lado?.referencia ?? lado?.ultimo;
        if (!f || !lado || !precio) continue;
        const nombre = `${f.call?.simbolo === t ? "Call" : "Put"} ${r.data.subyacente.ticker} ${numero(f.base, 0)} ${nombreMes(v.fecha).slice(0, 3)}`;
        salida[t] = { ticker: t, nombre, clase: "opcion", precio, moneda: "ARS", variacion: lado.variacion };
      }
    }
  }
  return salida;
}

/** El subyacente de un símbolo de opción que seguimos (GFGC5400DI → GGAL), o null. */
export function subyacenteDeOpcion(ticker: string): string | null {
  const s = parsearSimbolo(ticker);
  if (!s) return null;
  return Object.values(SUBYACENTES_OPCIONES).find((x) => x.prefijo === s.prefijo)?.ticker ?? null;
}
