import type { Metadata } from "next";
import { Metas } from "@/components/modules/metas/metas";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerCotizaciones, obtenerMacro, obtenerPesos } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";
import { alternativasParaMetas, opcionesParaMetas } from "@/lib/metas/instrumentos";
import { mejoresDelDia } from "@/lib/rankings/pesos";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Metas de ahorro: cuánto poner por mes para llegar",
  description: "Un viaje, un auto, un departamento: armá tu meta, mirá cuánto ahorrar por mes con las tasas de hoy y seguí cómo venís cada 30 días.",
};

/** Meses de IPC que viajan al navegador para el rendimiento real (las metas son recientes). */
const MESES_IPC = 36;

export default async function Page() {
  const [p, m, c] = await Promise.all([obtenerPesos(), obtenerMacro(), obtenerCotizaciones()]);
  const mejor = p.ok ? mejoresDelDia(p.data.opciones).liquida : null;
  const inflacionAnual = m.ok ? m.data.rem?.proximos12m : null;
  const inflacionMensual = inflacionAnual ? (1 + inflacionAnual) ** (1 / 12) - 1 : null;
  const mep = c.ok ? (c.data.find((x) => x.id === "mep")?.venta ?? null) : null;
  return (
    <>
      <h2 className="mb-8 text-h2">¿Cuánto tengo que juntar por mes para mi meta?</h2>
      <Metas
        referencia={mejor ? { nombre: mejor.nombre, tea: mejor.tea } : null}
        inflacionMensual={inflacionMensual}
        ipc={m.ok ? m.data.inflacionMensual.slice(-MESES_IPC) : []}
        mep={mep}
        opciones={p.ok ? opcionesParaMetas(p.data.opciones) : []}
        alternativas={p.ok ? alternativasParaMetas(p.data.opciones) : []}
      />
      <SourceNote
        className="mt-8"
        fuentes={[FUENTES.argentinadatos, FUENTES.cnv, FUENTES.bcra, FUENTES.dolarapi]}
        actualizado={p.ok ? p.asOf : null}
        estado={p.ok ? p.status : "stale"}
        metodologia="/metodologia#metas"
      >
        <span aria-hidden>·</span>
        <span>
          Supuestos: {mejor ? `mejor TEA sin plazo (${mejor.nombre})` : "sin tasas del día"}
          {inflacionAnual ? ", inflación esperada del REM" : ""}
          {m.ok && m.data.inflacionMensual.length ? " e IPC del INDEC" : ""}
          {mep ? " · dólar MEP de hoy" : ""}
        </span>
      </SourceNote>
    </>
  );
}
