import { semanaPermitida } from "@/lib/calendario/semana";
import { hoyAR } from "@/lib/calculos";
import { obtenerSemana } from "@/lib/data";

/**
 * La semana del calendario de Mercados: /api/calendario?semana=AAAA-MM-DD (un lunes). Solo deja ir una semana para atrás
 * y cuatro para adelante, así nadie le hace pedir a las fuentes cualquier fecha.
 */
export async function GET(req: Request) {
  const semana = new URL(req.url).searchParams.get("semana") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana) || !semanaPermitida(semana, hoyAR())) return Response.json({ ok: false, error: "Semana fuera de rango." }, { status: 400 });
  const r = await obtenerSemana(semana);
  return Response.json(r, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } });
}
