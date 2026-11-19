import type { Metadata } from "next";
import { Suspense } from "react";
import { DolarImplicito } from "@/components/modules/mercados/dolar-implicito";
import { IndicesEEUU } from "@/components/modules/mercados/indices";
import { TablaCedears } from "@/components/modules/mercados/mercados";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerCotizaciones, obtenerMercados, obtenerRecorridosEEUU } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";

export const revalidate = 120;
export const metadata: Metadata = { title: "CEDEARs: precios y dólar implícito", description: "Precio de los CEDEARs en pesos y dólares, con el MEP y el CCL implícitos." };

export default async function Cedears() {
  const [r, c, recorridos] = await Promise.all([obtenerMercados(), obtenerCotizaciones(), obtenerRecorridosEEUU().catch(() => ({}))]);
  if (!r.ok) return <ErrorState titulo="No pudimos traer los CEDEARs." detalle={r.error} />;
  const mep = c.ok ? (c.data.find((x) => x.id === "mep")?.venta ?? null) : null;
  return (
    <>
      <IndicesEEUU indices={r.data.indices ?? []} recorridos={recorridos} />
      {/* El dólar implícito casi siempre es igual al MEP: una línea arriba de la tabla, o un aviso si se separa 2 % o más. */}
      <DolarImplicito implicito={r.data.mepPromedio} mep={mep} />
      <Suspense fallback={null}>
        <TablaCedears cedears={r.data.cedears} />
      </Suspense>
      <SourceNote className="mt-6" fuentes={[FUENTES.data912]} actualizado={r.asOf} estado={r.status} metodologia="/metodologia#cedears" />
    </>
  );
}
