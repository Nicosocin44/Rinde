import { imagenRinde } from "@/lib/og";

/**
 * Imagen para compartir un resultado (1080×1350: historias, WhatsApp, X).
 * Los textos llegan por query y se recortan: la imagen nunca muestra más de lo que la persona calculó.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const limpiar = (s: string | null, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const cifra = limpiar(q.get("c"), 24);
  if (!cifra) return new Response("Falta la cifra", { status: 400 });
  return imagenRinde({ etiqueta: limpiar(q.get("t"), 70), cifra, detalle: limpiar(q.get("d"), 140) }, { ancho: 1080, alto: 1350 });
}
