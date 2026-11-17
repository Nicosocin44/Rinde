import { obtenerPulso } from "@/lib/data";

/** Barra de pulso: MEP, oficial, riesgo país y mejor tasa. La caché de cada fuente vive en su adapter. */
export async function GET() {
  const pulso = await obtenerPulso();
  return Response.json(pulso, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
