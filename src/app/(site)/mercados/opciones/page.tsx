import type { Metadata } from "next";
import Link from "next/link";
import { VistaOpciones } from "@/components/modules/mercados/opciones";
import { Cifra } from "@/components/ui/cifra";
import { Delta } from "@/components/ui/delta";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerOpciones } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Opciones de GGAL: cadena, volatilidad y lanzamiento cubierto",
  description: "Calls y puts de GGAL en BYMA con volatilidad implícita, delta y la tasa del lanzamiento cubierto.",
};

export default async function Opciones() {
  const r = await obtenerOpciones("GGAL");
  if (!r.ok) return <ErrorState titulo="No pudimos traer las opciones de GGAL." detalle={r.error} />;
  const { subyacente: s } = r.data;
  return (
    <>
      <section className="mb-12 flex flex-col gap-3 lg:mb-16">
        <p className="text-label">
          <Link href={`/activo/${s.ticker}`} className="hover:text-text-2 hover:underline">
            {s.nombre} ({s.ticker})
          </Link>
        </p>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Cifra valor={s.precio} className="text-hero" />
          <Delta valor={s.variacion} className="text-[17px]" />
        </div>
        <p className="max-w-2xl text-text-2">
          Las opciones de {s.ticker} son las más operadas de BYMA. Acá está la cadena completa de cada vencimiento, cuánto movimiento descuentan las primas y qué tasa en pesos te deja un lanzamiento cubierto.
        </p>
      </section>
      <VistaOpciones cadena={r.data} />
      <SourceNote className="mt-12" fuentes={[FUENTES.data912, FUENTES.argentinadatos, FUENTES.rinde]} actualizado={r.asOf} estado={r.status} metodologia="/metodologia#opciones">
        <span aria-hidden>·</span>
        <span>Precios de BYMA con demora</span>
      </SourceNote>
      <p className="mt-4 max-w-2xl text-micro">
        Las opciones son instrumentos de riesgo alto: quien compra puede perder toda la prima, y quien vende sin tener las acciones puede perder mucho más. Es información, no una recomendación de compra o venta.
      </p>
    </>
  );
}
