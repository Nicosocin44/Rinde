import type { Metadata } from "next";
import { HistoricoDolar } from "@/components/modules/dolar/historico-dolar";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import type { SerieCompacta } from "@/components/charts/price-chart";
import { obtenerHistoricoDolar } from "@/lib/data";
import { FUENTES, type PuntoSerie } from "@/lib/data/types";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Histórico del dólar y brecha", description: "Evolución del dólar MEP, oficial y blue, y de la brecha cambiaria." };

/** Para no mandar miles de puntos: diario los últimos 2 años, semanal antes. */
function compactar(serie: PuntoSerie[]): SerieCompacta {
  const limite = new Date(Date.now() - 2 * 366 * 86_400_000).toISOString().slice(0, 10);
  return serie.filter((p, i) => p.fecha >= limite || i % 5 === 0 || i === serie.length - 1).map((p) => [p.fecha, Math.round(p.valor * 10000) / 10000]);
}

export default async function Historico() {
  const r = await obtenerHistoricoDolar();
  if (!r.ok) return <ErrorState titulo="No pudimos traer el histórico." detalle={r.error} />;
  return (
    <>
      <HistoricoDolar series={{ mep: compactar(r.data.mep), oficial: compactar(r.data.oficial), blue: compactar(r.data.blue) }} brecha={compactar(r.data.brecha)} />
      <SourceNote className="mt-6" fuentes={[FUENTES.argentinadatos]} actualizado={r.asOf} estado={r.status} />
    </>
  );
}
