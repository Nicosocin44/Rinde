import { d, CERO, DIAS_ANIO, UNO, type Dec, type Num } from "./decimal";
import { diasEntre, type FechaISO } from "./fechas";
import { resolverTasa } from "./raices";

/**
 * Bonos con cronograma conocido (soberanos USD, ONs).
 * Los flujos se expresan por cada 100 de valor nominal ORIGINAL.
 */

export type FlujoBono = {
  fecha: FechaISO;
  /** Interés por 100 VN original. */
  cupon: Dec;
  /** Amortización por 100 VN original. */
  amortizacion: Dec;
};

export type TramoCupon = {
  /** Inicio del período de devengamiento del tramo (inclusive). */
  desde: FechaISO;
  /** Tasa nominal anual del tramo (fracción). */
  tasaAnual: number;
};

export type DefinicionBono = {
  ticker: string;
  /** Fechas de pago, en orden. */
  pagos: FechaISO[];
  /** Fecha desde la que devenga el primer cupón. */
  inicioDevengamiento: FechaISO;
  /** Tasa por tramo (step-up). */
  cupones: TramoCupon[];
  /** Amortización por fecha, en % del VN original. Las fechas que no figuran no amortizan. */
  amortizaciones: Record<FechaISO, number>;
  /** Pagos por año (2 = semestral). El cupón de cada período es tasa/frecuencia × residual (30/360). */
  frecuencia: number;
};

function tasaVigente(def: DefinicionBono, inicioPeriodo: FechaISO): number {
  let tasa = def.cupones[0]?.tasaAnual ?? 0;
  for (const tramo of def.cupones) {
    if (tramo.desde <= inicioPeriodo) tasa = tramo.tasaAnual;
  }
  return tasa;
}

/** Arma el cronograma completo (cupón + amortización por 100 VN original). */
export function cronograma(def: DefinicionBono): (FlujoBono & { residualAntes: Dec })[] {
  let residual = d(100);
  let inicio = def.inicioDevengamiento;
  return def.pagos.map((fecha) => {
    const tasa = tasaVigente(def, inicio);
    const cupon = residual.mul(tasa).div(def.frecuencia);
    const amortizacion = d(def.amortizaciones[fecha] ?? 0);
    const fila = { fecha, cupon, amortizacion, residualAntes: residual };
    residual = residual.minus(amortizacion);
    inicio = fecha;
    return fila;
  });
}

/** Flujos posteriores a la fecha de liquidación. */
export function flujosFuturos(def: DefinicionBono, liquidacion: FechaISO): FlujoBono[] {
  return cronograma(def).filter((f) => f.fecha > liquidacion);
}

/** Valor residual (por 100 VN original) a una fecha. */
export function valorResidual(def: DefinicionBono, fecha: FechaISO): Dec {
  let residual = d(100);
  for (const [f, pct] of Object.entries(def.amortizaciones)) {
    if (f <= fecha) residual = residual.minus(pct);
  }
  return residual;
}

/** Intereses corridos (por 100 VN original), base 30/360 simplificada a días/360 dentro del período. */
export function interesesCorridos(def: DefinicionBono, liquidacion: FechaISO): Dec {
  let inicio = def.inicioDevengamiento;
  for (const fecha of def.pagos) {
    if (fecha > liquidacion) {
      const tasa = tasaVigente(def, inicio);
      const diasPeriodo = diasEntre(inicio, fecha);
      const diasCorridos = Math.max(0, diasEntre(inicio, liquidacion));
      if (diasPeriodo <= 0) return CERO;
      const cuponPeriodo = valorResidual(def, liquidacion).mul(tasa).div(def.frecuencia);
      return cuponPeriodo.mul(diasCorridos).div(diasPeriodo);
    }
    inicio = fecha;
  }
  return CERO;
}

/** Valor técnico = valor residual + intereses corridos. */
export function valorTecnico(def: DefinicionBono, liquidacion: FechaISO): Dec {
  return valorResidual(def, liquidacion).plus(interesesCorridos(def, liquidacion));
}

function valorPresente(flujos: FlujoBono[], liquidacion: FechaISO, y: Dec): Dec {
  let pv = CERO;
  for (const f of flujos) {
    const t = d(diasEntre(liquidacion, f.fecha)).div(DIAS_ANIO);
    pv = pv.plus(f.cupon.plus(f.amortizacion).div(UNO.plus(y).pow(t)));
  }
  return pv;
}

export type MetricasBono = {
  /** TIR efectiva anual. */
  tir: Dec;
  /** Duration de Macaulay, en años. */
  duration: Dec;
  /** Duration modificada. */
  durationModificada: Dec;
  valorTecnico: Dec;
  /** Precio / valor técnico. */
  paridad: Dec;
  residual: Dec;
  proximoPago: FlujoBono | null;
};

/**
 * TIR, duration y paridad a partir del precio sucio (por 100 VN original).
 * TIR: resuelve P = Σ CF_i / (1 + y)^(t_i), con t_i en años act/365 desde la liquidación.
 * Ej.: bono bullet a 2 años, cupón anual 10 %, precio 100 → TIR 10 %, duration 1,909.
 */
export function metricasBono(def: DefinicionBono, precioSucio: Num, liquidacion: FechaISO): MetricasBono | null {
  const flujos = flujosFuturos(def, liquidacion);
  const precio = d(precioSucio);
  if (flujos.length === 0 || precio.lte(0)) return null;
  const tir = resolverTasa((y) => valorPresente(flujos, liquidacion, y).minus(precio), { semilla: 0.1, min: -0.9, max: 5 });
  if (!tir) return null;
  let ponderado = CERO;
  for (const f of flujos) {
    const t = d(diasEntre(liquidacion, f.fecha)).div(DIAS_ANIO);
    ponderado = ponderado.plus(t.mul(f.cupon.plus(f.amortizacion).div(UNO.plus(tir).pow(t))));
  }
  const duration = ponderado.div(precio);
  const vt = valorTecnico(def, liquidacion);
  return {
    tir,
    duration,
    durationModificada: duration.div(UNO.plus(tir)),
    valorTecnico: vt,
    paridad: precio.div(vt),
    residual: valorResidual(def, liquidacion),
    proximoPago: flujos[0] ?? null,
  };
}

export type CobroBono = { fecha: FechaISO; cupon: Dec; amortizacion: Dec; total: Dec };

/**
 * Calculadora de flujos: con un monto y un precio (por 100 VN) devuelve los nominales comprados
 * y el cronograma de cobros en la moneda del bono.
 */
export function calculadoraFlujos(
  def: DefinicionBono,
  monto: Num,
  precio: Num,
  liquidacion: FechaISO,
): { nominales: Dec; cobros: CobroBono[]; totalCobrado: Dec } {
  const nominales = d(monto).div(precio).mul(100);
  const cobros = flujosFuturos(def, liquidacion).map((f) => {
    const cupon = f.cupon.mul(nominales).div(100);
    const amortizacion = f.amortizacion.mul(nominales).div(100);
    return { fecha: f.fecha, cupon, amortizacion, total: cupon.plus(amortizacion) };
  });
  const totalCobrado = cobros.reduce((acc, c) => acc.plus(c.total), CERO);
  return { nominales, cobros, totalCobrado };
}
