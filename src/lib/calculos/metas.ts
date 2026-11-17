import { d, CERO, UNO, type Dec, type Num } from "./decimal";
import { diasEntre, type FechaISO } from "./fechas";
import { aporteNecesario, tasaPorPeriodo, valorFuturo } from "./interes-compuesto";

/**
 * Metas de ahorro ("un auto", "un viaje de US$ 800"): cuánto poner por mes para llegar a una fecha,
 * en cuánto tiempo llegás con lo que ponés, y cómo vas contra el plan en cada control mensual.
 *
 * Supuestos (los mismos para todo el módulo):
 *  - Los aportes se hacen al final de cada mes y rinden a una tasa mensual i = (1 + TEA)^(1/12) − 1.
 *  - Una meta en pesos se piensa en precios de hoy: el objetivo sube con la inflación esperada π (mensual),
 *    así "un auto de $ 20 M" no se abarata solo con el tiempo. Una meta en dólares no se ajusta.
 */

export type ControlMeta = {
  fecha: FechaISO;
  /** Cuánto tenía juntado la persona ese día, en la moneda de la meta. */
  saldo: number;
};

export type Meta = {
  id: string;
  nombre: string;
  moneda: "ARS" | "USD";
  /** Monto objetivo en la moneda de la meta, a precios del día en que se creó. */
  objetivo: number;
  fechaObjetivo: FechaISO;
  /** Lo que la persona dijo que puede poner por mes. */
  aporteMensual: number;
  /** Rendimiento anual (TEA) que eligió la persona; null = la mejor opción de hoy (pesos) o 0 (dólares). */
  teaManual: number | null;
  creada: FechaISO;
  /** El primero es el saldo con el que arrancó. Siempre hay al menos uno. */
  controles: ControlMeta[];
};

/** Cada cuántos días se pide un control ("volvé y cargá cuánto tenés"). */
export const DIAS_ENTRE_CONTROLES = 30;

/** Tope de la búsqueda de "en cuántos meses llegás": 50 años. Más que eso se muestra como "no llegás". */
export const MESES_MAXIMOS = 600;

/** Meses calendario completos entre dos fechas (del 15/01 al 14/03 es 1; al 15/03, 2). Nunca negativo. */
export function mesesEntre(desde: FechaISO, hasta: FechaISO): number {
  const [y1, m1, d1] = desde.slice(0, 10).split("-").map(Number);
  const [y2, m2, d2] = hasta.slice(0, 10).split("-").map(Number);
  const meses = (y2! - y1!) * 12 + (m2! - m1!) - (d2! < d1! ? 1 : 0);
  return Math.max(0, meses);
}

/** Meses con decimales entre dos fechas (días / 30,4167), para ajustar por inflación sin saltos de un mes entero. */
export function mesesFraccion(desde: FechaISO, hasta: FechaISO): number {
  return Math.max(0, diasEntre(desde, hasta)) / (365 / 12);
}

/** Objetivo ajustado por inflación después de `meses`: objetivo × (1 + π)^meses. */
export function objetivoAjustado(objetivo: Num, inflacionMensual: Num, meses: number): Dec {
  return d(objetivo).mul(UNO.plus(inflacionMensual).pow(meses));
}

/** Cuánto hay que poner por mes, desde hoy, para llegar en `meses` (con el objetivo ajustado a esa fecha). */
export function aporteParaLlegar(objetivo: Num, saldo: Num, tasaMensual: Num, inflacionMensual: Num, meses: number): Dec {
  if (meses <= 0) return CERO;
  return aporteNecesario(objetivoAjustado(objetivo, inflacionMensual, meses), saldo, tasaMensual, meses, false);
}

/**
 * En cuántos meses llegás poniendo `aporte` por mes. Se simula mes a mes porque el objetivo se mueve con la inflación.
 * 0 = ya llegaste. null = no llegás en 50 años (por ejemplo, si la inflación le gana a lo que ponés).
 */
export function mesesParaLlegar(objetivo: Num, saldo: Num, aporte: Num, tasaMensual: Num, inflacionMensual: Num = 0): number | null {
  const i = UNO.plus(tasaMensual);
  const pi = UNO.plus(inflacionMensual);
  const a = d(aporte);
  let total = d(saldo);
  let meta = d(objetivo);
  if (total.gte(meta)) return 0;
  for (let n = 1; n <= MESES_MAXIMOS; n++) {
    total = total.mul(i).plus(a);
    meta = meta.mul(pi);
    if (total.gte(meta)) return n;
  }
  return null;
}

/** Avance contra el objetivo (0 a 1). */
export function avance(saldo: Num, objetivo: Num): number {
  const o = d(objetivo);
  if (o.lte(0)) return 1;
  const x = d(saldo).div(o).toNumber();
  return Math.min(1, Math.max(0, x));
}

export type ContextoMeta = {
  /** TEA de referencia de hoy (la mejor opción en pesos, o 0 para dólares). */
  teaReferencia: number;
  /** Inflación mensual esperada (REM). Solo se aplica a metas en pesos. */
  inflacionMensual: number;
};

export type EstadoMeta = {
  /** Saldo del último control. */
  saldo: number;
  /** Objetivo ajustado a hoy (sube con la inflación en las metas en pesos). */
  objetivoHoy: number;
  /** Objetivo ajustado a la fecha de la meta. */
  objetivoFinal: number;
  avance: number;
  /** Dónde "tendría que estar" hoy según el plan con el que arrancó (aporte declarado y tasa de hoy). */
  esperadoHoy: number;
  /** saldo − esperado: positivo = adelantado. */
  diferencia: number;
  /** Meses desde el último control hasta la fecha de la meta. */
  mesesRestantes: number;
  /** Lo que hay que poner por mes desde ahora para llegar en fecha. */
  aporteNecesario: number;
  /** Con el aporte declarado, en cuántos meses (desde el último control) llega. null = no llega. */
  mesesConTuAporte: number | null;
  llegaEnFecha: boolean;
  cumplida: boolean;
  tea: number;
  /** Días desde el último control y si ya toca cargar uno nuevo. */
  diasDesdeControl: number;
  controlPendiente: boolean;
};

/** Junta todo lo que la pantalla necesita de una meta, con las tasas e inflación de hoy. */
export function evaluarMeta(meta: Meta, contexto: ContextoMeta, hoy: FechaISO): EstadoMeta {
  const primero = meta.controles[0] ?? { fecha: meta.creada, saldo: 0 };
  const ultimo = meta.controles.at(-1) ?? primero;
  const tea = meta.teaManual ?? (meta.moneda === "ARS" ? contexto.teaReferencia : 0);
  const i = tasaPorPeriodo(tea, 12);
  const pi = meta.moneda === "ARS" ? contexto.inflacionMensual : 0;

  const desdeInicio = mesesEntre(meta.creada, hoy);
  const desdeControl = mesesEntre(ultimo.fecha, meta.fechaObjetivo);
  const totalMeses = mesesEntre(meta.creada, meta.fechaObjetivo);

  // La inflación se aplica por días (meses con decimales); el plan, por meses enteros de aporte.
  const objetivoHoy = objetivoAjustado(meta.objetivo, pi, mesesFraccion(meta.creada, hoy));
  const objetivoFinal = objetivoAjustado(meta.objetivo, pi, totalMeses);
  const esperadoHoy = valorFuturo(primero.saldo, meta.aporteMensual, i, Math.min(desdeInicio, totalMeses), false);

  // El plan se recalcula desde el último control, contra el objetivo ya ajustado a esa fecha.
  const objetivoEnControl = objetivoAjustado(meta.objetivo, pi, mesesFraccion(meta.creada, ultimo.fecha));
  const aporte = aporteParaLlegar(objetivoEnControl, ultimo.saldo, i, pi, desdeControl);
  const mesesConTuAporte = mesesParaLlegar(objetivoEnControl, ultimo.saldo, meta.aporteMensual, i, pi);
  const cumplida = d(ultimo.saldo).gte(objetivoHoy);
  const diasDesdeControl = Math.max(0, diasEntre(ultimo.fecha, hoy));

  return {
    saldo: ultimo.saldo,
    objetivoHoy: objetivoHoy.toNumber(),
    objetivoFinal: objetivoFinal.toNumber(),
    avance: avance(ultimo.saldo, objetivoHoy),
    esperadoHoy: esperadoHoy.toNumber(),
    diferencia: d(ultimo.saldo).minus(esperadoHoy).toNumber(),
    mesesRestantes: desdeControl,
    aporteNecesario: aporte.toNumber(),
    mesesConTuAporte,
    llegaEnFecha: cumplida || (mesesConTuAporte !== null && mesesConTuAporte <= desdeControl),
    cumplida,
    tea,
    diasDesdeControl,
    controlPendiente: !cumplida && diasDesdeControl >= DIAS_ENTRE_CONTROLES,
  };
}
