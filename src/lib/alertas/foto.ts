"use client";

import type { Alerta, FotoMercado } from "./evaluar";
import type { PrecioActivo } from "@/lib/data/servicios/precios";

/** Precios de hoy de una lista de tickers (/api/precios). Si falla, vuelve vacío: las alertas quedan "Sin dato". */
export async function preciosDe(tickers: string[]): Promise<Record<string, PrecioActivo>> {
  if (tickers.length === 0) return {};
  try {
    const r = await fetch(`/api/precios?t=${encodeURIComponent([...new Set(tickers)].join(","))}`);
    return r.ok ? ((await r.json()) as Record<string, PrecioActivo>) : {};
  } catch {
    return {};
  }
}

/** Los tickers de las alertas de activos. */
export const tickersDeAlertas = (alertas: Alerta[]) => alertas.flatMap((a) => (a.tipo === "activo" ? [a.ticker] : []));

/** La foto del mercado más el precio de los activos que tienen alerta. */
export async function fotoConActivos(tickers: string[], vencimientos: FotoMercado["vencimientos"]): Promise<FotoMercado | null> {
  const [r, precios] = await Promise.all([fetch("/api/alertas/mercado"), preciosDe(tickers)]);
  if (!r.ok) return null;
  const foto = (await r.json()) as FotoMercado;
  const activos = Object.fromEntries(Object.values(precios).map((p) => [p.ticker, { precio: p.precio, moneda: p.moneda }]));
  return { ...foto, vencimientos, activos };
}
