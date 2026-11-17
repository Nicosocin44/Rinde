import { traerJson } from "../http";
import { revalidar } from "../freshness";
import { bcraSerieSchema } from "../schemas";

/**
 * BCRA · Estadísticas Monetarias v4.0 (la v3.0 quedó deprecada el 28/02/2026). Sin autenticación.
 * Ids verificados el 16/11/2026 contra el catálogo (/monetarias).
 */
const BASE = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias";

export const VARIABLES_BCRA = {
  reservas: 1,
  tipoCambioMinorista: 4,
  tipoCambioMayorista: 5,
  badlar: 7,
  tasaDepositos30Dias: 12,
  baseMonetaria: 15,
  inflacionMensual: 27,
  inflacionInteranual: 28,
  cer: 30,
  uva: 31,
  tamar: 44,
} as const;

export async function serieBcra(idVariable: number, desde: string, hasta: string) {
  const datos = await traerJson(`${BASE}/${idVariable}?desde=${desde}&hasta=${hasta}&limit=3000`, bcraSerieSchema, {
    fuente: "BCRA",
    revalidate: revalidar("bcra"),
    timeoutMs: 12000,
  });
  const detalle = datos.results[0]?.detalle ?? [];
  return [...detalle].sort((a, b) => a.fecha.localeCompare(b.fecha));
}
