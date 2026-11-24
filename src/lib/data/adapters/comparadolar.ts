import { traerJson } from "../http";
import { revalidar } from "../freshness";
import { comparaDolarSchema } from "../schemas";

/**
 * ComparaDolar: dólar por entidad (bancos, billeteras, brokers y casas de cambio). Lo usamos para el dólar oficial,
 * como segunda fuente después de CriptoYa: trae entidades que CriptoYa no tiene o tiene desactualizadas (Ualá, Brubank,
 * Banco Ciudad, Banco Provincia, Bancor…). Verificado el 24/11/2026.
 */
const FUENTE = "ComparaDolar";

export function dolares() {
  return traerJson("https://api.comparadolar.ar/usd", comparaDolarSchema, { fuente: FUENTE, revalidate: revalidar("dolar") });
}
