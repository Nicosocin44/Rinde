import { traerJson } from "../http";
import { wikipediaResumenSchema } from "../schemas";

/**
 * Wikipedia en castellano: la descripción de una empresa para la ficha de cada activo.
 * Solo se pide el artículo que tenemos verificado para cada ticker (data/ar/wikipedia.ts), nunca una búsqueda:
 * la búsqueda automática confunde, por ejemplo, Tesla la empresa con Nikola Tesla.
 * Wikipedia limita los pedidos seguidos, así que se cachea una semana. El texto es CC BY-SA: se muestra con la fuente.
 */
const BASE = "https://es.wikipedia.org/api/rest_v1/page/summary";
const UNA_SEMANA = 7 * 24 * 3600;

export async function resumen(titulo: string) {
  const r = await traerJson(`${BASE}/${encodeURIComponent(titulo)}`, wikipediaResumenSchema, { fuente: "wikipedia", revalidate: UNA_SEMANA, timeoutMs: 6000 });
  if (r.type !== "standard" || !r.extract.trim()) return null;
  return { titulo: r.title, descripcion: r.description ?? null, texto: r.extract.trim(), url: r.content_urls?.desktop.page ?? `https://es.wikipedia.org/wiki/${encodeURIComponent(titulo)}` };
}
