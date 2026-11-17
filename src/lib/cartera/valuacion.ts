import { LECAPS } from "@data/ar/lecaps";
import {
  construirIndice,
  d,
  derivarPosiciones,
  diasEntre,
  esCuenta,
  inflacionAcumulada,
  nivelEnFecha,
  puntosDeValuacion,
  reexpresar,
  resumenRendimiento,
  serieTwr,
  sumarDias,
  totalArs,
  valuarPosiciones,
  type Activo,
  type ContextoValuacion,
  type Movimiento,
  type PosicionValuada,
  type ResumenRendimiento,
} from "@/lib/calculos";
import type { PreciosCartera } from "@/lib/data/servicios/cartera";

/**
 * Análisis completo de una cartera: posiciones valuadas, totales en ARS / USD MEP / pesos constantes,
 * rendimiento (TWR y XIRR) en las tres unidades y benchmarks (IPC, MEP, plazo fijo a 30 días). Puro: sin IO.
 */

/** Último valor de una serie [fecha, valor] en o antes de `fecha`. */
export function valorEn(serie: [string, number][] | undefined, fecha: string): number | null {
  if (!serie || serie.length === 0) return null;
  let r: number | null = null;
  for (const [f, v] of serie) {
    if (f <= fecha) r = v;
    else break;
  }
  return r ?? serie[0]![1];
}

export type AnalisisCartera = {
  hoy: string;
  inicio: string | null;
  posiciones: PosicionValuada[];
  totalArs: number;
  totalUsd: number;
  /** Total en pesos del mes de inicio (pesos constantes). */
  totalReal: number | null;
  mep: number;
  variacionDia: { monto: number; fraccion: number } | null;
  serie: { fecha: string; ars: number; usd: number; real: number | null; twr: number }[];
  rendimiento: { ars: ResumenRendimiento | null; usd: ResumenRendimiento | null; real: ResumenRendimiento | null };
  benchmarks: { ipc: number | null; mep: number | null; plazoFijo: number | null };
  distribucion: { porTipo: { clave: string; etiqueta: string; valor: number; fraccion: number }[]; porMoneda: { clave: string; etiqueta: string; valor: number; fraccion: number }[] };
  sinPrecio: string[];
};

const ETIQUETA_TIPO: Record<Activo["tipo"], string> = {
  billetera: "Billeteras y cuentas",
  plazo_fijo: "Plazo fijo",
  fci: "Fondos",
  lecap: "Letras del Tesoro",
  bono: "Bonos",
  on: "Obligaciones negociables",
  cedear: "CEDEARs",
  accion: "Acciones",
  cripto: "Cripto",
  efectivo_usd: "Dólares",
};

export function analizarCartera(activosLista: Activo[], movimientos: Movimiento[], precios: PreciosCartera, hoy: string): AnalisisCartera {
  const activos = new Map(activosLista.map((a) => [a.id, a]));
  const ordenados = [...movimientos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const inicio = ordenados[0]?.fecha ?? null;
  const mepHoy = precios.mep.at(-1)?.[1] ?? 1;
  const mepEn = (f: string) => (f >= hoy ? mepHoy : (valorEn(precios.mep, f) ?? mepHoy));
  const lecapPorTicker = new Map(LECAPS.map((l) => [l.ticker, l]));

  /** Precio de mercado de un activo a una fecha (undefined = sin precio; se valúa al costo). */
  const precioEn = (a: Activo, f: string): number | undefined => {
    const actual = precios.actuales[a.id]?.precio;
    if (f >= hoy && actual) return actual;
    const hist = precios.historicos[a.id];
    if (hist && hist.length && f >= hist[0]![0]) return valorEn(hist, f) ?? undefined;
    if (a.tipo === "lecap") {
      // Sin histórico: valuación teórica a la tasa de compra, del precio pagado al valor final.
      const compra = ordenados.find((m) => m.activoId === a.id && m.tipo === "compra" && m.fecha <= f);
      const l = lecapPorTicker.get(a.ticker ?? "");
      if (compra && l) {
        const total = diasEntre(compra.fecha, l.vencimiento);
        const t = Math.min(1, diasEntre(compra.fecha, f) / Math.max(1, total));
        const p0 = Number(compra.precio);
        return p0 * Math.pow(l.vf / p0, t);
      }
    }
    if (a.tipo === "efectivo_usd") return 1;
    const ultimo = [...ordenados].reverse().find((m) => m.activoId === a.id && m.fecha <= f && (m.tipo === "compra" || m.tipo === "venta"));
    return ultimo ? Number(ultimo.precio) : actual;
  };

  const contextoEn = (f: string): ContextoValuacion => {
    const mapa = new Map<string, number>();
    for (const a of activos.values()) {
      if (esCuenta(a.tipo)) continue;
      const p = precioEn(a, f);
      if (p !== undefined) mapa.set(a.id, p);
    }
    return { precios: mapa, mep: mepEn(f) };
  };

  const posiciones = valuarPosiciones(derivarPosiciones(movimientos, activos, hoy), activos, contextoEn(hoy), hoy);
  const total = totalArs(posiciones).toNumber();

  // Índice de precios (IPC) para pesos constantes; se proyecta el último mes publicado hasta hoy.
  const indice = construirIndice(precios.ipc.map(([f, v]) => ({ fecha: f, valor: v * 100 })));
  const nivelIpc = (f: string) => nivelEnFecha(indice, f)?.toNumber() ?? null;

  // Puntos semanales (más las fechas con movimientos) para la serie y el TWR.
  const semanas: string[] = [];
  if (inicio) for (let f = inicio; f < hoy; f = sumarDias(f, 7)) semanas.push(f);
  const puntos = inicio ? puntosDeValuacion(movimientos, activos, contextoEn, [...semanas, hoy]) : [];
  const enUsd = reexpresar(puntos, (f) => mepEn(f));
  const enReal = reexpresar(puntos, (f) => nivelIpc(f));
  const twrSerie = serieTwr(puntos);
  const baseIpc = inicio ? nivelIpc(inicio) : null;

  const serie = puntos.map((p, i) => {
    const nivel = nivelIpc(p.fecha);
    return {
      fecha: p.fecha,
      ars: d(p.valor).toNumber(),
      usd: d(p.valor).div(mepEn(p.fecha)).toNumber(),
      real: nivel && baseIpc ? d(p.valor).mul(baseIpc).div(nivel).toNumber() : null,
      twr: twrSerie[i]?.acumulado.toNumber() ?? 0,
    };
  });

  // Variación del día: con la variación de cada precio de mercado.
  let deltaDia = 0;
  let conVariacion = false;
  for (const p of posiciones) {
    const v = precios.actuales[p.activoId]?.variacion;
    if (v !== null && v !== undefined && Number.isFinite(v)) {
      deltaDia += p.valorArs.toNumber() * (v / (1 + v));
      conVariacion = true;
    }
  }

  // Benchmarks entre el inicio y hoy.
  let ipc: number | null = null;
  let mep: number | null = null;
  let plazoFijo: number | null = null;
  if (inicio) {
    const n0 = nivelIpc(inicio);
    const n1 = nivelIpc(hoy);
    ipc = n0 && n1 ? n1 / n0 - 1 : null;
    const m0 = mepEn(inicio);
    mep = m0 ? mepHoy / m0 - 1 : null;
    // Plazo fijo a 30 días renovado con la tasa promedio de cada semana.
    const tramo = precios.pf30.filter(([f]) => f >= inicio && f <= hoy);
    if (tramo.length > 1) {
      let acumulado = 1;
      for (let i = 1; i < tramo.length; i++) acumulado *= 1 + (tramo[i - 1]![1] * diasEntre(tramo[i - 1]![0], tramo[i]![0])) / 365;
      plazoFijo = acumulado - 1;
    }
  }

  const agrupar = (clave: (p: PosicionValuada) => string, etiqueta: (k: string) => string) => {
    const mapa = new Map<string, number>();
    for (const p of posiciones) mapa.set(clave(p), (mapa.get(clave(p)) ?? 0) + p.valorArs.toNumber());
    return [...mapa]
      .map(([k, v]) => ({ clave: k, etiqueta: etiqueta(k), valor: v, fraccion: total > 0 ? v / total : 0 }))
      .sort((a, b) => b.valor - a.valor);
  };

  const nivelHoy = nivelIpc(hoy);
  return {
    hoy,
    inicio,
    posiciones,
    totalArs: total,
    totalUsd: total / mepHoy,
    totalReal: baseIpc && nivelHoy ? (total * baseIpc) / nivelHoy : null,
    mep: mepHoy,
    variacionDia: conVariacion ? { monto: deltaDia, fraccion: total - deltaDia > 0 ? deltaDia / (total - deltaDia) : 0 } : null,
    serie,
    rendimiento: { ars: resumenRendimiento(puntos), usd: resumenRendimiento(enUsd), real: resumenRendimiento(enReal) },
    benchmarks: { ipc, mep, plazoFijo },
    distribucion: {
      porTipo: agrupar((p) => p.activo.tipo, (k) => ETIQUETA_TIPO[k as Activo["tipo"]] ?? k),
      porMoneda: agrupar((p) => p.activo.moneda, (k) => (k === "USD" ? "Dólares" : "Pesos")),
    },
    sinPrecio: posiciones.filter((p) => p.sinPrecio).map((p) => p.activo.nombre),
  };
}

export { inflacionAcumulada };
