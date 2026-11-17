import type { Metadata } from "next";
import { Metas } from "@/components/modules/metas/metas";
import { PageHeader } from "@/components/shell/page-header";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerMacro, obtenerPesos } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";
import { opcionesParaMetas } from "@/lib/metas/instrumentos";
import { mejoresDelDia } from "@/lib/rankings/pesos";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Metas de ahorro: cuánto poner por mes para llegar",
  description: "Un viaje, un auto, un departamento: armá tu meta, mirá cuánto ahorrar por mes con las tasas de hoy y seguí cómo venís cada 30 días.",
};

export default async function Page() {
  const [p, m] = await Promise.all([obtenerPesos(), obtenerMacro()]);
  const mejor = p.ok ? mejoresDelDia(p.data.opciones).liquida : null;
  const inflacionAnual = m.ok ? m.data.rem?.proximos12m : null;
  const inflacionMensual = inflacionAnual ? (1 + inflacionAnual) ** (1 / 12) - 1 : null;
  return (
    <>
      <PageHeader
        titulo="Tus metas"
        bajada="Un viaje, un auto, un depto: ponele nombre a lo que querés, cuánto cuesta y para cuándo. Vas cargando cuánto ponés y dónde, y te decimos cuánto juntar por mes y cómo venís."
        className="mb-10 lg:mb-14"
      />
      <Metas referencia={mejor ? { nombre: mejor.nombre, tea: mejor.tea } : null} inflacionMensual={inflacionMensual} opciones={p.ok ? opcionesParaMetas(p.data.opciones) : []} />
      <SourceNote className="mt-8" fuentes={[FUENTES.argentinadatos, FUENTES.cnv, FUENTES.bcra]} actualizado={p.ok ? p.asOf : null} estado={p.ok ? p.status : "stale"} metodologia="/metodologia#metas">
        <span aria-hidden>·</span>
        <span>
          Supuestos: {mejor ? `mejor TEA sin plazo (${mejor.nombre})` : "sin tasas del día"}
          {inflacionAnual ? " e inflación esperada del REM" : ""}
        </span>
      </SourceNote>
    </>
  );
}
