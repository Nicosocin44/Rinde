import { BONOS_USD } from "@data/ar/bonos-usd";
import { LECAPS } from "@data/ar/lecaps";
import { CEDEARS, PANEL_LIDER } from "@data/ar/mercados";
import type { Moneda, TipoActivo } from "@/lib/calculos/cartera";

/**
 * Reglas compartidas entre la carga a mano y la importación de planillas: así un activo cargado de las dos formas
 * queda idéntico (mismo id, misma moneda, mismo nombre) y los movimientos se juntan en la misma posición.
 */

/** Billeteras, plazos fijos y dólares: se cargan por monto, no por cantidad y precio. */
export const esCuenta = (t: TipoActivo) => t === "billetera" || t === "plazo_fijo" || t === "efectivo_usd";

/** Moneda en la que se registran el precio y los movimientos de cada tipo de activo. */
export const monedaDe = (t: TipoActivo): Moneda => (t === "bono" || t === "cripto" || t === "efectivo_usd" || t === "on" ? "USD" : "ARS");

/**
 * Id estable del activo: "cedear:AAPL", "billetera:mercado-pago", "plazo_fijo:galicia-2026-06-01". Es la regla
 * de siempre del formulario: no cambiarla, porque los activos ya guardados quedarían separados de los nuevos.
 */
export function idActivo(tipo: TipoActivo, tickerONombre: string, fecha: string): string {
  if (!esCuenta(tipo)) return `${tipo}:${tickerONombre.trim().toUpperCase()}`;
  return `${tipo}:${(tickerONombre || "cuenta").toLowerCase().replace(/[^a-z0-9]+/g, "-")}${tipo === "plazo_fijo" ? `-${fecha}` : ""}`;
}

const CRIPTO: Record<string, string> = { BTC: "Bitcoin", ETH: "Ether", USDT: "Tether", USDC: "USD Coin" };

/** Nombre de un instrumento que conocemos, o null si no está en nuestras listas. */
export function nombreConocido(tipo: TipoActivo, ticker: string): string | null {
  const t = ticker.trim().toUpperCase();
  if (tipo === "cedear") return CEDEARS[t]?.nombre ?? null;
  if (tipo === "accion") return PANEL_LIDER[t] ?? null;
  if (tipo === "bono") return BONOS_USD.find((b) => b.ticker === t)?.nombre ?? null;
  if (tipo === "lecap") {
    const l = LECAPS.find((x) => x.ticker === t);
    return l ? `${l.tipo} ${l.ticker}` : null;
  }
  if (tipo === "cripto") return CRIPTO[t] ?? null;
  return null;
}

/** Vencimiento de una LECAP que conocemos. */
export const vencimientoLecap = (ticker: string) => LECAPS.find((l) => l.ticker === ticker.trim().toUpperCase())?.vencimiento;
