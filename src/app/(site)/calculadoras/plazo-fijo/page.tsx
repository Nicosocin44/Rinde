import type { Metadata } from "next";
import { CalculadoraPlazoFijo } from "@/components/modules/calculadoras/plazo-fijo";
import { SourceNote } from "@/components/ui/frescura";
import { obtenerMacro, obtenerPesos } from "@/lib/data";
import { FUENTES } from "@/lib/data/types";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Calculadora de plazo fijo", description: "Cuánto cobrás por un plazo fijo y si le ganás a la inflación esperada." };

export default async function Page() {
  const [p, m] = await Promise.all([obtenerPesos(), obtenerMacro()]);
  const mejor = p.ok ? p.data.plazosFijos[0] : null;
  const rem = m.ok ? m.data.rem?.mensual.slice(-6) : null;
  const inflacionMensual = rem?.length ? rem.reduce((a, r) => a + r.valor, 0) / rem.length : 0.02;
  return (
    <>
      <h2 className="mb-8 text-h2">¿Cuánto cobro y le gano a la inflación?</h2>
      <CalculadoraPlazoFijo tnaSugerida={mejor?.porPlazo[30] ?? 0.22} bancoSugerido={mejor?.banco ?? "—"} inflacionMensual={inflacionMensual} />
      <SourceNote className="mt-8" fuentes={[FUENTES.argentinadatos, FUENTES.bcra]} actualizado={p.ok ? p.asOf : null} estado={p.ok ? p.status : "stale"} metodologia="/metodologia#plazo-fijo" />
    </>
  );
}
