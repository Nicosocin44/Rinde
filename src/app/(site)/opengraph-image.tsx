import { obtenerCotizaciones, obtenerPesos } from "@/lib/data";
import { pesos, porcentaje } from "@/lib/format";
import { imagenRinde } from "@/lib/og";
import { mejoresDelDia } from "@/lib/rankings/pesos";

export const alt = "La foto de hoy: el dólar y dónde rinde más tu plata";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

export default async function Imagen() {
  const [c, p] = await Promise.all([obtenerCotizaciones(), obtenerPesos()]);
  const mep = c.ok ? c.data.find((x) => x.id === "mep") : null;
  const oficial = c.ok ? c.data.find((x) => x.id === "oficial") : null;
  const mejor = p.ok ? mejoresDelDia(p.data.opciones).liquida : null;
  return imagenRinde({
    etiqueta: "La foto de hoy",
    cifra: mep ? `MEP ${pesos(mep.venta, 2)}` : "El dólar hoy",
    detalle: mejor ? `Dónde rinde más tu plata: ${porcentaje(mejor.tna, 1)} TNA en ${mejor.nombre}` : undefined,
    filas: [oficial && { k: "Oficial", v: pesos(oficial.venta, 0) }, mep?.brecha !== null && mep?.brecha !== undefined && { k: "Brecha", v: porcentaje(mep.brecha, 1) }].filter(Boolean) as { k: string; v: string }[],
  });
}
