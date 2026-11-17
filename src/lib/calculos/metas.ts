import { d, CERO, UNO, DIAS_ANIO, type Dec, type Num } from "./decimal";
import { diasEntre, type FechaISO } from "./fechas";
import { tasaPorPeriodo, valorFuturo } from "./interes-compuesto";

/**
 * Metas de ahorro ("un auto", "un viaje de US$ 800").
 *
 * Cada meta junta plata en uno o varios instrumentos (una billetera, un plazo fijo, una LECAP, dólares…).
 * La persona va cargando lo que pone o saca de cada uno; nosotros estimamos cuánto vale hoy cada parte con la
 * TEA que tenía cuando la puso, y ella puede corregir el valor real cuando quiera (lo que le muestra su app).
 * Con ese saldo calculamos el plan: cuánto poner por mes para llegar en fecha y en qué mes llega.
 *
 * Supuestos (los mismos para todo el módulo):
 *  - Lo que ya está invertido sigue rindiendo a su TEA (promedio ponderado por valor); se asume que se renueva.
 *  - Lo que se ponga de acá en adelante rinde la TEA del plan (la mejor opción sin plazo de hoy, o la que elija).
 *  - Los aportes futuros son al final de cada mes, por un monto fijo.
 *  - Una meta en pesos se piensa en precios de hoy: el objetivo sube con la inflación esperada π (mensual),
 *    así "un auto de $ 20 M" no se abarata solo con el tiempo. Una meta en dólares no se ajusta.
 */

export type InstrumentoMeta = {
  /** Id de la opción del comparador, o uno propio ("efectivo", "dolares", "otro-…"). */
  id: string;
  nombre: string;
  /** Tipo de opción en pesos, o "efectivo" / "dolares" / "otro". */
  tipo: string;
  /** TEA como fracción, la del día en que se cargó. */
  tea: number;
};

/** Plata que entra (monto > 0) o sale (monto < 0) de un instrumento de la meta. */
export type AporteMeta = {
  id: string;
  fecha: FechaISO;
  monto: number;
  instrumento: InstrumentoMeta;
  /** Momento en que se cargó (ISO). Ordena los movimientos de un mismo día. */
  cargado?: string;
};

/** "Hoy en este instrumento tengo $ X": corrige la estimación con el valor real. */
export type AjusteMeta = { id: string; fecha: FechaISO; instrumentoId: string; valor: number; cargado?: string };

export type Meta = {
  id: string;
  nombre: string;
  moneda: "ARS" | "USD";
  /** Monto objetivo en la moneda de la meta, a precios del día en que se creó. */
  objetivo: number;
  fechaObjetivo: FechaISO;
  /** Lo que la persona dijo que puede poner por mes. */
  aporteMensual: number;
  /** TEA del plan elegida por la persona; null = la mejor opción de hoy (pesos) o 0 (dólares). */
  teaManual: number | null;
  creada: FechaISO;
  aportes: AporteMeta[];
  ajustes: AjusteMeta[];
};

/** Cada cuántos días se pide volver a cargar ("¿cuánto pusiste este mes?"). */
export const DIAS_ENTRE_CONTROLES = 30;

/** Tope de la búsqueda de "en cuántos meses llegás": 50 años. Más que eso se muestra como "no llegás". */
export const MESES_MAXIMOS = 600;

/** Diferencia mínima de TEA para comparar lo de la persona con la mejor opción de hoy (1 punto). */
export const DIFERENCIA_MINIMA_TEA = 0.01;

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

/** Lo que vale `valor` después de `dias` a una TEA: valor × (1 + TEA)^(días / 365). */
export function crecer(valor: Num, tea: Num, dias: number): Dec {
  if (dias <= 0) return d(valor);
  return d(valor).mul(UNO.plus(tea).pow(d(dias).div(DIAS_ANIO)));
}

/** Objetivo ajustado por inflación después de `meses`: objetivo × (1 + π)^meses. */
export function objetivoAjustado(objetivo: Num, inflacionMensual: Num, meses: number): Dec {
  return d(objetivo).mul(UNO.plus(inflacionMensual).pow(meses));
}

/**
 * Cuánto hay que poner por mes, desde hoy, para llegar en `meses`:
 * A = (objetivo × (1 + π)^n − saldo × (1 + i_saldo)^n) / anualidad(i_aporte, n), con anualidad = ((1 + i)^n − 1) / i.
 * Si lo que ya está invertido alcanza, devuelve 0.
 */
export function aporteParaLlegar(objetivo: Num, saldo: Num, tasaSaldo: Num, inflacionMensual: Num, meses: number, tasaAporte: Num = tasaSaldo): Dec {
  if (meses <= 0) return CERO;
  const faltante = objetivoAjustado(objetivo, inflacionMensual, meses).minus(d(saldo).mul(UNO.plus(tasaSaldo).pow(meses)));
  if (faltante.lte(0)) return CERO;
  const i = d(tasaAporte);
  const anualidad = i.isZero() ? d(meses) : UNO.plus(i).pow(meses).minus(1).div(i);
  return faltante.div(anualidad);
}

/**
 * En cuántos meses llegás poniendo `aporte` por mes. Se simula mes a mes porque el objetivo se mueve con la inflación
 * y lo invertido y lo nuevo pueden rendir distinto. 0 = ya llegaste. null = no llegás en 50 años.
 */
export function mesesParaLlegar(objetivo: Num, saldo: Num, aporte: Num, tasaSaldo: Num, inflacionMensual: Num = 0, tasaAporte: Num = tasaSaldo): number | null {
  const iS = UNO.plus(tasaSaldo);
  const iA = UNO.plus(tasaAporte);
  const pi = UNO.plus(inflacionMensual);
  const a = d(aporte);
  let invertido = d(saldo);
  let nuevo = CERO;
  let meta = d(objetivo);
  if (invertido.gte(meta)) return 0;
  for (let n = 1; n <= MESES_MAXIMOS; n++) {
    invertido = invertido.mul(iS);
    nuevo = nuevo.mul(iA).plus(a);
    meta = meta.mul(pi);
    if (invertido.plus(nuevo).gte(meta)) return n;
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

export type Tenencia = {
  instrumento: InstrumentoMeta;
  /** Lo que la persona puso menos lo que sacó. */
  aportado: number;
  /** Valor estimado hoy (o el último valor real que cargó, crecido hasta hoy). */
  valor: number;
  ganancia: number;
  /** Fecha del último movimiento o ajuste de este instrumento. */
  ultimaFecha: FechaISO;
  /** true si el valor sale de un ajuste real cargado hoy. */
  valorReal: boolean;
};

/**
 * Cuánto vale hoy la plata de la meta en cada instrumento. Recorre en orden los aportes y ajustes de cada uno:
 * entre evento y evento el valor crece a la TEA vigente (la del último aporte), un aporte suma, un ajuste
 * reemplaza el valor por el real. Nunca queda negativo.
 */
export function tenencias(meta: Pick<Meta, "aportes" | "ajustes">, hoy: FechaISO): Tenencia[] {
  // Orden: por fecha y, dentro del mismo día, en el orden en que se cargaron.
  type Evento = { fecha: FechaISO; cargado: string; orden: number; aporte?: AporteMeta; ajuste?: AjusteMeta };
  const porInstrumento = new Map<string, Evento[]>();
  meta.aportes.forEach((a, orden) => {
    const eventos = porInstrumento.get(a.instrumento.id) ?? [];
    eventos.push({ fecha: a.fecha, cargado: a.cargado ?? "", orden, aporte: a });
    porInstrumento.set(a.instrumento.id, eventos);
  });
  // Un ajuste de un instrumento sin aportes no tiene a qué aplicarse: se ignora.
  meta.ajustes.forEach((j, orden) => porInstrumento.get(j.instrumentoId)?.push({ fecha: j.fecha, cargado: j.cargado ?? "", orden: 100_000 + orden, ajuste: j }));

  const resultado: Tenencia[] = [];
  for (const eventos of porInstrumento.values()) {
    eventos.sort((x, y) => x.fecha.localeCompare(y.fecha) || x.cargado.localeCompare(y.cargado) || x.orden - y.orden);
    let valor = CERO;
    let aportado = CERO;
    let tea = 0;
    let fecha = eventos[0]!.fecha;
    let instrumento = eventos.find((e) => e.aporte)!.aporte!.instrumento;
    for (const e of eventos) {
      valor = crecer(valor, tea, diasEntre(fecha, e.fecha));
      fecha = e.fecha;
      if (e.aporte) {
        valor = valor.plus(e.aporte.monto);
        aportado = aportado.plus(e.aporte.monto);
        if (e.aporte.monto > 0) {
          tea = e.aporte.instrumento.tea;
          instrumento = e.aporte.instrumento;
        }
      } else if (e.ajuste) {
        valor = d(e.ajuste.valor);
      }
      if (valor.lt(0)) valor = CERO;
    }
    const ultimo = eventos.at(-1)!;
    const hasta = hoy > fecha ? hoy : fecha;
    valor = crecer(valor, tea, diasEntre(fecha, hasta));
    resultado.push({
      instrumento,
      aportado: aportado.toNumber(),
      valor: valor.toNumber(),
      ganancia: valor.minus(aportado).toNumber(),
      ultimaFecha: ultimo.fecha,
      valorReal: Boolean(ultimo.ajuste) && ultimo.fecha === hoy,
    });
  }
  return resultado.filter((t) => t.valor > 0 || t.aportado !== 0).sort((a, b) => b.valor - a.valor);
}

/** TEA promedio de lo invertido, ponderada por valor. 0 si no hay nada. */
export function teaPromedio(lista: Tenencia[]): number {
  const total = lista.reduce((s, t) => s.plus(t.valor), CERO);
  if (total.lte(0)) return 0;
  return lista.reduce((s, t) => s.plus(d(t.valor).mul(t.instrumento.tea)), CERO).div(total).toNumber();
}

export type ContextoMeta = {
  /** TEA de referencia de hoy (la mejor opción sin plazo en pesos). */
  teaReferencia: number;
  /** Inflación mensual esperada (REM). Solo se aplica a metas en pesos. */
  inflacionMensual: number;
};

export type EstadoMeta = {
  tenencias: Tenencia[];
  /** Valor estimado hoy de todo lo que hay en la meta. */
  saldo: number;
  /** Lo que la persona puso, neto de retiros. */
  aportado: number;
  /** Lo que generaron los instrumentos (saldo − aportado). */
  ganancia: number;
  /** TEA promedio de lo que ya está invertido. */
  teaSaldo: number;
  /** TEA que se supone para lo que ponga de acá en adelante. */
  teaPlan: number;
  /** Objetivo ajustado a hoy (sube con la inflación en las metas en pesos). */
  objetivoHoy: number;
  /** Objetivo ajustado a la fecha de la meta. */
  objetivoFinal: number;
  avance: number;
  /** Dónde "tendría que estar" hoy según el plan con el que arrancó (lo que tenía + el aporte declarado, a la TEA del plan). */
  esperadoHoy: number;
  /** saldo − esperado: positivo = adelantado. */
  diferencia: number;
  /** Meses desde hoy hasta la fecha de la meta. */
  mesesRestantes: number;
  /** Lo que hay que poner por mes desde ahora para llegar en fecha. */
  aporteNecesario: number;
  /** Con el aporte declarado, en cuántos meses desde hoy llega. null = no llega. */
  mesesConTuAporte: number | null;
  llegaEnFecha: boolean;
  cumplida: boolean;
  /** Días desde el último movimiento o ajuste, y si ya toca volver a cargar. */
  diasDesdeMovimiento: number;
  controlPendiente: boolean;
  /**
   * Comparación neutral: si la mejor opción sin plazo de hoy rinde al menos 1 punto más que el promedio de lo
   * invertido, cuánto más por mes daría ese mismo saldo. Solo metas en pesos con el plan en "lo mejor de hoy".
   */
  comparacion: { teaReferencia: number; extraPorMes: number } | null;
};

/** Junta todo lo que la pantalla necesita de una meta, con las tasas e inflación de hoy. */
export function evaluarMeta(meta: Meta, contexto: ContextoMeta, hoy: FechaISO): EstadoMeta {
  const lista = tenencias(meta, hoy);
  const saldo = lista.reduce((s, t) => s.plus(t.valor), CERO);
  const aportado = lista.reduce((s, t) => s.plus(t.aportado), CERO);
  const teaSaldo = teaPromedio(lista);
  const teaPlan = meta.teaManual ?? (meta.moneda === "ARS" ? contexto.teaReferencia : 0);
  const iSaldo = tasaPorPeriodo(teaSaldo, 12);
  const iPlan = tasaPorPeriodo(teaPlan, 12);
  const pi = meta.moneda === "ARS" ? contexto.inflacionMensual : 0;

  const totalMeses = mesesEntre(meta.creada, meta.fechaObjetivo);
  const desdeInicio = Math.min(mesesEntre(meta.creada, hoy), totalMeses);
  const mesesRestantes = mesesEntre(hoy, meta.fechaObjetivo);

  // La inflación se aplica por días (meses con decimales); el plan, por meses enteros de aporte.
  const objetivoHoy = objetivoAjustado(meta.objetivo, pi, mesesFraccion(meta.creada, hoy));
  const objetivoFinal = objetivoAjustado(meta.objetivo, pi, totalMeses);
  const inicial = meta.aportes.filter((a) => a.fecha <= meta.creada).reduce((s, a) => s.plus(a.monto), CERO);
  const esperadoHoy = valorFuturo(inicial, meta.aporteMensual, iPlan, desdeInicio, false);

  const aporte = aporteParaLlegar(objetivoHoy, saldo, iSaldo, pi, mesesRestantes, iPlan);
  const mesesConTuAporte = mesesParaLlegar(objetivoHoy, saldo, meta.aporteMensual, iSaldo, pi, iPlan);
  const cumplida = saldo.gt(0) && saldo.gte(objetivoHoy);

  const fechas = [meta.creada, ...meta.aportes.map((a) => a.fecha), ...meta.ajustes.map((j) => j.fecha)].sort();
  const diasDesdeMovimiento = Math.max(0, diasEntre(fechas.at(-1)!, hoy));

  const extra = d(saldo).mul(tasaPorPeriodo(contexto.teaReferencia, 12).minus(iSaldo));
  const comparacion =
    meta.moneda === "ARS" && meta.teaManual === null && saldo.gt(0) && contexto.teaReferencia - teaSaldo >= DIFERENCIA_MINIMA_TEA
      ? { teaReferencia: contexto.teaReferencia, extraPorMes: extra.toNumber() }
      : null;

  return {
    tenencias: lista,
    saldo: saldo.toNumber(),
    aportado: aportado.toNumber(),
    ganancia: saldo.minus(aportado).toNumber(),
    teaSaldo,
    teaPlan,
    objetivoHoy: objetivoHoy.toNumber(),
    objetivoFinal: objetivoFinal.toNumber(),
    avance: avance(saldo, objetivoHoy),
    esperadoHoy: esperadoHoy.toNumber(),
    diferencia: saldo.minus(esperadoHoy).toNumber(),
    mesesRestantes,
    aporteNecesario: aporte.toNumber(),
    mesesConTuAporte,
    llegaEnFecha: cumplida || (mesesConTuAporte !== null && mesesConTuAporte <= mesesRestantes),
    cumplida,
    diasDesdeMovimiento,
    controlPendiente: !cumplida && diasDesdeMovimiento >= DIAS_ENTRE_CONTROLES,
    comparacion,
  };
}
