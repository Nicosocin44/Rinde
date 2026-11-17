import { d, DIAS_ANIO, type Dec, type Num } from "./decimal";

/**
 * LECAPs y BONCAPs: letras y bonos capitalizables a tasa fija.
 * VF = valor final por 100 VN, P = precio por 100 VN, d = días corridos desde la liquidación al vencimiento.
 */

export type RendimientoLecap = {
  /** VF / P − 1 */
  directo: Dec;
  /** (VF / P − 1) × 365 / d */
  tna: Dec;
  /** (VF / P)^(365/d) − 1 */
  tea: Dec;
  /** (VF / P)^(30/d) − 1 */
  tem: Dec;
};

/**
 * Ej.: VF 161,104, precio 155,12 y 59 días → directo 3,86 %, TNA 23,86 %, TEA 26,40 %, TEM 1,94 %.
 * Devuelve null si los días son ≤ 0 o el precio no es positivo (instrumento vencido o sin precio).
 */
export function rendimientoLecap(vf: Num, precio: Num, dias: Num): RendimientoLecap | null {
  const n = d(dias);
  const p = d(precio);
  if (n.lte(0) || p.lte(0) || d(vf).lte(0)) return null;
  const factor = d(vf).div(p);
  return {
    directo: factor.minus(1),
    tna: factor.minus(1).mul(DIAS_ANIO).div(n),
    tea: factor.pow(DIAS_ANIO.div(n)).minus(1),
    tem: factor.pow(d(30).div(n)).minus(1),
  };
}

export type CobroLecap = { nominales: Dec; cobro: Dec; ganancia: Dec };

/**
 * "Si pongo $X hoy, al vencimiento cobro $Y".
 * nominales = X / (P/100); cobro = nominales × VF/100.
 */
export function cobroAlVencimiento(monto: Num, precio: Num, vf: Num): CobroLecap {
  const nominales = d(monto).div(d(precio).div(100));
  const cobro = nominales.mul(vf).div(100);
  return { nominales, cobro, ganancia: cobro.minus(monto) };
}

/**
 * Valor final estimado a partir de la TEM de emisión: 100 × (1 + TEM)^(meses).
 * Se usa solo cuando no hay valor oficial; la UI lo marca como estimado.
 */
export function valorFinalEstimado(temEmision: Num, diasEmisionAVencimiento: Num): Dec {
  return d(100).mul(d(1).plus(temEmision).pow(d(diasEmisionAVencimiento).div(30)));
}

/** VF implícito en un precio y una TEA publicados por una fuente: P × (1 + TEA)^(d/365). */
export function valorFinalImplicito(precio: Num, tea: Num, dias: Num): Dec {
  return d(precio).mul(d(1).plus(tea).pow(d(dias).div(DIAS_ANIO)));
}
