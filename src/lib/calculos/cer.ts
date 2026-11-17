import { d, DIAS_ANIO, UNO, type Dec, type Num } from "./decimal";

/** Bonos ajustados por CER. */

/** Valor nominal ajustado: VN × CER_{t−10 hábiles} / CER_base. */
export function valorAjustadoCer(vn: Num, cerActual: Num, cerBase: Num): Dec {
  return d(vn).mul(cerActual).div(cerBase);
}

/**
 * Inflación breakeven entre una tasa nominal (LECAP) y una tasa real (CER) de plazo similar:
 * π = (1 + TEA_LECAP) / (1 + TIR_real) − 1.
 * Ej.: LECAP 28 % TEA contra CER + 6 % → 20,75 % anual → 1,56 % mensual.
 */
export function inflacionBreakeven(teaNominal: Num, tirReal: Num): { anual: Dec; mensual: Dec } {
  const anual = UNO.plus(teaNominal).div(UNO.plus(tirReal)).minus(1);
  const mensual = UNO.plus(anual).pow(d(30).div(DIAS_ANIO)).minus(1);
  return { anual, mensual };
}
