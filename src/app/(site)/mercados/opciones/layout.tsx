import Link from "next/link";
import { SubnavOpciones } from "@/components/modules/opciones/comun";
import { Cifra } from "@/components/ui/cifra";
import { Delta } from "@/components/ui/delta";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerOpciones } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";

export const revalidate = 120;

/** Marco de Opciones: el precio de GGAL, las tres solapas (cadena, tasas, estrategias), la fuente y el aviso de riesgo. */
export default async function OpcionesLayout({ children }: { children: React.ReactNode }) {
  const r = await obtenerOpciones("GGAL");
  if (!r.ok) return <ErrorState titulo="No pudimos traer las opciones de GGAL." detalle={r.error} />;
  const { subyacente: s } = r.data;
  return (
    <>
      <section className="mb-10 flex flex-col gap-3 lg:mb-14">
        <p className="text-label">
          <Link href={`/activo/${s.ticker}`} className="hover:text-text-2 hover:underline">
            Opciones de {s.nombre} ({s.ticker})
          </Link>
        </p>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Cifra valor={s.precio} className="text-hero" />
          <Delta valor={s.variacion} className="text-[17px]" />
        </div>
        <p className="max-w-2xl text-text-2">Las opciones de {s.ticker} son las más operadas de BYMA. La cadena de cada vencimiento, las tasas en pesos que se pueden armar con ellas y una calculadora de estrategias.</p>
      </section>
      <div className="mb-10 lg:mb-14">
        <SubnavOpciones />
      </div>
      {children}
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
