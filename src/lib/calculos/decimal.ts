import Decimal from "decimal.js";

/**
 * Configuración única de decimal.js para todo el proyecto.
 * 20 dígitos significativos: un billón de pesos con 8 decimales exactos. Más precisión no cambia ningún
 * resultado visible y encarece mucho las potencias fraccionarias (medido: ~0,9 s de CPU en un celular).
 */
export const D = Decimal.clone({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });
export type Dec = InstanceType<typeof D>;
export type Num = Decimal.Value;

export const d = (x: Num): Dec => new D(x);
export const CERO = d(0);
export const UNO = d(1);
export const DIAS_ANIO = d(365);

/** true si el valor es un número finito (no NaN ni Infinity). */
export function esFinito(x: Dec): boolean {
  return x.isFinite() && !x.isNaN();
}

/** Convierte a number solo para mostrar o graficar. Nunca para seguir calculando plata. */
export function aNumero(x: Num): number {
  return d(x).toNumber();
}
