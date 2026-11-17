import { d, UNO, type Dec, type Num } from "./decimal";

/**
 * Dólar. Convención de nombres desde el punto de vista del usuario:
 *   compras = precio al que VOS comprás (el "ask" o punta vendedora del proveedor)
 *   vendes  = precio al que VOS vendés (el "bid" o punta compradora del proveedor)
 */

/** Spread de un proveedor: (comprás − vendés) / vendés. Ej.: 1.567 y 1.548 → 1,23 %. */
export function spread(compras: Num, vendes: Num): Dec {
  return d(compras).minus(vendes).div(vendes);
}

/**
 * Costo total de comprar `cantidad` dólares: cantidad × precio × (1 + comisión %) + comisión fija.
 * Ej.: USD 1.000 a $1.567 con 0,5 % de comisión → $1.574.835.
 */
export function costoCompra(cantidad: Num, precio: Num, comisionPct: Num = 0, comisionFija: Num = 0): Dec {
  return d(cantidad).mul(precio).mul(UNO.plus(comisionPct)).plus(comisionFija);
}

/** Lo que recibís al vender `cantidad` dólares: cantidad × precio × (1 − comisión %) − comisión fija. */
export function producidoVenta(cantidad: Num, precio: Num, comisionPct: Num = 0, comisionFija: Num = 0): Dec {
  return d(cantidad).mul(precio).mul(UNO.minus(comisionPct)).minus(comisionFija);
}

/** Brecha entre dos tipos de cambio: a / b − 1. Ej.: MEP 1.585 contra oficial 1.575 → 0,63 %. */
export function brecha(tipoDeCambio: Num, referencia: Num): Dec {
  return d(tipoDeCambio).div(referencia).minus(1);
}

/** Tipo de cambio implícito de un activo que cotiza en pesos y en dólares: P_ARS / P_USD. */
export function tipoDeCambioImplicito(precioArs: Num, precioUsd: Num): Dec {
  return d(precioArs).div(precioUsd);
}

/** CCL de un CEDEAR contra su subyacente: P_ARS × ratio / P_USA. */
export function cclContraSubyacente(precioArs: Num, ratio: Num, precioUsa: Num): Dec {
  return d(precioArs).mul(ratio).div(precioUsa);
}

/**
 * Arbitraje genérico por ruta:
 * ganancia neta % = [P_venta × (1 − com_venta) − costos_fijos/monto] / [P_compra × (1 + com_compra)] − 1.
 */
export function gananciaArbitraje(p: {
  precioCompra: Num;
  precioVenta: Num;
  comisionCompra?: Num;
  comisionVenta?: Num;
  costosFijos?: Num;
  monto: Num;
}): Dec {
  const neto = d(p.precioVenta)
    .mul(UNO.minus(p.comisionVenta ?? 0))
    .minus(d(p.costosFijos ?? 0).div(p.monto));
  const costo = d(p.precioCompra).mul(UNO.plus(p.comisionCompra ?? 0));
  return neto.div(costo).minus(1);
}
