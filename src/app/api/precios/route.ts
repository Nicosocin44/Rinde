import { normalizarTicker } from "@/lib/data/servicios/activo";
import { preciosDeActivos } from "@/lib/data/servicios/precios";

/** Máximo de tickers por pedido (favoritos más alertas de una persona). */
const MAXIMO = 40;

/**
 * Precio de hoy de los activos pedidos: /api/precios?t=AAPL,AL30,BTC. Lo usan los favoritos y las alertas, que viven
 * en el navegador. Solo recibe tickers (validados); no recibe ni guarda nada de la persona.
 */
export async function GET(req: Request) {
  const pedidos = (new URL(req.url).searchParams.get("t") ?? "")
    .split(",")
    .map((t) => normalizarTicker(t))
    .filter((t): t is string => t !== null);
  const tickers = [...new Set(pedidos)].slice(0, MAXIMO);
  if (tickers.length === 0) return Response.json({});
  return Response.json(await preciosDeActivos(tickers), { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
