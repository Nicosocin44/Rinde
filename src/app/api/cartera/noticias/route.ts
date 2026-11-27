import { CEDEARS, PANEL_LIDER } from "@data/ar/mercados";
import { ADR_DE_ACCION } from "@data/ar/sec";
import { MEDIOS } from "@/lib/data/adapters/medios";
import { cargarNoticias } from "@/lib/data/servicios/noticias";
import { noticiasDeCartera, type ActivoParaNoticias } from "@/lib/data/servicios/noticias-activo";

/**
 * Noticias de lo que tenés en la cartera. Recibe solo los ids de hasta 4 instrumentos (los más grandes, ej.
 * "cedear:NVDA"), nunca montos ni cantidades: lo que tiene cada persona no sale de su navegador.
 */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^(cedear|accion|bono|lecap|cripto):[A-Z0-9.]{1,12}$/.test(s))
    .slice(0, 4);
  if (!ids.length) return Response.json({ noticias: [] });

  const activos: ActivoParaNoticias[] = ids.map((id) => {
    const [tipo, ticker] = id.split(":") as [ActivoParaNoticias["tipo"], string];
    const nombre = tipo === "cedear" ? (CEDEARS[ticker]?.nombre ?? null) : tipo === "accion" ? (PANEL_LIDER[ticker] ?? null) : null;
    return { tipo, ticker, nombre, sector: tipo === "cedear" ? (CEDEARS[ticker]?.sector ?? null) : null, conAdr: tipo === "accion" && !!ADR_DE_ACCION[ticker] };
  });
  const todas = await cargarNoticias();
  const noticias = await noticiasDeCartera(activos, todas.ok ? todas.data.noticias : [], (n) => MEDIOS.find((m) => m.id === n.medioId)?.nombre ?? n.fuente ?? n.medioId);
  return Response.json({ noticias }, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
}
