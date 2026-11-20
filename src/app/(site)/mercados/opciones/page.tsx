import { HISTORIAL_OPCIONES } from "@data/historico/opciones";
import type { Metadata } from "next";
import { VistaCadena } from "@/components/modules/opciones/cadena";
import { obtenerOpciones } from "@/lib/data";
import { armarHistorial } from "@/lib/opciones/historial";

export const revalidate = 15;
export const metadata: Metadata = {
  title: "Opciones de GGAL: cadena y volatilidad implícita",
  description: "Calls y puts de GGAL en BYMA con volatilidad implícita, delta, sonrisa de volatilidad e historial de primas.",
};

export default async function OpcionesCadena() {
  const r = await obtenerOpciones("GGAL");
  // El error se muestra en el layout.
  if (!r.ok) return null;
  const vigentes = new Set(r.data.vencimientos.flatMap((v) => v.filas.flatMap((f) => [f.call?.simbolo, f.put?.simbolo].filter((x): x is string => !!x))));
  return <VistaCadena cadena={r.data} historial={armarHistorial(HISTORIAL_OPCIONES, r.data.subyacente.ticker, vigentes)} />;
}
