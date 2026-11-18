import { z } from "zod";
import { traerTexto } from "../http";

/**
 * INDEC: calendario de difusión de un mes (el mismo que muestra indec.gob.ar). Verificado el 19/11/2026.
 * Cada informe trae un link "agendar en Google Calendar" con el título y la fecha y hora exactas; de ahí lo leemos.
 * Ej.: "Índice de precios al consumidor (IPC). Cobertura nacional. Noviembre de 2026" · 2026-12-15 16:00.
 */
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export type InformeIndec = { fecha: string; hora: string; titulo: string };

const informeSchema = z.object({ fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), hora: z.string().regex(/^\d{2}:\d{2}$/), titulo: z.string().min(3) });

/** Entidades HTML numéricas y las básicas (&#233; → é). */
function decodificar(html: string): string {
  return html
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Lee los informes del HTML del calendario. Puro (se testea con un fixture). */
export function leerCalendarioIndec(html: string): InformeIndec[] {
  const salida: InformeIndec[] = [];
  for (const m of html.matchAll(/action=TEMPLATE&amp;text=(.*?)&amp;dates=(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/g)) {
    const [, texto, a, me, d, h, mi] = m;
    const titulo = decodificar(decodeURIComponent(texto!.replace(/\+/g, " ")));
    const informe = informeSchema.safeParse({ fecha: `${a}-${me}-${d}`, hora: `${h}:${mi}`, titulo: titulo.trim() });
    if (informe.success) salida.push(informe.data);
  }
  return salida;
}

/** Calendario de un mes (mes 1–12). Caché de 12 horas: el INDEC lo publica con meses de anticipación. */
export async function calendarioDelMes(anio: number, mes: number): Promise<InformeIndec[]> {
  const html = await traerTexto(`https://www.indec.gob.ar/Calendario/FiltrosCalendario/mes/${MESES[mes - 1]}-${anio}/0`, {
    fuente: "indec",
    revalidate: 43_200,
    timeoutMs: 10_000,
    headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; Rinde/1.0)" },
  });
  return leerCalendarioIndec(html);
}
