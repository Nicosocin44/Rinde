import type { Metadata } from "next";
import { Suspense } from "react";
import { TablaAcciones } from "@/components/modules/mercados/mercados";
import { CifraPorcentaje } from "@/components/ui/cifra";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerMercados } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";

export const revalidate = 120;
export const metadata: Metadata = { title: "Acciones argentinas: panel líder y general", description: "Precios y variación de las acciones argentinas." };

export default async function Acciones() {
  const r = await obtenerMercados();
  if (!r.ok) return <ErrorState titulo="No pudimos traer las acciones." detalle={r.error} />;
  const lider = r.data.acciones.filter((a) => a.panel === "líder" && a.variacion !== null);
  const promedio = lider.length ? lider.reduce((s, a) => s + (a.variacion ?? 0), 0) / lider.length : null;
  const suben = lider.filter((a) => (a.variacion ?? 0) > 0).length;
  return (
    <>
      <section className="mb-12 flex flex-col gap-3 lg:mb-16">
        <p className="text-label">Panel líder, promedio del día</p>
        <CifraPorcentaje fraccion={promedio} decimales={2} className={promedio !== null && promedio < 0 ? "text-hero text-loss" : "text-hero text-gain"} />
        <p className="text-text-2">
          {suben} de {lider.length} acciones del panel líder suben hoy. Es un promedio simple, no el índice Merval.
        </p>
      </section>
      <Suspense fallback={null}>
        <TablaAcciones acciones={r.data.acciones} />
      </Suspense>
      <SourceNote className="mt-6" fuentes={[FUENTES.data912]} actualizado={r.asOf} estado={r.status} />
    </>
  );
}
