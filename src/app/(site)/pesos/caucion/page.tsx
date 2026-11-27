import type { Metadata } from "next";
import { Respuesta } from "@/components/modules/pesos/respuesta";
import { TablaCauciones } from "@/components/modules/pesos/tablas";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerPesos } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";
import { fechaCorta } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Caución: tasas por plazo", description: "Tasas de caución colocadora en pesos por plazo." };

export default async function CaucionPage() {
  const r = await obtenerPesos();
  if (!r.ok) return <ErrorState titulo="No pudimos traer las cauciones." detalle={r.error} />;
  const { lista, vigente, ultimaRueda, fuente } = r.data.cauciones;
  const a7 = lista.reduce<(typeof lista)[number] | null>((m, c) => (!m || Math.abs(c.plazoDias - 7) < Math.abs(m.plazoDias - 7) ? c : m), null);
  if (lista.length === 0) return <ErrorState titulo="No hay tasas de caución disponibles." detalle="La fuente no informó operaciones recientes." />;
  return (
    <>
      {!vigente && (
        <div role="status" className="mb-10 flex flex-col gap-1 border-l-2 border-warn pl-4">
          <p className="font-medium text-warn">Datos desactualizados</p>
          <p className="max-w-2xl text-chico text-text-2">
            La última rueda que informa la fuente es del {ultimaRueda ? fechaCorta(ultimaRueda, true) : "—"}. Mostramos esas tasas como referencia, pero las sacamos del comparador hasta que vuelvan a estar al día.
          </p>
        </div>
      )}
      <Respuesta
        etiqueta={`Caución a ${a7?.plazoDias ?? "—"} días`}
        fraccion={a7?.tna ?? null}
        titulo="Prestás tus pesos a corto plazo, con garantía del mercado"
        contexto="La caución colocadora se opera desde un broker: le prestás plata a otro inversor que deja títulos en garantía, y el mercado garantiza la devolución. Los plazos van de 1 día a unos meses."
      />
      <TablaCauciones cauciones={lista} />
      <SourceNote className="mt-6" fuentes={[FUENTES[fuente ?? "argentinadatos"]]} actualizado={ultimaRueda} estado={vigente ? "close" : "stale"} metodologia="/metodologia#caucion" />
    </>
  );
}
