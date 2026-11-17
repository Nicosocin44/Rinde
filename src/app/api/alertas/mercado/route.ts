import { fotoMercado } from "@/lib/data/servicios/alertas";

/** Foto del mercado para evaluar alertas en el navegador. No recibe nada del usuario. */
export async function GET() {
  return Response.json(await fotoMercado(), { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
