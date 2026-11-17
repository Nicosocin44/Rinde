import type { Metadata } from "next";
import { Comparador } from "@/components/modules/pesos/comparador";
import { Desplegable, Excluidos } from "@/components/modules/pesos/excluidos";
import { Respuesta } from "@/components/modules/pesos/respuesta";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { ProviderMark } from "@/components/ui/provider-mark";
import { obtenerPesos } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";
import { pesos as fmtPesos, pesosCompacto, porcentaje } from "@/lib/format";
import { gananciaPeriodo } from "@/lib/calculos";
import { mejoresDelDia } from "@/lib/rankings/pesos";
import { TIPO_OPCION } from "@/components/modules/pesos/etiquetas";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "¿Dónde rinde más tu plata? Comparador de tasas en pesos",
  description: "Billeteras, cuentas remuneradas, fondos money market, plazo fijo y LECAPs comparados en TEA, con la ganancia en pesos.",
};

export default async function ComparadorPage() {
  const r = await obtenerPesos();
  if (!r.ok) return <ErrorState titulo="No pudimos traer las tasas." detalle={r.error} />;
  const { liquida, a30 } = mejoresDelDia(r.data.opciones);
  const especiales = r.data.opciones.filter((o) => o.condicionEspecial);

  return (
    <>
      <Respuesta
        etiqueta="La mejor tasa sin plazo, hoy"
        fraccion={liquida?.tna ?? null}
        titulo={liquida ? `${liquida.nombre} · ${TIPO_OPCION[liquida.tipo].toLowerCase()}` : "Sin datos"}
        contexto={
          liquida && (
            <>
              Con $ 1.000.000 ganás {fmtPesos(gananciaPeriodo(1_000_000, liquida.tea, 30).toNumber())} por mes y la sacás cuando quieras.
              {a30 && ` Si podés esperar 30 días, ${a30.nombre} paga ${porcentaje(a30.tna, 1)} TNA.`}
            </>
          )
        }
      />
      <h2 className="mb-2 text-h3">Todas las opciones, en TEA</h2>
      <p className="mb-6 max-w-2xl text-chico text-text-2">
        La TEA es la tasa anual con los intereses reinvertidos: es la única forma justa de comparar una billetera que paga todos los días con un plazo fijo a 30 días. En modo Pro ves también la TNA y la TEM.
      </p>
      <Comparador opciones={r.data.opciones} />
      <SourceNote className="mt-6" fuentes={[FUENTES.argentinadatos, FUENTES.cnv, FUENTES.data912]} actualizado={r.asOf} estado={r.status} metodologia="/metodologia#tasas" />
      <div className="mt-10">
        {especiales.length > 0 && (
          <Desplegable titulo={`Tasas con condiciones especiales (${especiales.length})`} ayuda="Piden plan sueldo, un consumo mínimo o ser persona jurídica: no son comparables.">
            <ul>
              {especiales.map((o) => (
                <li key={o.id} className="flex items-center gap-3 border-b border-border py-3 last:border-0">
                  <ProviderMark proveedorId={o.proveedorId} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{o.nombre}</p>
                    <p className="text-chico text-text-3">{o.condicion}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-medium">{porcentaje(o.tna, 1)} TNA</p>
                    {o.tope && <p className="text-micro">hasta {pesosCompacto(o.tope)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Desplegable>
        )}
        <Excluidos excluidos={r.excluded ?? []} que="tasas o instrumentos" />
      </div>
    </>
  );
}
