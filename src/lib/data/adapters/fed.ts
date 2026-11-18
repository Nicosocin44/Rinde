import { traerTexto } from "../http";

/**
 * Reserva Federal: fechas de las reuniones del FOMC (la decisión de tasa sale el segundo día, a las 14 h de Nueva York).
 * Página oficial federalreserve.gov/monetarypolicy/fomccalendars.htm, verificada el 19/11/2026 (2026 y 2027).
 */
const MESES: Record<string, number> = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };

/** Días de decisión (el último día de cada reunión), como "AAAA-MM-DD". Puro: recibe el HTML. */
export function leerReunionesFomc(html: string): string[] {
  const texto = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const salida: string[] = [];
  for (const bloque of texto.matchAll(/(\d{4}) FOMC Meetings(.*?)(?=\d{4} FOMC Meetings|$)/g)) {
    const anio = Number(bloque[1]);
    // "January 27-28", "April 28-29", y las que cruzan de mes: "Apr/May 30-1" o "Oct/Nov 31-1".
    for (const m of bloque[2]!.matchAll(/\b(January|February|March|April|May|June|July|August|September|October|November|December|[A-Z][a-z]{2}\/([A-Z][a-z]{2}))\s+(\d{1,2})-(\d{1,2})\b/g)) {
      const nombre = m[1]!;
      const mesFinal = m[2] ? Object.entries(MESES).find(([k]) => k.startsWith(m[2]!))?.[1] : MESES[nombre];
      if (!mesFinal) continue;
      salida.push(`${anio}-${String(mesFinal).padStart(2, "0")}-${m[4]!.padStart(2, "0")}`);
    }
  }
  return [...new Set(salida)].sort();
}

/** Caché de un día: el calendario de la Fed cambia muy rara vez. */
export async function reunionesFomc(): Promise<string[]> {
  const html = await traerTexto("https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm", {
    fuente: "fed",
    revalidate: 86_400,
    timeoutMs: 10_000,
    headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; Rinde/1.0)" },
  });
  return leerReunionesFomc(html);
}
