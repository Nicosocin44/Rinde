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
