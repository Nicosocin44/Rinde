import type { Metadata } from "next";
import Link from "next/link";
import { HistorialPlazoFijo } from "@/components/modules/pesos/historial-tasas";
import { Respuesta } from "@/components/modules/pesos/respuesta";
import { TablaPlazoFijo } from "@/components/modules/pesos/tablas";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { interesPlazoFijo } from "@/lib/calculos";
import { obtenerPesos } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";
import { pesos } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Plazo fijo: tasas por banco hoy", description: "Tasa de plazo fijo de cada banco a 30, 60, 90, 180 y 365 días, con la TEA y lo que ganás." };

export default async function PlazoFijo() {
  const r = await obtenerPesos();
  if (!r.ok) return <ErrorState titulo="No pudimos traer las tasas de plazo fijo." detalle={r.error} />;
  const bancos = r.data.plazosFijos;
  const mejor = bancos[0];
  const tna = mejor?.porPlazo[30] ?? null;
  return (
    <>
      <Respuesta
        etiqueta="La mejor tasa a 30 días"
        fraccion={tna}
        titulo={mejor ? `${mejor.banco}${mejor.tnaNoClientes ? "" : " · para clientes"}` : "Sin datos"}
        contexto={
          tna && (
            <>
              Con $ 1.000.000 a 30 días cobrás {pesos(interesPlazoFijo(1_000_000, tna, 30).toNumber())} de intereses.{" "}
              <Link href="/calculadoras/plazo-fijo" className="text-accent hover:underline">
                Calculá con tu monto
              </Link>
            </>
          )
        }
      />
      <TablaPlazoFijo bancos={bancos} />
      <HistorialPlazoFijo />
      <SourceNote className="mt-6" fuentes={[FUENTES.argentinadatos, FUENTES.bcra]} actualizado={r.data.estados.plazosFijos.asOf} estado={r.data.estados.plazosFijos.ok ? "close" : "stale"} metodologia="/metodologia#plazo-fijo">
        <span aria-hidden>·</span>
        <span>Tasas informadas al BCRA por cada banco · depósitos garantizados por SEDESA</span>
      </SourceNote>
    </>
  );
}
