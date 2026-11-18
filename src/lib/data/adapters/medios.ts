import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { revalidar } from "../freshness";
import { traerTexto } from "../http";
import type { NoticiaCruda } from "@/lib/noticias";

/**
 * Medios de los que tomamos noticias (RSS públicos, verificados el 17/11/2026).
 * Solo usamos título, extracto, hora y link: la nota completa queda en el sitio de cada medio.
 * Seeking Alpha, MarketWatch y CNBC quedan afuera: sus feeds son para uso personal, no comercial.
 */
export const MEDIOS = [
  { id: "infobae", nombre: "Infobae", sitio: "https://www.infobae.com", feeds: ["https://www.infobae.com/arc/outboundfeeds/rss/category/economia/"] },
  { id: "lanacion", nombre: "La Nación", sitio: "https://www.lanacion.com.ar", feeds: ["https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/"] },
  { id: "ambito", nombre: "Ámbito", sitio: "https://www.ambito.com", feeds: ["https://www.ambito.com/rss/pages/finanzas.xml", "https://www.ambito.com/rss/pages/economia.xml"] },
  { id: "cronista", nombre: "El Cronista", sitio: "https://www.cronista.com", feeds: ["https://www.cronista.com/files/rss/finanzas.xml", "https://www.cronista.com/files/rss/economia-politica.xml"] },
  { id: "iprofesional", nombre: "iProfesional", sitio: "https://www.iprofesional.com", feeds: ["https://www.iprofesional.com/rss/finanzas"] },
  { id: "bloomberglinea", nombre: "Bloomberg Línea", sitio: "https://www.bloomberglinea.com", feeds: ["https://www.bloomberglinea.com/arc/outboundfeeds/rss/category/mercados/?outputType=xml"] },
] as const;

export type MedioId = (typeof MEDIOS)[number]["id"];

const texto = z.union([z.string(), z.number()]).transform(String);
const itemSchema = z.object({
  title: texto,
  link: texto,
  pubDate: texto,
  description: texto.optional(),
});
const rssSchema = z.object({ rss: z.object({ channel: z.object({ item: z.union([itemSchema.passthrough(), z.array(itemSchema.passthrough())]) }) }) });

const parser = new XMLParser({ ignoreAttributes: true, cdataPropName: false, trimValues: true, processEntities: true, htmlEntities: true });

/** Baja y valida un feed RSS. Si cambia de forma, falla (y el servicio sigue con los demás medios). */
export async function noticiasDeFeed(medioId: MedioId, url: string): Promise<NoticiaCruda[]> {
  const xml = await traerTexto(url, { fuente: medioId, revalidate: revalidar("noticias"), timeoutMs: 8000 });
  const resultado = rssSchema.safeParse(parser.parse(xml));
  if (!resultado.success) throw new Error(`[${medioId}] el feed cambió de forma`);
  const items = resultado.data.rss.channel.item;
  return (Array.isArray(items) ? items : [items]).map((i) => ({
    medioId,
    titulo: i.title,
    resumen: i.description ?? "",
    url: i.link,
    fecha: new Date(i.pubDate).toISOString(),
  }));
}
