import type { Metadata } from "next";
import { Respuesta } from "@/components/modules/pesos/respuesta";
import { TablaFondos } from "@/components/modules/pesos/tablas";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerPesos } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";
import { fechaCorta, porcentaje } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Fondos money market: rendimiento hoy", description: "Rendimiento de los fondos de dinero en pesos, calculado desde la cuotaparte." };

export default async function Fondos() {
  const r = await obtenerPesos();
  if (!r.ok) return <ErrorState titulo="No pudimos traer los fondos." detalle={r.error} />;
  const fondos = r.data.fondos;
  const mejor = fondos[0];
  return (
    <>
      <Respuesta
        etiqueta="El fondo de dinero que más rindió esta semana"
        fraccion={mejor?.tna ?? null}
        titulo={mejor ? `${mejor.fondo} · clase ${mejor.clase}` : "Sin datos"}
        contexto={
          mejor && (
            <>
              Es lo que rindió entre el {fechaCorta(mejor.fechaVcpAnterior)} y el {fechaCorta(mejor.fechaVcp)}, anualizado ({porcentaje(mejor.tea, 1)} TEA). Lo que rindió no garantiza lo que va a rendir: estos fondos no
              tienen tasa fija.
            </>
          )
        }
      />
      <TablaFondos fondos={fondos} />
      <SourceNote className="mt-6" fuentes={[FUENTES.cnv, FUENTES.argentinadatos]} actualizado={r.data.estados.fondos.asOf} estado="close" metodologia="/metodologia#fci">
        <span aria-hidden>·</span>
        <span>Una clase por fondo (la de acceso minorista)</span>
      </SourceNote>
    </>
  );
}
