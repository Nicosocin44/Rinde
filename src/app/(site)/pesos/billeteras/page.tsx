import type { Metadata } from "next";
import { Respuesta } from "@/components/modules/pesos/respuesta";
import { TablaOpciones } from "@/components/modules/pesos/tablas";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { gananciaPeriodo } from "@/lib/calculos";
import { obtenerPesos } from "@/lib/data";
import { FUENTES, type OpcionPesos } from "@/lib/data/types";
import { pesos, pesosCompacto } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Billeteras y cuentas remuneradas: cuánto pagan hoy", description: "Mercado Pago, Ualá, Naranja X, Belo y bancos: tasa, tope y condiciones de cada cuenta remunerada." };

export default async function Billeteras() {
  const r = await obtenerPesos();
  if (!r.ok) return <ErrorState titulo="No pudimos traer las tasas." detalle={r.error} />;
  // Billeteras y cuentas, más los fondos que pagan las apps (Mercado Pago, Ualá…): así rinde la plata ahí adentro.
  const deApps: OpcionPesos[] = r.data.fondos
    .filter((f) => f.accesoPor)
    .map((f) => {
      const o = r.data.opciones.find((x) => x.id === f.id)!;
      return { ...o, nombre: f.accesoPor!, detalle: `Rinde con el fondo ${f.fondo}`, tipo: "billetera" as const };
    })
    .filter(Boolean);
  const opciones = [...r.data.opciones.filter((o) => (o.tipo === "billetera" || o.tipo === "cuenta") && !o.condicionEspecial), ...deApps].sort((a, b) => b.tna - a.tna);
  const mejor = opciones[0];
  return (
    <>
      <Respuesta
        etiqueta="La billetera que más paga hoy"
        fraccion={mejor?.tna ?? null}
        titulo={mejor ? `${mejor.nombre}${mejor.detalle ? ` · ${mejor.detalle.toLowerCase()}` : ""}` : "Sin datos"}
        contexto={
          mejor && (
            <>
              Con $ 1.000.000 ganás {pesos(gananciaPeriodo(Math.min(1_000_000, mejor.tope ?? Infinity), mejor.tea, 30).toNumber())} por mes
              {mejor.tope ? `; la tasa vale hasta ${pesosCompacto(mejor.tope)}` : ", sin tope"}. Ojo con los topes: arriba de ese monto, el resto no rinde o rinde menos.
            </>
          )
        }
      />
      <TablaOpciones opciones={opciones} etiqueta="Billeteras y cuentas remuneradas" />
      <SourceNote className="mt-6" fuentes={[FUENTES.argentinadatos, FUENTES.cnv]} actualizado={r.data.estados.cuentas.asOf} estado="close" metodologia="/metodologia#tasas">
        <span aria-hidden>·</span>
        <span>Las apps que pagan con un fondo money market muestran la tasa de ese fondo</span>
      </SourceNote>
    </>
  );
}
