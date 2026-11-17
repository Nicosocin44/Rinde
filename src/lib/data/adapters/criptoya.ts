import { traerJson } from "../http";
import { revalidar } from "../freshness";
import { criptoyaDolarSchema, criptoyaExchangesSchema } from "../schemas";

/**
 * CriptoYa: cotizaciones por banco y por exchange. Límite: 120 req/min; actualiza cada minuto.
 * Con caché de 60 s, mil usuarios generan un solo request por minuto por endpoint.
 * `totalAsk` y `totalBid` ya incluyen las comisiones de cada exchange.
 */
const BASE = "https://criptoya.com/api";
const FUENTE = "CriptoYa";

/** Dólar oficial por banco y casa de cambio. */
export function bancos() {
  return traerJson(`${BASE}/bancostodos`, criptoyaExchangesSchema, { fuente: FUENTE, revalidate: revalidar("dolar") });
}

/** Cotización de una cripto contra una moneda fiat en todos los exchanges, para un volumen dado. */
export function exchanges(cripto: "usdt" | "usdc" | "btc" | "eth", fiat: "ars" | "usd", volumen = 1) {
  return traerJson(`${BASE}/${cripto}/${fiat}/${volumen}`, criptoyaExchangesSchema, { fuente: FUENTE, revalidate: revalidar("dolar") });
}

/** Resumen de dólares (lo usamos como alternativa y para la variación diaria). */
export function dolar() {
  return traerJson(`${BASE}/dolar`, criptoyaDolarSchema, { fuente: FUENTE, revalidate: revalidar("dolar") });
}
