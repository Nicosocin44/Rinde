import type { Metadata } from "next";
import { Metas } from "@/components/modules/calculadoras/metas";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerMacro, obtenerPesos } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";
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
      <div className="mb-8 flex flex-col gap-2">
        <h2 className="text-h2">¿Cuánto tengo que juntar por mes para llegar?</h2>
        <p className="max-w-2xl text-text-2">Ponele nombre a lo que querés, cuánto cuesta y para cuándo. Cada 30 días volvés, cargás cuánto tenés y te decimos cómo venís.</p>
      </div>
      <Metas referencia={mejor ? { nombre: mejor.nombre, tea: mejor.tea } : null} inflacionMensual={inflacionMensual} />
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
