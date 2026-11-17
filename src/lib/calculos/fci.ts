import { d, DIAS_ANIO, type Dec, type Num } from "./decimal";

/**
 * FCI money market: rendimiento desde el valor de cuotaparte (VCP).
 * Con n días corridos entre las dos cuotapartes (usamos 7 para suavizar):
 *   TNA = (VCP_t / VCP_{t−n} − 1) × 365/n
 *   TEA = (VCP_t / VCP_{t−n})^(365/n) − 1
 * Ej.: VCP 1.250,00 → 1.255,50 en 7 días → TNA 22,94 %, TEA 25,74 %.
 */
export function rendimientoFci(vcpActual: Num, vcpAnterior: Num, dias: Num): { tna: Dec; tea: Dec; directo: Dec } | null {
  const n = d(dias);
  const antes = d(vcpAnterior);
  const ahora = d(vcpActual);
  if (n.lte(0) || antes.lte(0) || ahora.lte(0)) return null;
  const factor = ahora.div(antes);
  return {
    directo: factor.minus(1),
    tna: factor.minus(1).mul(DIAS_ANIO).div(n),
    tea: factor.pow(DIAS_ANIO.div(n)).minus(1),
  };
}
