import type { Metadata } from "next";
import { Conversor } from "@/components/modules/dolar/conversor";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerCotizaciones } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";

export const revalidate = 60;
export const metadata: Metadata = { title: "Conversor de pesos a dólares", description: "Cuántos dólares comprás con tus pesos en cada tipo de cambio, y al revés." };

export default async function ConversorPage() {
  const r = await obtenerCotizaciones();
  if (!r.ok) return <ErrorState titulo="No pudimos traer las cotizaciones." detalle={r.error} />;
  return (
    <>
      <Conversor cotizaciones={r.data} />
      <SourceNote className="mt-6" fuentes={[FUENTES.dolarapi]} actualizado={r.asOf} estado={r.status} />
    </>
  );
}
