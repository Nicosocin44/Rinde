import { precioCuenta, type Activo, type Movimiento } from "@/lib/calculos/cartera";

/**
 * CARTERA DE EJEMPLO. Se muestra siempre rotulada como "Datos de ejemplo".
 * Los precios de compra son los cierres reales de cada fecha (data912, Binance y ArgentinaDatos, consultados el
 * 17/11/2026), para que la demo muestre números creíbles. Las cantidades son inventadas.
 * No incluye el CEDEAR de SPY: tuvo un cambio de ratio en junio de 2026 que data912 no ajusta.
 */
const activos: Activo[] = [
  { id: "billetera:mercadopago", tipo: "billetera", nombre: "Mercado Pago", proveedorId: "mercadopago", moneda: "ARS", tna: 0.18, inicio: "2026-01-15" },
  { id: "plazo_fijo:bna-1021", tipo: "plazo_fijo", nombre: "Plazo fijo Banco Nación", proveedorId: "bna", moneda: "ARS", tna: 0.2, inicio: "2026-10-21", vencimiento: "2026-11-20" },
  { id: "cedear:AAPL", tipo: "cedear", nombre: "Apple", ticker: "AAPL", moneda: "ARS" },
  { id: "cedear:MELI", tipo: "cedear", nombre: "Mercado Libre", ticker: "MELI", moneda: "ARS" },
  { id: "accion:GGAL", tipo: "accion", nombre: "Grupo Galicia", ticker: "GGAL", moneda: "ARS" },
  { id: "bono:GD35", tipo: "bono", nombre: "Global 2035", ticker: "GD35", moneda: "USD" },
  { id: "lecap:T30J7", tipo: "lecap", nombre: "BONCAP T30J7", ticker: "T30J7", moneda: "ARS", vencimiento: "2027-06-30" },
  { id: "cripto:BTC", tipo: "cripto", nombre: "Bitcoin", ticker: "BTC", moneda: "USD" },
  { id: "efectivo_usd:ahorro", tipo: "efectivo_usd", nombre: "Dólares ahorrados", moneda: "USD" },
];

const porId = new Map(activos.map((a) => [a.id, a]));
/** Depósito en una cuenta con tasa: compra unidades a la "cuotaparte" de esa fecha. */
const deposito = (id: string, activoId: string, fecha: string, monto: number): Movimiento => {
  const precio = precioCuenta(porId.get(activoId)!, fecha);
  return { id, activoId, fecha, tipo: "deposito", cantidad: String(monto / precio.toNumber()), precio: precio.toString() };
};

const movimientos: Movimiento[] = [
  deposito("d1", "billetera:mercadopago", "2026-01-15", 1_500_000),
  { id: "d2", activoId: "efectivo_usd:ahorro", fecha: "2026-01-15", tipo: "deposito", cantidad: "2000", precio: "1" },
  { id: "d3", activoId: "cedear:AAPL", fecha: "2026-01-15", tipo: "compra", cantidad: "20", precio: "19580", comision: "1958" },
  { id: "d4", activoId: "cedear:MELI", fecha: "2026-03-02", tipo: "compra", cantidad: "15", precio: "21630", comision: "1622" },
  { id: "d5", activoId: "bono:GD35", fecha: "2026-03-02", tipo: "compra", cantidad: "1000", precio: "78.4", comision: "0.8" },
  { id: "d6", activoId: "cripto:BTC", fecha: "2026-03-02", tipo: "compra", cantidad: "0.01", precio: "68830" },
  { id: "d7", activoId: "cedear:AAPL", fecha: "2026-05-04", tipo: "compra", cantidad: "10", precio: "20690", comision: "1035" },
  deposito("d8", "billetera:mercadopago", "2026-07-01", 500_000),
  { id: "d9", activoId: "accion:GGAL", fecha: "2026-07-01", tipo: "compra", cantidad: "100", precio: "7685", comision: "3843" },
  // Cupón del GD35: 4,125 % anual sobre 100 de residual, semestral → US$ 2,0625 por cada 100 nominales.
  { id: "d10", activoId: "bono:GD35", fecha: "2026-07-09", tipo: "cupon", cantidad: "20.625", precio: "1", nota: "Cupón de julio" },
  { id: "d11", activoId: "cedear:MELI", fecha: "2026-09-01", tipo: "venta", cantidad: "5", precio: "25960", comision: "649" },
  { id: "d12", activoId: "lecap:T30J7", fecha: "2026-09-01", tipo: "compra", cantidad: "800000", precio: "124.88", comision: "1000" },
  { id: "d13", activoId: "plazo_fijo:bna-1021", fecha: "2026-10-21", tipo: "deposito", cantidad: "2000000", precio: "1" },
];

export const CARTERA_DEMO = { version: 1 as const, activos, movimientos, ajustes: { id: "ajustes" as const, objetivoPesos: 50 } };
