import { obtenerPesos } from "@/lib/data";
import { porcentaje } from "@/lib/format";
import { imagenRinde } from "@/lib/og";
import { mejoresDelDia } from "@/lib/rankings/pesos";

export const alt = "Dónde rinde más tu plata hoy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

export default async function Imagen() {
  const p = await obtenerPesos();
  const { liquida, a30 } = p.ok ? mejoresDelDia(p.data.opciones) : { liquida: null, a30: null };
  const lecaps = p.ok ? p.data.curva.letras.filter((l) => l.enCurva) : [];
  return imagenRinde({
    etiqueta: "Dónde rinde más tu plata hoy",
    cifra: liquida ? `${porcentaje(liquida.tna, 1)} TNA` : "Tasas en pesos",
    detalle: liquida ? `${liquida.nombre}, con la plata disponible al instante` : undefined,
    filas: [
      a30 && { k: "A 30 días", v: `${porcentaje(a30.tna, 1)} · ${a30.nombre}` },
      lecaps.length > 1 && { k: "LECAPs", v: `${porcentaje(Math.min(...lecaps.map((l) => l.tea)), 1)} a ${porcentaje(Math.max(...lecaps.map((l) => l.tea)), 1)} TEA` },
    ].filter(Boolean) as { k: string; v: string }[],
  });
}
