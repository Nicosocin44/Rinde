import { d, CERO, UNO, type Dec, type Num } from "./decimal";

/**
 * Interés compuesto con aportes periódicos, metas y jubilación.
 * i = tasa por período; si el período es mensual, i = (1 + TEA)^(1/12) − 1.
 */

/** Tasa por período a partir de una TEA y la cantidad de períodos por año. */
export function tasaPorPeriodo(tea: Num, periodosPorAnio: number): Dec {
  return UNO.plus(tea).pow(UNO.div(periodosPorAnio)).minus(1);
}

/**
 * Valor futuro: VF = C0 × (1 + i)^n + A × [((1 + i)^n − 1) / i] × (1 + i × k),
 * con k = 1 si el aporte es al inicio del período y k = 0 si es al final.
 * Ej.: C0 = 1.000.000, A = 100.000 por mes, i = 2 % mensual, n = 12:
 *   aportes al final → 2.609.450,77; al inicio → 2.636.275,07.
 */
export function valorFuturo(capitalInicial: Num, aporte: Num, tasaPeriodo: Num, periodos: number, alInicio = false): Dec {
  const i = d(tasaPeriodo);
  const c0 = d(capitalInicial);
  const a = d(aporte);
  if (i.isZero()) return c0.plus(a.mul(periodos));
  const factor = UNO.plus(i).pow(periodos);
  const anualidad = factor.minus(1).div(i).mul(alInicio ? UNO.plus(i) : UNO);
  return c0.mul(factor).plus(a.mul(anualidad));
}

/**
 * Aporte por período necesario para llegar a una meta:
 * A = (VF_meta − C0 × (1 + i)^n) × i / [((1 + i)^n − 1) × (1 + i × k)].
 * Si el capital inicial ya alcanza, devuelve 0.
 */
export function aporteNecesario(meta: Num, capitalInicial: Num, tasaPeriodo: Num, periodos: number, alInicio = false): Dec {
  const i = d(tasaPeriodo);
  const c0 = d(capitalInicial);
  if (periodos <= 0) return CERO;
  if (i.isZero()) return maxCero(d(meta).minus(c0).div(periodos));
  const factor = UNO.plus(i).pow(periodos);
  const faltante = d(meta).minus(c0.mul(factor));
  const anualidad = factor.minus(1).div(i).mul(alInicio ? UNO.plus(i) : UNO);
  return maxCero(faltante.div(anualidad));
}

function maxCero(x: Dec): Dec {
  return x.lt(0) ? CERO : x;
}

export type PuntoProyeccion = {
  periodo: number;
  /** Capital inicial + aportes acumulados. */
  aportado: Dec;
  /** Intereses acumulados. */
  intereses: Dec;
  total: Dec;
};

/** Serie período a período para el gráfico apilado (aportes vs intereses). */
export function proyeccion(capitalInicial: Num, aporte: Num, tasaPeriodo: Num, periodos: number, alInicio = false): PuntoProyeccion[] {
  const i = d(tasaPeriodo);
  const a = d(aporte);
  let total = d(capitalInicial);
  let aportado = d(capitalInicial);
  const serie: PuntoProyeccion[] = [{ periodo: 0, aportado, intereses: CERO, total }];
  for (let p = 1; p <= periodos; p++) {
    if (alInicio) {
      total = total.plus(a).mul(UNO.plus(i));
    } else {
      total = total.mul(UNO.plus(i)).plus(a);
    }
    aportado = aportado.plus(a);
    serie.push({ periodo: p, aportado, intereses: total.minus(aportado), total });
  }
  return serie;
}

/** Descuenta un valor futuro por inflación: VF / (1 + π)^años. */
export function valorReal(valorNominal: Num, inflacionAnual: Num, anios: Num): Dec {
  return d(valorNominal).div(UNO.plus(inflacionAnual).pow(anios));
}

/**
 * Jubilación: capital necesario = gasto anual deseado / tasa de retiro.
 * Con la regla del 4 %: para gastar USD 12.000 por año hacen falta USD 300.000.
 */
export function capitalParaRetiro(gastoAnual: Num, tasaRetiro: Num): Dec {
  return d(gastoAnual).div(tasaRetiro);
}
