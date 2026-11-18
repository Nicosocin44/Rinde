import { COLORES_IMAGEN, imagenRinde } from "@/lib/og";

/**
 * Imagen para compartir un resultado (1080×1350: historias, WhatsApp, X).
 * Los textos llegan por query y se recortan: la imagen nunca muestra más de lo que la persona calculó.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const limpiar = (s: string | null, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const cifra = limpiar(q.get("c"), 24);
  if (!cifra) return new Response("Falta la cifra", { status: 400 });
  // Opcionales: barra de avance (0 a 100) y color del tema (solo los de la paleta).
  const p = Number(q.get("p"));
  const progreso = q.has("p") && Number.isFinite(p) ? Math.min(100, Math.max(0, p)) / 100 : undefined;
  const color = COLORES_IMAGEN.find((x) => x === q.get("col"));
  return imagenRinde({ etiqueta: limpiar(q.get("t"), 70), cifra, detalle: limpiar(q.get("d"), 140), progreso, color }, { ancho: 1080, alto: 1350 });
}
