import type { Metadata } from "next";
import { CalculadoraInflacion } from "@/components/modules/calculadoras/inflacion";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerMacro } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";

export const revalidate = 43200;
export const metadata: Metadata = { title: "Calculadora de inflación", description: "Cuánto valen hoy tus pesos de otra fecha, según el IPC del INDEC." };

export default async function Page() {
  const m = await obtenerMacro();
  if (!m.ok || m.data.inflacionMensual.length === 0) return <ErrorState titulo="No pudimos traer la inflación." />;
  return (
    <>
      <h2 className="mb-8 text-h2">¿Cuánto valen hoy mis pesos de antes?</h2>
      <CalculadoraInflacion serie={m.data.inflacionMensual} />
      <SourceNote className="mt-6" fuentes={[FUENTES.argentinadatos]} actualizado={m.data.inflacionMensual.at(-1)?.fecha} estado="close" metodologia="/metodologia#inflacion">
        <span aria-hidden>·</span>
        <span>IPC nacional, INDEC</span>
      </SourceNote>
    </>
  );
}
