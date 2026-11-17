import { d, DIAS_ANIO, UNO, type Dec, type Num } from "./decimal";

/**
 * Tasas en pesos. Todas las tasas entran y salen como fracción (0.24 = 24 %).
 * Convención de días: actual/365.
 */

/**
 * Interés simple de un plazo fijo: I = C × TNA × d / 365.
 * Ej.: $1.000.000 a 30 días al 24 % TNA → $19.726,03.
 */
export function interesPlazoFijo(capital: Num, tna: Num, dias: Num): Dec {
  return d(capital).mul(tna).mul(dias).div(DIAS_ANIO);
}

/**
 * TEA de una colocación a `dias` renovada al mismo plazo: (1 + TNA × d/365)^(365/d) − 1.
 * Ej.: 24 % TNA a 30 días → 26,82 % TEA.
 */
export function teaDesdeTna(tna: Num, dias: Num): Dec {
  const n = d(dias);
  return UNO.plus(d(tna).mul(n).div(DIAS_ANIO)).pow(DIAS_ANIO.div(n)).minus(1);
}

/**
 * TEA con capitalización diaria (billeteras, cuentas remuneradas, FCI money market):
 * (1 + TNA/365)^365 − 1. Ej.: 32 % TNA → 37,69 % TEA.
 */
export function teaCapitalizacionDiaria(tna: Num): Dec {
  return teaDesdeTna(tna, 1);
}

/** Inversa de `teaDesdeTna`: TNA = ((1 + TEA)^(d/365) − 1) × 365/d. */
export function tnaDesdeTea(tea: Num, dias: Num): Dec {
  const n = d(dias);
  return UNO.plus(tea).pow(n.div(DIAS_ANIO)).minus(1).mul(DIAS_ANIO).div(n);
}

/**
 * TEM desde TEA con convención 30/365: (1 + TEA)^(30/365) − 1.
 * Ej.: 26,82 % TEA → 1,97 % TEM.
 */
export function temDesdeTea(tea: Num): Dec {
  return UNO.plus(tea).pow(d(30).div(DIAS_ANIO)).minus(1);
}

/** Inversa de `temDesdeTea`: (1 + TEM)^(365/30) − 1. */
export function teaDesdeTem(tem: Num): Dec {
  return UNO.plus(tem).pow(DIAS_ANIO.div(30)).minus(1);
}

/** Tasa real: (1 + nominal) / (1 + inflación) − 1. Ej.: 30 % nominal con 25 % de inflación → 4 %. */
export function tasaReal(nominal: Num, inflacion: Num): Dec {
  return UNO.plus(nominal).div(UNO.plus(inflacion)).minus(1);
}

/**
 * Ganancia en un período de `dias` a una TEA dada: monto × ((1 + TEA)^(d/365) − 1).
 * Es la cuenta del widget "¿Dónde rinde más tu plata?".
 */
export function gananciaPeriodo(monto: Num, tea: Num, dias: Num): Dec {
  return d(monto).mul(UNO.plus(tea).pow(d(dias).div(DIAS_ANIO)).minus(1));
}

/**
 * Diferencia de ganancia mensual (30 días) entre dos TEA para un mismo monto:
 * monto × ((1 + TEA_b)^(30/365) − (1 + TEA_a)^(30/365)).
 */
export function diferenciaMensual(monto: Num, teaA: Num, teaB: Num): Dec {
  const e = d(30).div(DIAS_ANIO);
  return d(monto).mul(UNO.plus(teaB).pow(e).minus(UNO.plus(teaA).pow(e)));
}

/**
 * Ganancia con tope: la tasa se aplica solo hasta `tope`; el excedente no rinde.
 * Si `tope` es null o 0 no hay tope.
 */
export function gananciaConTope(monto: Num, tea: Num, dias: Num, tope: Num | null): Dec {
  const m = d(monto);
  const base = tope && d(tope).gt(0) && m.gt(tope) ? d(tope) : m;
  return gananciaPeriodo(base, tea, dias);
}

/** TEA efectiva sobre todo el monto cuando hay tope (para ordenar opciones de forma justa). */
export function teaEfectivaConTope(monto: Num, tea: Num, tope: Num | null): Dec {
  const m = d(monto);
  if (!tope || d(tope).lte(0) || m.lte(tope) || m.isZero()) return d(tea);
  // La ganancia anual se obtiene solo sobre el tope.
  return d(tope).mul(tea).div(m);
}

export type TasasEquivalentes = { tna: Dec; tea: Dec; tem: Dec };

/** Convierte cualquier tasa (TNA a un plazo, TEA o TEM) a las tres. */
export function convertirTasa(valor: Num, tipo: "tna" | "tea" | "tem", dias: Num = 30): TasasEquivalentes {
  const tea = tipo === "tea" ? d(valor) : tipo === "tna" ? teaDesdeTna(valor, dias) : teaDesdeTem(valor);
  return { tna: tnaDesdeTea(tea, dias), tea, tem: temDesdeTea(tea) };
}
