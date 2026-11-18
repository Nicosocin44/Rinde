import type { Metadata } from "next";
import { Suspense } from "react";
import { IndicesEEUU } from "@/components/modules/mercados/indices";
import { TablaCedears } from "@/components/modules/mercados/mercados";
import { Cifra } from "@/components/ui/cifra";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerCotizaciones, obtenerMercados } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";
import { porcentaje } from "@/lib/format";

export const revalidate = 120;
export const metadata: Metadata = { title: "CEDEARs: precios y dólar implícito", description: "Precio de los CEDEARs en pesos y dólares, con el MEP y el CCL implícitos." };

export default async function Cedears() {
  const [r, c] = await Promise.all([obtenerMercados(), obtenerCotizaciones()]);
  if (!r.ok) return <ErrorState titulo="No pudimos traer los CEDEARs." detalle={r.error} />;
  const mep = c.ok ? c.data.find((x) => x.id === "mep")?.venta : null;
  return (
    <>
      <IndicesEEUU indices={r.data.indices ?? []} />
      <section className="mb-12 flex flex-col gap-3 lg:mb-16">
        <p className="text-label">Dólar implícito en los CEDEARs</p>
        <Cifra valor={r.data.mepPromedio} className="text-hero" />
        <p className="max-w-2xl text-text-2">
          Es lo que pagás por cada dólar cuando comprás un CEDEAR (mediana de los 30 más operados).
          {mep && r.data.mepPromedio && ` Es ${porcentaje(Math.abs(r.data.mepPromedio / mep - 1), 1)} ${r.data.mepPromedio < mep ? "menos" : "más"} que el MEP con bonos.`} En modo Pro ves el MEP y el CCL implícitos de cada uno.
        </p>
      </section>
      <Suspense fallback={null}>
        <TablaCedears cedears={r.data.cedears} />
      </Suspense>
      <SourceNote className="mt-6" fuentes={[FUENTES.data912]} actualizado={r.asOf} estado={r.status} metodologia="/metodologia#cedears" />
    </>
  );
}
