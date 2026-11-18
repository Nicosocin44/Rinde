import type { Metadata } from "next";
import { QueHubiera } from "@/components/modules/calculadoras/que-hubiera";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerQueHubiera } from "@/lib/data";
import { ACTIVOS_QH } from "@/lib/data/servicios/que-hubiera";
import { FUENTES } from "@/lib/data/types";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "¿Qué hubiera pasado si…? Dólar, plazo fijo, acciones o bitcoin",
  description: "Si hace un año ponías $1.000.000 en dólares, en un plazo fijo, en una acción o en bitcoin, ¿cuánto tendrías hoy? Y contra la inflación.",
};

export default async function Page() {
  const r = await obtenerQueHubiera();
  return (
    <>
      <h2 className="mb-8 text-h2">Si hace un tiempo ponías tu plata en algo, ¿cuánto tendrías hoy?</h2>
      {r.ok ? (
        <QueHubiera datos={r.data} activos={ACTIVOS_QH.map((a) => ({ ticker: a.ticker, nombre: a.nombre }))} />
      ) : (
        <ErrorState titulo="No pudimos traer la historia de precios." detalle={r.error} />
      )}
      <SourceNote className="mt-8" fuentes={[FUENTES.argentinadatos, FUENTES.data912, FUENTES.binance]} actualizado={r.ok ? r.asOf : null} estado={r.ok ? r.status : "stale"} metodologia="/metodologia#que-hubiera">
        <span aria-hidden>·</span>
        <span>Rendimientos pasados: no dicen qué va a pasar</span>
      </SourceNote>
    </>
  );
}
