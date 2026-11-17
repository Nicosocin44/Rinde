import { d, CERO, DIAS_ANIO, UNO, type Dec, type Num } from "./decimal";
import { diasEntre, type FechaISO } from "./fechas";
import { resolverTasa } from "./raices";

/**
 * Rendimiento de una cartera.
 *
 * TWR (time-weighted): elimina el efecto de los aportes y retiros; sirve para comparar contra índices.
 * XIRR (money-weighted): el retorno anual de TU plata, teniendo en cuenta cuándo la pusiste.
 */

export type PuntoValuacion = {
  fecha: FechaISO;
  /** Valor de la cartera al cierre del día, ya incluido el flujo de ese día. */
  valor: Num;
  /** Flujo neto del día: aportes (+) y retiros (−). Se asume al inicio del día. */
  flujo: Num;
};

/**
 * TWR con flujos al inicio del día: r_t = V_t / (V_{t−1} + F_t) − 1; TWR = Π(1 + r_t) − 1.
 * El primer punto define la base (su flujo es el aporte inicial).
 * Ej.: 100 → 110 (sin flujos) → aporte de 50 y cierra en 168 → r1 = 10 %, r2 = 168/160 − 1 = 5 % → TWR 15,5 %.
 */
export function twr(puntos: PuntoValuacion[]): Dec | null {
  if (puntos.length < 2) return null;
  let acumulado = UNO;
  for (let i = 1; i < puntos.length; i++) {
    const anterior = d(puntos[i - 1]!.valor);
    const base = anterior.plus(puntos[i]!.flujo);
    if (base.lte(0)) continue; // sin capital expuesto en el subperíodo
    acumulado = acumulado.mul(d(puntos[i]!.valor).div(base));
  }
  return acumulado.minus(1);
}

/** Serie acumulada de TWR (para graficar contra un benchmark). Arranca en 0. */
export function serieTwr(puntos: PuntoValuacion[]): { fecha: FechaISO; acumulado: Dec }[] {
  const serie: { fecha: FechaISO; acumulado: Dec }[] = [];
  let acumulado = UNO;
  puntos.forEach((p, i) => {
    if (i > 0) {
      const base = d(puntos[i - 1]!.valor).plus(p.flujo);
      if (base.gt(0)) acumulado = acumulado.mul(d(p.valor).div(base));
    }
    serie.push({ fecha: p.fecha, acumulado: acumulado.minus(1) });
  });
  return serie;
}

export type FlujoFechado = {
  fecha: FechaISO;
  /** Aportes negativos, retiros y valor final positivos. */
  monto: Num;
};

/**
 * XIRR: resuelve Σ CF_i / (1 + r)^((d_i − d_0)/365) = 0.
 * Ej.: −1.000 hoy y +1.100 a 365 días → 10 %.
 * Devuelve null si no hay al menos un flujo positivo y uno negativo, o si no converge.
 */
export function xirr(flujos: FlujoFechado[]): Dec | null {
  const validos = flujos.filter((f) => !d(f.monto).isZero()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (validos.length < 2) return null;
  const hayPositivo = validos.some((f) => d(f.monto).gt(0));
  const hayNegativo = validos.some((f) => d(f.monto).lt(0));
  if (!hayPositivo || !hayNegativo) return null;
  const t0 = validos[0]!.fecha;
  const tiempos = validos.map((f) => d(diasEntre(t0, f.fecha)).div(DIAS_ANIO));
  const montos = validos.map((f) => d(f.monto));
  const vpn = (r: Dec): Dec => {
    let total = CERO;
    for (let i = 0; i < montos.length; i++) {
      total = total.plus(montos[i]!.div(UNO.plus(r).pow(tiempos[i]!)));
    }
    return total;
  };
  return resolverTasa(vpn, { semilla: 0.1, min: -0.9999, max: 1000 });
}

/** Anualiza un retorno acumulado en `dias` días: (1 + r)^(365/d) − 1. */
export function anualizar(retorno: Num, dias: number): Dec | null {
  if (dias <= 0) return null;
  const base = UNO.plus(retorno);
  if (base.lte(0)) return null;
  return base.pow(DIAS_ANIO.div(dias)).minus(1);
}
