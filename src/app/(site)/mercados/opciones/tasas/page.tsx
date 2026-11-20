import type { Metadata } from "next";
import { VistaTasas } from "@/components/modules/opciones/tasas";
import { obtenerOpciones } from "@/lib/data";

export const revalidate = 15;
export const metadata: Metadata = {
  title: "Tasas con opciones de GGAL: lanzamiento cubierto y cajas",
  description: "La TNA de un lanzamiento cubierto y de las cajas de GGAL, con tu comisión, comparada con caución, LECAP y plazo fijo.",
};

export default async function OpcionesTasas() {
  const r = await obtenerOpciones("GGAL");
  if (!r.ok) return null;
  return <VistaTasas cadena={r.data} />;
}
