import { z } from "zod";
import { revalidar } from "../freshness";
import { traerJson } from "../http";

/**
 * Binance: velas diarias de BTC y ETH contra USDT (sin autenticación). Verificado el 18/11/2026.
 * Cada vela: [apertura (ms), open, high, low, close, volumen, …]. Hasta 1000 días por pedido (~2 años y 9 meses).
 */
const velasSchema = z.array(z.tuple([z.number(), z.string(), z.string(), z.string(), z.string(), z.string()]).rest(z.unknown()));

export async function velasDiarias(simbolo: "BTC" | "ETH", dias = 1000) {
  const k = await traerJson(`https://api.binance.com/api/v3/klines?symbol=${simbolo}USDT&interval=1d&limit=${dias}`, velasSchema, {
    fuente: "binance",
    revalidate: revalidar("mercado"),
    timeoutMs: 8000,
  });
  return k.map((r) => ({ fecha: new Date(r[0]).toISOString().slice(0, 10), apertura: Number(r[1]), maximo: Number(r[2]), minimo: Number(r[3]), cierre: Number(r[4]), volumen: Number(r[5]) }));
}

/** Pares con recorrido del día: BTC y ETH en dólares, y USDT en pesos (el dólar cripto). Verificado el 18/11/2026. */
export type ParIntradia = "BTCUSDT" | "ETHUSDT" | "USDTARS";

/**
 * Recorrido de las últimas 24 horas en velas de 5 minutos (288). `fecha` es fecha y hora ISO (UTC).
 * Caché de un minuto: es un dato que se mueve todo el tiempo.
 */
export async function velasDelDia(par: ParIntradia) {
  const k = await traerJson(`https://api.binance.com/api/v3/klines?symbol=${par}&interval=5m&limit=288`, velasSchema, {
    fuente: "binance",
    revalidate: 60,
    timeoutMs: 8000,
  });
  return k.map((r) => ({ fecha: new Date(r[0]).toISOString(), apertura: Number(r[1]), maximo: Number(r[2]), minimo: Number(r[3]), cierre: Number(r[4]), volumen: Number(r[5]) }));
}
