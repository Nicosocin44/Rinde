import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { traerTexto } from "../http";

/**
 * Google Noticias: búsqueda de noticias de un activo en cientos de medios a la vez (RSS público, sin autenticación).
 * En castellano (edición Argentina) y en inglés (edición EE.UU.: CNBC, CNN, Reuters, Bloomberg, The Wall Street
 * Journal…). Verificado el 19/11/2026: "Nvidia" trajo 100 notas de los últimos 3 días, cada una con su medio.
 * Solo usamos título, medio, hora y link (que pasa por Google y lleva a la nota original).
 * No es una API oficial: antes del lanzamiento comercial hay que revisar sus condiciones (ver PROGRESO.md).
 */
export type Idioma = "es" | "en";

export type NoticiaBuscada = {
  titulo: string;
  url: string;
  fecha: string;
  /** El medio que publicó la nota ("CNBC", "Infobae"…). */
  fuente: string;
  /** Su dominio, sin www ("cnbc.com"): es el id de su logo en public/logos/medios/. */
  dominio?: string;
  idioma: Idioma;
};

const EDICION: Record<Idioma, string> = { es: "hl=es-419&gl=AR&ceid=AR:es-419", en: "hl=en-US&gl=US&ceid=US:en" };

const texto = z.union([z.string(), z.number()]).transform(String);
const itemSchema = z.object({
  title: texto,
  link: texto,
  pubDate: texto,
  source: z.union([texto, z.object({ "#text": texto.optional(), "@_url": texto.optional() }).passthrough()]).optional(),
});
const rssSchema = z.object({ rss: z.object({ channel: z.object({ item: z.union([itemSchema, z.array(itemSchema)]).optional() }) }) });

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", trimValues: true, processEntities: true, htmlEntities: true });

/** Google agrega " - Medio" al final de cada título: se saca (el medio va aparte). */
export function sinMedio(titulo: string, fuente: string): string {
  const sufijo = ` - ${fuente}`;
  return fuente && titulo.endsWith(sufijo) ? titulo.slice(0, -sufijo.length).trim() : titulo.trim();
}

/** Lee el RSS de una búsqueda. Puro. */
export function leerBusqueda(xml: string, idioma: Idioma): NoticiaBuscada[] {
  const r = rssSchema.safeParse(parser.parse(xml));
  if (!r.success) throw new Error("[google-noticias] el feed cambió de forma");
  const items = r.data.rss.channel.item;
  return (items === undefined ? [] : Array.isArray(items) ? items : [items]).flatMap((i) => {
    const fuente = typeof i.source === "string" ? i.source : (i.source?.["#text"] ?? "");
    const sitio = typeof i.source === "string" ? undefined : i.source?.["@_url"];
    const fecha = new Date(i.pubDate);
    if (!fuente || !Number.isFinite(fecha.getTime())) return [];
    let dominio: string | undefined;
    try {
      dominio = sitio ? new URL(sitio).hostname.replace(/^www\./, "") : undefined;
    } catch {
      dominio = undefined;
    }
    return [{ titulo: sinMedio(i.title, fuente), url: i.link, fecha: fecha.toISOString(), fuente, idioma, ...(dominio ? { dominio } : {}) }];
  });
}

/** Noticias de una búsqueda de los últimos `dias`. Caché de 30 minutos. */
export async function buscar(consulta: string, idioma: Idioma, dias: number): Promise<NoticiaBuscada[]> {
  const q = encodeURIComponent(`${consulta} when:${dias}d`);
  const xml = await traerTexto(`https://news.google.com/rss/search?q=${q}&${EDICION[idioma]}`, { fuente: "google-noticias", revalidate: 1800, timeoutMs: 8000 });
  return leerBusqueda(xml, idioma);
}
