import { d, CERO, DIAS_ANIO, UNO, type Dec, type Num } from "./decimal";
import { diasEntre, type FechaISO } from "./fechas";
import { twr, xirr, type FlujoFechado, type PuntoValuacion } from "./rendimiento";

/**
 * Cartera: las posiciones se DERIVAN de los movimientos (no hay tabla de posiciones).
 * Costo: promedio ponderado. Las comisiones suman al costo en compras y restan del producido en ventas.
 */

export type TipoActivo =
  | "billetera"
  | "plazo_fijo"
  | "fci"
  | "lecap"
  | "bono"
  | "on"
  | "cedear"
  | "accion"
  | "cripto"
  | "efectivo_usd";

export type Moneda = "ARS" | "USD";

export type TipoMovimiento = "compra" | "venta" | "deposito" | "retiro" | "cupon" | "dividendo" | "interes";

export type Activo = {
  /** Clave estable: "cedear:AAPL", "billetera:mercadopago", "efectivo_usd:colchon". */
  id: string;
  tipo: TipoActivo;
  nombre: string;
  ticker?: string;
  /** Moneda en la que se registran el precio y los movimientos. */
  moneda: Moneda;
  proveedorId?: string;
  /** TNA pactada (plazo fijo) o informada por el usuario (billetera), como fracción. */
  tna?: number;
  inicio?: FechaISO;
  vencimiento?: FechaISO;
};

export type Movimiento = {
  id: string;
  activoId: string;
  fecha: FechaISO;
  tipo: TipoMovimiento;
  /** Unidades (acciones, nominales, monedas). En cuentas y cobros (cupón, dividendo, interés) es el monto. */
  cantidad: string;
  /** Precio por unidad en la moneda del activo. Letras, bonos y ONs: por cada 100 nominales. Cuentas: "1". */
  precio: string;
  /** Comisión total en la moneda del activo. */
  comision?: string;
  nota?: string;
};

/** Los precios de letras, bonos y ONs se expresan por cada 100 nominales. */
export function divisorPrecio(tipo: TipoActivo): number {
  return tipo === "lecap" || tipo === "bono" || tipo === "on" ? 100 : 1;
}

/** Activos tipo cuenta: su precio no viene del mercado sino de su tasa (o vale 1). */
export function esCuenta(tipo: TipoActivo): boolean {
  return tipo === "billetera" || tipo === "efectivo_usd" || tipo === "plazo_fijo" || tipo === "fci";
}

/**
 * Importe bruto de un movimiento en la moneda del activo.
 * En cupones, dividendos e intereses la cantidad ya es el monto cobrado (no se divide por 100).
 */
export function importe(mov: Movimiento, tipo: TipoActivo): Dec {
  const esCobro = mov.tipo === "cupon" || mov.tipo === "dividendo" || mov.tipo === "interes";
  return d(mov.cantidad).mul(mov.precio).div(esCobro ? 1 : divisorPrecio(tipo));
}

/**
 * Flujo externo de un movimiento, visto desde la cartera, en la moneda del activo:
 *   compra / depósito → entra plata (+importe + comisión)
 *   venta / retiro    → sale plata (−(importe − comisión))
 *   cupón / dividendo → sale plata (se cobra fuera de la posición)
 *   interés           → no es un flujo: es rendimiento que queda en la cuenta
 */
export function flujoExterno(mov: Movimiento, tipo: TipoActivo): Dec {
  const bruto = importe(mov, tipo);
  const comision = d(mov.comision ?? 0);
  switch (mov.tipo) {
    case "compra":
    case "deposito":
      return bruto.plus(comision);
    case "venta":
    case "retiro":
      return bruto.minus(comision).neg();
    case "cupon":
    case "dividendo":
      return bruto.neg();
    case "interes":
      return CERO;
  }
}

export type Posicion = {
  activoId: string;
  cantidad: Dec;
  /** Costo total de lo que queda en cartera (moneda del activo). */
  costoTotal: Dec;
  /** Costo promedio ponderado por unidad, en la misma escala que el precio. */
  costoPromedio: Dec;
  /** Resultado realizado por ventas (moneda del activo), neto de comisiones. */
  realizado: Dec;
  /** Cupones, dividendos e intereses cobrados (moneda del activo). */
  ingresos: Dec;
};

/**
 * Deriva las posiciones a una fecha (inclusive). Los movimientos se procesan en orden cronológico;
 * dentro de un mismo día, las entradas antes que las salidas.
 */
export function derivarPosiciones(
  movimientos: Movimiento[],
  activos: ReadonlyMap<string, Activo>,
  hasta?: FechaISO,
): Map<string, Posicion> {
  const orden: Record<TipoMovimiento, number> = { deposito: 0, compra: 1, interes: 2, cupon: 3, dividendo: 4, venta: 5, retiro: 6 };
  const ordenados = movimientos
    .filter((m) => !hasta || m.fecha <= hasta)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || orden[a.tipo] - orden[b.tipo]);

  const posiciones = new Map<string, Posicion>();
  for (const mov of ordenados) {
    const activo = activos.get(mov.activoId);
    if (!activo) continue;
    const divisor = divisorPrecio(activo.tipo);
    const pos =
      posiciones.get(mov.activoId) ??
      ({ activoId: mov.activoId, cantidad: CERO, costoTotal: CERO, costoPromedio: CERO, realizado: CERO, ingresos: CERO } satisfies Posicion);
    const cantidad = d(mov.cantidad);
    const bruto = importe(mov, activo.tipo);
    const comision = d(mov.comision ?? 0);

    switch (mov.tipo) {
      case "compra":
      case "deposito":
        pos.cantidad = pos.cantidad.plus(cantidad);
        pos.costoTotal = pos.costoTotal.plus(bruto).plus(comision);
        break;
      case "venta":
      case "retiro": {
        const vendida = cantidad.gt(pos.cantidad) ? pos.cantidad : cantidad;
        const costoVendido = pos.cantidad.isZero() ? CERO : pos.costoTotal.mul(vendida).div(pos.cantidad);
        const producido = vendida.mul(mov.precio).div(divisor).minus(comision);
        pos.realizado = pos.realizado.plus(producido.minus(costoVendido));
        pos.cantidad = pos.cantidad.minus(vendida);
        pos.costoTotal = pos.costoTotal.minus(costoVendido);
        break;
      }
      case "interes":
        // Queda en la cuenta: sube el saldo sin sumar costo.
        pos.cantidad = pos.cantidad.plus(cantidad);
        pos.ingresos = pos.ingresos.plus(bruto);
        break;
      case "cupon":
      case "dividendo":
        pos.ingresos = pos.ingresos.plus(bruto);
        pos.realizado = pos.realizado.plus(bruto);
        break;
    }
    pos.costoPromedio = pos.cantidad.isZero() ? CERO : pos.costoTotal.div(pos.cantidad).mul(divisor);
    posiciones.set(mov.activoId, pos);
  }
  return posiciones;
}

/**
 * Precio de una cuenta a una fecha (funciona como una "cuotaparte" que arranca en 1 el día de inicio):
 *  - plazo fijo: interés simple hasta el vencimiento, 1 + TNA × días/365;
 *  - billetera o fondo con TNA informada: capitalización diaria, (1 + TNA/365)^días (estimación);
 *  - sin tasa, o efectivo: 1.
 * Un depósito de $X en la fecha f compra X / precio(f) unidades.
 */
export function precioCuenta(activo: Activo, fecha: FechaISO): Dec {
  if (!activo.tna || !activo.inicio) return UNO;
  if (activo.tipo === "plazo_fijo") {
    const tope = activo.vencimiento && fecha > activo.vencimiento ? activo.vencimiento : fecha;
    const dias = Math.max(0, diasEntre(activo.inicio, tope));
    return UNO.plus(d(activo.tna).mul(dias).div(DIAS_ANIO));
  }
  if (activo.tipo === "billetera" || activo.tipo === "fci") {
    const dias = Math.max(0, diasEntre(activo.inicio, fecha));
    return UNO.plus(d(activo.tna).div(DIAS_ANIO)).pow(dias);
  }
  return UNO;
}

export type ContextoValuacion = {
  /** Precio por activo en su moneda (misma escala que los movimientos). Las cuentas no hacen falta. */
  precios: ReadonlyMap<string, Num>;
  /** Pesos por dólar (MEP) para convertir activos en USD. */
  mep: Num;
};

export type PosicionValuada = Posicion & {
  activo: Activo;
  precio: Dec | null;
  /** Valor en la moneda del activo. */
  valor: Dec;
  valorArs: Dec;
  costoArsAlMepActual: Dec;
  /** Resultado no realizado en la moneda del activo. */
  noRealizado: Dec;
  /** Variación porcentual contra el costo (fracción). null si no hay costo. */
  variacion: Dec | null;
  sinPrecio: boolean;
};

/** Valúa las posiciones abiertas. Si falta el precio de un activo, se valúa al costo y se marca `sinPrecio`. */
export function valuarPosiciones(
  posiciones: ReadonlyMap<string, Posicion>,
  activos: ReadonlyMap<string, Activo>,
  contexto: ContextoValuacion,
  fecha: FechaISO,
): PosicionValuada[] {
  const mep = d(contexto.mep);
  const resultado: PosicionValuada[] = [];
  for (const pos of posiciones.values()) {
    const activo = activos.get(pos.activoId);
    if (!activo || pos.cantidad.lte(0)) continue;
    const divisor = divisorPrecio(activo.tipo);
    const precioMercado = esCuenta(activo.tipo) ? precioCuenta(activo, fecha) : contexto.precios.get(activo.id);
    const sinPrecio = precioMercado === undefined;
    const precio = sinPrecio ? null : d(precioMercado);
    const valor = precio ? pos.cantidad.mul(precio).div(divisor) : pos.costoTotal;
    const cambio = activo.moneda === "USD" ? mep : UNO;
    const noRealizado = valor.minus(pos.costoTotal);
    resultado.push({
      ...pos,
      activo,
      precio,
      valor,
      valorArs: valor.mul(cambio),
      costoArsAlMepActual: pos.costoTotal.mul(cambio),
      noRealizado,
      variacion: pos.costoTotal.gt(0) ? noRealizado.div(pos.costoTotal) : null,
      sinPrecio,
    });
  }
  return resultado.sort((a, b) => b.valorArs.cmp(a.valorArs));
}

export function totalArs(posiciones: PosicionValuada[]): Dec {
  return posiciones.reduce((acc, p) => acc.plus(p.valorArs), CERO);
}

/**
 * Arma los puntos de valuación (valor + flujo en pesos) para TWR y XIRR.
 * `contextoEn(fecha)` devuelve los precios y el MEP de esa fecha.
 * Se valúa en cada fecha con movimientos y en `fechasExtra` (por ejemplo, hoy).
 */
export function puntosDeValuacion(
  movimientos: Movimiento[],
  activos: ReadonlyMap<string, Activo>,
  contextoEn: (fecha: FechaISO) => ContextoValuacion,
  fechasExtra: FechaISO[] = [],
): PuntoValuacion[] {
  const fechas = [...new Set([...movimientos.map((m) => m.fecha), ...fechasExtra])].sort();
  const primera = movimientos.reduce<FechaISO | null>((min, m) => (!min || m.fecha < min ? m.fecha : min), null);
  if (!primera) return [];
  return fechas
    .filter((f) => f >= primera)
    .map((fecha) => {
      const contexto = contextoEn(fecha);
      const mep = d(contexto.mep);
      const posiciones = derivarPosiciones(movimientos, activos, fecha);
      const valor = totalArs(valuarPosiciones(posiciones, activos, contexto, fecha));
      let flujo = CERO;
      for (const mov of movimientos) {
        if (mov.fecha !== fecha) continue;
        const activo = activos.get(mov.activoId);
        if (!activo) continue;
        flujo = flujo.plus(flujoExterno(mov, activo.tipo).mul(activo.moneda === "USD" ? mep : UNO));
      }
      return { fecha, valor, flujo };
    });
}

/** Convierte puntos de valuación en flujos para XIRR: aportes negativos y valor final positivo. */
export function flujosParaXirr(puntos: PuntoValuacion[]): FlujoFechado[] {
  if (puntos.length === 0) return [];
  const flujos: FlujoFechado[] = puntos.filter((p) => !d(p.flujo).isZero()).map((p) => ({ fecha: p.fecha, monto: d(p.flujo).neg() }));
  const ultimo = puntos[puntos.length - 1]!;
  flujos.push({ fecha: ultimo.fecha, monto: ultimo.valor });
  return flujos;
}

/** Re-expresa puntos de valuación en otra unidad (USD MEP o pesos constantes): divide valor y flujo por un deflactor. */
export function reexpresar(puntos: PuntoValuacion[], deflactor: (fecha: FechaISO) => Num | null): PuntoValuacion[] {
  const salida: PuntoValuacion[] = [];
  for (const p of puntos) {
    const k = deflactor(p.fecha);
    if (k === null || d(k).lte(0)) continue;
    salida.push({ fecha: p.fecha, valor: d(p.valor).div(k), flujo: d(p.flujo).div(k) });
  }
  return salida;
}

export type ResumenRendimiento = {
  twr: Dec | null;
  xirr: Dec | null;
  aportesNetos: Dec;
  valorFinal: Dec;
  /** Ganancia en la unidad de los puntos: valor final − aportes netos. */
  ganancia: Dec;
  dias: number;
};

export function resumenRendimiento(puntos: PuntoValuacion[]): ResumenRendimiento | null {
  if (puntos.length === 0) return null;
  const primero = puntos[0]!;
  const ultimo = puntos[puntos.length - 1]!;
  const aportesNetos = puntos.reduce((acc, p) => acc.plus(p.flujo), CERO);
  const valorFinal = d(ultimo.valor);
  return {
    twr: twr(puntos),
    xirr: xirr(flujosParaXirr(puntos)),
    aportesNetos,
    valorFinal,
    ganancia: valorFinal.minus(aportesNetos),
    dias: diasEntre(primero.fecha, ultimo.fecha),
  };
}
