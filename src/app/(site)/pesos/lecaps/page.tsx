import type { Metadata } from "next";
import { Suspense } from "react";
import { Lecaps } from "@/components/modules/pesos/lecaps";
import { Excluidos } from "@/components/modules/pesos/excluidos";
import { Respuesta } from "@/components/modules/pesos/respuesta";
import { ErrorState, Skeleton } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerPesos } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";
import { porcentaje } from "@/lib/format";

export const revalidate = 120;
export const metadata: Metadata = { title: "LECAPs y BONCAPs: curva de tasas y calculadora", description: "Curva de letras capitalizables del Tesoro con TNA, TEA y TEM, y calculadora de cobro al vencimiento." };

export default async function LecapsPage() {
  const r = await obtenerPesos();
  if (!r.ok) return <ErrorState titulo="No pudimos traer las letras." detalle={r.error} />;
  const curva = r.data.curva;
  const enCurva = curva.letras.filter((l) => l.enCurva);
  if (enCurva.length === 0) return <ErrorState titulo="No hay letras con precio hoy." detalle="Puede ser feriado o la fuente no respondió. Volvé más tarde." />;
  const min = Math.min(...enCurva.map((l) => l.tea));
  const max = Math.max(...enCurva.map((l) => l.tea));
  const corta = enCurva[0]!;
  const larga = enCurva[enCurva.length - 1]!;
  const excluidas = (r.excluded ?? []).filter((e) => /^[ST]\d{2}[A-Z]\d$/.test(e.id));

  return (
    <>
      <Respuesta
        etiqueta="La curva hoy"
        fraccion={max}
        sufijo="TEA"
        titulo={`Rinden entre ${porcentaje(min, 1)} y ${porcentaje(max, 1)} TEA.`}
        contexto={
          <>
            {larga.tea > corta.tea ? "A más plazo, más tasa" : "Hoy los plazos cortos pagan más que los largos"}: {corta.ticker} vence en {corta.dias} días y {larga.ticker} en {larga.dias}. Son letras del Tesoro a tasa fija: sabés
            hoy cuánto cobrás al vencimiento.
          </>
        }
      />
      <Suspense fallback={<Skeleton className="h-[360px] w-full rounded-(--radius-card)" />}>
        <Lecaps curva={curva} />
      </Suspense>
      <SourceNote className="mt-6" fuentes={[FUENTES.data912, FUENTES.argentinadatos]} actualizado={r.asOf} estado={r.status} metodologia="/metodologia#lecaps">
        <span aria-hidden>·</span>
        <span>Días contados desde la liquidación en 24 h</span>
      </SourceNote>
      <div className="mt-10">
        <Excluidos excluidos={excluidas} que="letras" />
      </div>
    </>
  );
}
