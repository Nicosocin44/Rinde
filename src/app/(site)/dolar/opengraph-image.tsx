import { obtenerCotizaciones, obtenerRanking } from "@/lib/data";
import { pesos } from "@/lib/format";
import { imagenRinde } from "@/lib/og";
import { ordenarProveedores } from "@/lib/rankings/dolar";

export const alt = "El dólar hoy y dónde conviene comprarlo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

export default async function Imagen() {
  const [c, r] = await Promise.all([obtenerCotizaciones(), obtenerRanking("USD")]);
  const d = (id: string) => (c.ok ? c.data.find((x) => x.id === id) : null);
  const mejor = r.ok ? ordenarProveedores(r.data.proveedores, "comprar")[0] : null;
  return imagenRinde({
    etiqueta: "El dólar MEP hoy",
    color: "verde",
    cifra: d("mep") ? pesos(d("mep")!.venta, 2) : "Dólar hoy",
    detalle: mejor ? `Más barato para comprar: ${mejor.nombre}, ${pesos(mejor.compras, 2)}` : undefined,
    filas: (["oficial", "blue", "cripto"] as const).map((id) => d(id)).filter(Boolean).map((x) => ({ k: x!.nombre, v: pesos(x!.venta, 0) })),
  });
}
