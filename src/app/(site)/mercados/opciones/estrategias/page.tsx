import type { Metadata } from "next";
import { VistaEstrategias } from "@/components/modules/opciones/estrategias";
import { obtenerOpciones } from "@/lib/data";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Calculadora de estrategias con opciones de GGAL",
  description: "Armá spreads, mariposas, conos o lanzamientos con las primas de hoy y mirá cuánto ganás o perdés según el precio de GGAL.",
};

export default async function OpcionesEstrategias() {
  const r = await obtenerOpciones("GGAL");
  if (!r.ok) return null;
  return <VistaEstrategias cadena={r.data} />;
}
