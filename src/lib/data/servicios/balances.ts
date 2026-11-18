import { unstable_cache } from "next/cache";
import { ADR_DE_ACCION, TICKER_EEUU_DE_CEDEAR } from "@data/ar/sec";
import { hoyAR, resumirBalances, type ResumenBalances } from "@/lib/calculos";
import * as sec from "../adapters/sec";
import { conRespaldo } from "../cache";
import { FUENTES } from "../types";

/** El ticker con el que la empresa presenta ante la SEC, o null si no presenta (acciones sin ADR, ETFs). */
export function tickerSec(ticker: string, tipo: "cedear" | "accion", sector: string | null): string | null {
  if (tipo === "accion") return ADR_DE_ACCION[ticker] ?? null;
  if (sector === "ETF") return null;
  return TICKER_EEUU_DE_CEDEAR[ticker] ?? ticker;
}

/**
 * El resumen de una empresa. La respuesta de la SEC pesa hasta 4 MB (no entra en la caché de fetch): se guarda el
 * resumen, que pesa unos pocos KB, 12 horas. Los balances salen como mucho una vez por trimestre.
 */
const resumenDeCik = unstable_cache(async (cik: number): Promise<ResumenBalances | null> => resumirBalances(await sec.hechos(cik), hoyAR()), ["balances-sec-v2"], {
  revalidate: 43_200,
});

/** Balances y resultados de un CEDEAR o una acción con ADR. `data` es null si la empresa no presenta ante la SEC. */
export async function cargarBalances(ticker: string, tipo: "cedear" | "accion", sector: string | null) {
  return conRespaldo<{ resumen: ResumenBalances | null; tickerSec: string | null }>(`balances:${ticker}`, [FUENTES.sec], async () => {
    const enSec = tickerSec(ticker, tipo, sector);
    const cik = enSec ? (await sec.ciks()).get(enSec) : undefined;
    const resumen = cik ? await resumenDeCik(cik) : null;
    return { data: { resumen, tickerSec: enSec }, asOf: new Date().toISOString(), status: "close" };
  });
}
