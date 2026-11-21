import { mesPermitido } from "@/lib/calendario/mes";
import { semanaPermitida } from "@/lib/calendario/semana";
import { hoyAR } from "@/lib/calculos";
import { obtenerMes, obtenerSemana } from "@/lib/data";

const CACHE = { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" };

/**
 * El calendario de Mercados:
 * - /api/calendario?mes=AAAA-MM: el mes (el mes pasado, este y los dos que vienen).
 * - /api/calendario?semana=AAAA-MM-DD: una semana (un lunes; una para atrás y cuatro para adelante).
 * Los rangos son fijos para que nadie le haga pedir a las fuentes cualquier fecha.
 */
export async function GET(req: Request) {
  const parametros = new URL(req.url).searchParams;
  const hoy = hoyAR();
  const mes = parametros.get("mes");
  if (mes !== null) {
    if (!mesPermitido(mes, hoy)) return Response.json({ ok: false, error: "Mes fuera de rango." }, { status: 400 });
    return Response.json(await obtenerMes(mes), { headers: CACHE });
  }
  const semana = parametros.get("semana") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana) || !semanaPermitida(semana, hoy)) return Response.json({ ok: false, error: "Semana fuera de rango." }, { status: 400 });
  return Response.json(await obtenerSemana(semana), { headers: CACHE });
}
