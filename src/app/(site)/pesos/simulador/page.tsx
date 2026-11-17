import type { Metadata } from "next";
import { Simulador } from "@/components/modules/pesos/simulador";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerMacro, obtenerPesos } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";

export const revalidate = 300;
export const metadata: Metadata = { title: "Simulador: ¿cuánto gano con mi plata a N días?", description: "Compará billeteras, fondos, plazo fijo, caución y LECAPs para tu monto y plazo, con escenarios de inflación." };

export default async function SimuladorPage() {
  const [p, m] = await Promise.all([obtenerPesos(), obtenerMacro()]);
  if (!p.ok) return <ErrorState titulo="No pudimos traer las tasas." detalle={p.error} />;
  const rem = m.ok ? m.data.rem : null;
  const proximos = rem?.mensual.slice(-6) ?? [];
  const inflacionRem = proximos.length ? proximos.reduce((a, r) => a + r.valor, 0) / proximos.length : null;
  return (
    <>
      <div className="mb-10 flex flex-col gap-2">
        <h2 className="text-h2">Ponés tu plata a un plazo. Te mostramos cada alternativa.</h2>
        <p className="max-w-2xl text-text-2">Nominal (en pesos) y real (descontando la inflación supuesta). El orden es por ganancia.</p>
      </div>
      <Simulador opciones={p.data.opciones} inflacionRem={inflacionRem} />
      <SourceNote className="mt-8" fuentes={[FUENTES.argentinadatos, FUENTES.cnv, FUENTES.data912, FUENTES.bcra]} actualizado={p.asOf} estado={p.status} metodologia="/metodologia#simulador">
        {rem && (
          <>
            <span aria-hidden>·</span>
            <span>Inflación esperada: REM {rem.informe}</span>
          </>
        )}
      </SourceNote>
    </>
  );
}
