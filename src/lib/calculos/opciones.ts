import { d, DIAS_ANIO, UNO, type Dec, type Num } from "./decimal";
import { aUTC, desdeUTC, esHabil, sumarDias, type FechaISO } from "./fechas";

/**
 * Opciones sobre acciones de BYMA (GGAL, YPF, PAMP…).
 *
 * El modelo (Black-Scholes, volatilidad implícita, delta) trabaja con `number`: es una estimación estadística,
 * no una cuenta de plata. Las cuentas con pesos (lanzamiento cubierto) van con decimal.js.
 */

export type TipoOpcion = "call" | "put";

// ───────────────────────── Símbolos y vencimientos ─────────────────────────

/** Códigos de mes de BYMA: GFGC5400DI = call de GGAL, base $5.400, vence en diciembre. */
export const MESES_OPCION: Record<string, number> = { EN: 1, FE: 2, MR: 3, AB: 4, MY: 5, JU: 6, JL: 7, AG: 8, SE: 9, OC: 10, NO: 11, DI: 12 };

export type SimboloOpcion = { prefijo: string; tipo: TipoOpcion; base: number; codigoMes: string };

/**
 * Desarma el símbolo: prefijo de 3 letras, C (call) o V (put), la base y el mes.
 * Los símbolos tienen 10 caracteres como máximo: con una base de 5 cifras el mes queda en una letra
 * (GFGC10300D = diciembre). Devuelve null si no es una opción.
 */
export function parsearSimbolo(simbolo: string): SimboloOpcion | null {
  const m = /^([A-Z]{3})([CV])(\d+(?:\.\d+)?)([A-Z]{1,2})$/.exec(simbolo);
  if (!m) return null;
  const [, prefijo, cv, base, mes] = m;
  const valor = Number(base);
  if (!prefijo || !mes || !Number.isFinite(valor) || valor <= 0) return null;
  if (mes.length === 2 && !(mes in MESES_OPCION)) return null;
  if (mes.length === 1 && !Object.keys(MESES_OPCION).some((k) => k.startsWith(mes))) return null;
  return { prefijo, tipo: cv === "C" ? "call" : "put", base: valor, codigoMes: mes };
}

/** Tercer viernes del mes (mes 1–12). */
export function tercerViernes(anio: number, mes: number): FechaISO {
  const primero = new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay();
  const primerViernes = 1 + ((5 - primero + 7) % 7);
  return desdeUTC(Date.UTC(anio, mes - 1, primerViernes + 14));
}

/** Vencimiento de BYMA: el tercer viernes del mes; si no es hábil, el hábil anterior. */
export function vencimientoDelMes(anio: number, mes: number, feriados: ReadonlySet<FechaISO>): FechaISO {
  let fecha = tercerViernes(anio, mes);
  while (!esHabil(fecha, feriados)) fecha = sumarDias(fecha, -1);
  return fecha;
}

/**
 * Un vencimiento de este año que pasó hace menos de esto se toma como vencido (la fuente a veces sigue listando
 * la serie unos días): no lo pasamos al año siguiente. BYMA no lista series a más de un año.
 */
const DIAS_VENCIDA = 60;

/** El vencimiento de un mes dado: el de este año si no pasó (o pasó hace poco: vencida), si no el del año que viene. */
function proximoVencimiento(mes: number, hoy: FechaISO, feriados: ReadonlySet<FechaISO>): FechaISO {
  const anio = Number(hoy.slice(0, 4));
  const este = vencimientoDelMes(anio, mes, feriados);
  if (este >= hoy) return este;
  return (aUTC(hoy) - aUTC(este)) / 86_400_000 <= DIAS_VENCIDA ? este : vencimientoDelMes(anio + 1, mes, feriados);
}

/**
 * Fecha de vencimiento de un código de mes. Con una sola letra (símbolo truncado) se elige entre los meses
 * que empiezan con esa letra: primero los que ya aparecen completos en el panel, si no el más cercano.
 */
export function vencimientoOpcion(codigoMes: string, hoy: FechaISO, feriados: ReadonlySet<FechaISO>, codigosPresentes: ReadonlySet<string> = new Set()): FechaISO | null {
  if (codigoMes.length === 2) {
    const mes = MESES_OPCION[codigoMes];
    return mes ? proximoVencimiento(mes, hoy, feriados) : null;
  }
  const candidatos = Object.keys(MESES_OPCION).filter((k) => k.startsWith(codigoMes));
  const presentes = candidatos.filter((k) => codigosPresentes.has(k));
  const lista = (presentes.length ? presentes : candidatos).map((k) => proximoVencimiento(MESES_OPCION[k]!, hoy, feriados)).sort();
  return lista[0] ?? null;
}

// ───────────────────────── Black-Scholes ─────────────────────────

/** Normal estándar acumulada (Abramowitz y Stegun 26.2.17, error < 7,5e-8). */
export function normalAcumulada(x: number): number {
  if (x < 0) return 1 - normalAcumulada(-x);
  const t = 1 / (1 + 0.2316419 * x);
  const poli = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return 1 - (Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI)) * poli;
}

export type ParametrosBS = {
  tipo: TipoOpcion;
  /** Precio de la acción. */
  s: number;
  /** Base (strike). */
  k: number;
  /** Tiempo al vencimiento, en años. */
  t: number;
  /** Tasa libre de riesgo, continua. */
  r: number;
  /** Volatilidad anual. */
  sigma: number;
};

function d1d2({ s, k, t, r, sigma }: ParametrosBS): [number, number] {
  const raiz = sigma * Math.sqrt(t);
  const d1 = (Math.log(s / k) + (r + (sigma * sigma) / 2) * t) / raiz;
  return [d1, d1 - raiz];
}

/** Prima teórica de Black-Scholes (opción europea, sin dividendos). Ej.: S=K=100, 1 año, r=5 %, σ=20 % → call 10,45. */
export function primaBS(p: ParametrosBS): number {
  const [d1, d2] = d1d2(p);
  const descuento = p.k * Math.exp(-p.r * p.t);
  return p.tipo === "call" ? p.s * normalAcumulada(d1) - descuento * normalAcumulada(d2) : descuento * normalAcumulada(-d2) - p.s * normalAcumulada(-d1);
}

/** Delta: cuánto se mueve la prima por cada $1 que se mueve la acción. Call entre 0 y 1, put entre −1 y 0. */
export function deltaBS(p: ParametrosBS): number {
  const [d1] = d1d2(p);
  return p.tipo === "call" ? normalAcumulada(d1) : normalAcumulada(d1) - 1;
}

/**
 * Volatilidad implícita: la σ que hace que Black-Scholes dé la prima observada (bisección entre 1 % y 500 %).
 * null si la prima está fuera de los límites que admite el modelo (por debajo del valor intrínseco descontado,
 * o por encima del precio de la acción) o si falta tiempo.
 */
export function volatilidadImplicita(prima: number, p: Omit<ParametrosBS, "sigma">): number | null {
  if (!(prima > 0) || !(p.t > 0) || !(p.s > 0) || !(p.k > 0)) return null;
  const descuento = p.k * Math.exp(-p.r * p.t);
  const minimo = p.tipo === "call" ? Math.max(0, p.s - descuento) : Math.max(0, descuento - p.s);
  const maximo = p.tipo === "call" ? p.s : descuento;
  if (prima <= minimo || prima >= maximo) return null;
  let bajo = 0.01;
  let alto = 5;
  if (primaBS({ ...p, sigma: bajo }) > prima || primaBS({ ...p, sigma: alto }) < prima) return null;
  for (let i = 0; i < 100; i++) {
    const medio = (bajo + alto) / 2;
    if (primaBS({ ...p, sigma: medio }) > prima) alto = medio;
    else bajo = medio;
    if (alto - bajo < 1e-7) break;
  }
  return (bajo + alto) / 2;
}

/** Tasa continua equivalente a una TEA: ln(1 + TEA). */
export function tasaContinua(tea: number): number {
  return Math.log(1 + tea);
}

/** Valor intrínseco por acción: lo que valdría ejercerla hoy. */
export function valorIntrinseco(tipo: TipoOpcion, s: number, k: number): number {
  return Math.max(0, tipo === "call" ? s - k : k - s);
}

// ───────────────────────── Lanzamiento cubierto ─────────────────────────

export type LanzamientoCubierto = {
  /** Lo que ponés por acción: precio de la acción − prima cobrada. */
  inversion: Dec;
  /** Rendimiento directo si te ejercen: base / inversión − 1. */
  directo: Dec;
  tna: Dec;
  tea: Dec;
  /** Cuánto puede bajar la acción y que igual te ejerzan: 1 − base / precio. Negativo: tiene que subir. */
  colchon: Dec;
  /** Precio de la acción al vencimiento en el que no ganás ni perdés (= inversión). */
  equilibrio: Dec;
  /** Cuánto puede bajar la acción hasta el punto de equilibrio: prima / precio. */
  caidaEquilibrio: Dec;
};

/**
 * Comprás la acción y vendés un call. Si al vencimiento la acción está por encima de la base, te ejercen:
 * entregás la acción a la base y la cuenta queda cerrada, como una colocación a tasa.
 * Ej.: acción $4.720, call base $4.400 cobrado a $480, 31 días → inversión $4.240, directo 3,77 %, TNA 44,4 %.
 * Antes de comisiones, derechos de mercado e impuestos.
 */
export function lanzamientoCubierto(precioAccion: Num, prima: Num, base: Num, dias: number): LanzamientoCubierto | null {
  const s = d(precioAccion);
  const c = d(prima);
  const k = d(base);
  if (dias <= 0 || s.lte(0) || c.lte(0) || k.lte(0)) return null;
  const inversion = s.minus(c);
  if (inversion.lte(0)) return null;
  const factor = k.div(inversion);
  const directo = factor.minus(UNO);
  return {
    inversion,
    directo,
    tna: directo.mul(DIAS_ANIO).div(dias),
    tea: factor.pow(DIAS_ANIO.div(dias)).minus(UNO),
    colchon: UNO.minus(k.div(s)),
    equilibrio: inversion,
    caidaEquilibrio: c.div(s),
  };
}

/** Días corridos entre dos fechas ISO (para el tiempo del modelo, en años). */
export function aniosEntre(desde: FechaISO, hasta: FechaISO): number {
  return (aUTC(hasta) - aUTC(desde)) / 86_400_000 / 365;
}
