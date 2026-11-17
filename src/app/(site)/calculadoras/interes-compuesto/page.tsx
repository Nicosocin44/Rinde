import type { Metadata } from "next";
import { InteresCompuesto } from "@/components/modules/calculadoras/interes-compuesto";
import { obtenerMacro, obtenerPesos } from "@/lib/data";
import { mejoresDelDia } from "@/lib/rankings/pesos";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Calculadora de interés compuesto", description: "Cuánto juntás con un capital inicial y aportes mensuales, en pesos nominales y en pesos de hoy." };

export default async function Page() {
  const [p, m] = await Promise.all([obtenerPesos(), obtenerMacro()]);
  const mejor = p.ok ? mejoresDelDia(p.data.opciones).liquida : null;
  return (
    <>
      <h2 className="mb-8 text-h2">¿Cuánto junto si ahorro todos los meses?</h2>
      <InteresCompuesto teaSugerida={mejor?.tea ?? 0.25} inflacionSugerida={(m.ok && m.data.rem?.proximos12m) || 0.25} />
    </>
  );
}
