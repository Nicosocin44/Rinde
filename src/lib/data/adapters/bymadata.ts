import { revalidar } from "../freshness";
import { traerJson } from "../http";
import { bymaCaucionesSchema } from "../schemas";

/**
 * BYMA Data (open.bymadata.com.ar): los datos que usa por detrás la web pública de BYMA, gratis y sin clave. No es una
 * API documentada (la oficial es paga): BYMA la puede cambiar sin aviso. Desde octubre de 2026 pide el encabezado
 * "Options" con la sección de la web (en cauciones, "renta-fija"). Si falla, las cauciones vuelven a ArgentinaDatos.
 */
const BASE = "https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free";
const FUENTE = "BYMA Data";

/** Todas las cauciones del día (pesos, dólar MEP y cable), una fila por vencimiento. */
export function cauciones() {
  return traerJson(`${BASE}/cauciones`, bymaCaucionesSchema, {
    fuente: FUENTE,
    revalidate: revalidar("tasas"),
    timeoutMs: 12000,
    cuerpoPost: JSON.stringify({ "Content-Type": "application/json" }),
    headers: { "content-type": "application/json", Options: "renta-fija" },
  });
}
