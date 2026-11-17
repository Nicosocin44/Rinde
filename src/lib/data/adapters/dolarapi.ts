import { traerJson } from "../http";
import { revalidar } from "../freshness";
import { dolarApiSchema } from "../schemas";

/** DolarAPI: cotizaciones actuales de todos los tipos de dólar. Sin autenticación. */
export async function dolaresActuales() {
  return traerJson("https://dolarapi.com/v1/dolares", dolarApiSchema, { fuente: "DolarAPI", revalidate: revalidar("dolar") });
}
