import { cargarPreciosCartera } from "@/lib/data/servicios/cartera";

/**
 * Precios para valuar la cartera. Recibe solo los ids de los instrumentos (ej. "cedear:AAPL"), nunca montos:
 * lo que tiene cada persona no sale de su navegador.
 */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^(cedear|accion|bono|on|lecap|cripto):[A-Z0-9.]{1,12}$/.test(s));
  const datos = await cargarPreciosCartera(ids);
  return Response.json(datos, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
}
