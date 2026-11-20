import type { Metadata } from "next";
import { Suspense } from "react";
import { TablaAcciones } from "@/components/modules/mercados/mercados";
import { MervalHoy } from "@/components/modules/mercados/indices";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerMercados, obtenerMerval } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";

export const revalidate = 15;
export const metadata: Metadata = { title: "Acciones argentinas: panel líder y general", description: "El Merval de hoy y los precios y la variación de las acciones argentinas." };

export default async function Acciones() {
  const [r, merval] = await Promise.all([obtenerMercados(), obtenerMerval().catch(() => null)]);
  if (!r.ok) return <ErrorState titulo="No pudimos traer las acciones." detalle={r.error} />;
  return (
    <>
      <MervalHoy merval={merval} />
      <Suspense fallback={null}>
        <TablaAcciones acciones={r.data.acciones} />
      </Suspense>
      <SourceNote className="mt-6" fuentes={[FUENTES.data912]} actualizado={r.asOf} estado={r.status} />
    </>
  );
}
