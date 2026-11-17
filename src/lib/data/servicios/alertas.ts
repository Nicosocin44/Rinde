import type { FotoMercado } from "@/lib/alertas/evaluar";
import { ordenarProveedores } from "@/lib/rankings/dolar";
import { mejoresDelDia } from "@/lib/rankings/pesos";
import { cargarCotizaciones, cargarRanking } from "./dolar";
import { cargarPesos } from "./pesos";

/** Foto del mercado para evaluar alertas: dólares, mejor tasa, LECAP contra plazo fijo y mejor precio de compra. */
export async function fotoMercado(): Promise<FotoMercado> {
  const [cot, pesos, usd, usdt] = await Promise.all([cargarCotizaciones(), cargarPesos(), cargarRanking("USD"), cargarRanking("USDT")]);
  const dolares: FotoMercado["dolares"] = {};
  if (cot.ok) for (const c of cot.data) dolares[c.id] = c.venta;
  const opciones = pesos.ok ? pesos.data.opciones : [];
  const { liquida } = mejoresDelDia(opciones);
  const pf = opciones.filter((o) => o.tipo === "plazo_fijo" && o.plazoDias === 30).sort((a, b) => b.tea - a.tea)[0];
  const lecap = opciones.filter((o) => o.tipo === "lecap" && (o.plazoDias ?? 0) >= 20 && (o.plazoDias ?? 0) <= 75).sort((a, b) => b.tea - a.tea)[0];
  const mejor = (r: typeof usd) => {
    if (!r.ok) return null;
    const p = ordenarProveedores(r.data.proveedores, "comprar")[0];
    return p ? { precio: p.compras, nombre: p.nombre } : null;
  };
  return {
    dolares,
    mejorTasa: liquida ? { tna: liquida.tna, nombre: liquida.nombre } : null,
    lecapVsPlazoFijo: pf && lecap ? { lecap: { nombre: lecap.nombre, tea: lecap.tea }, plazoFijo: { nombre: pf.nombre, tea: pf.tea } } : null,
    mejorCompra: { USD: mejor(usd), USDT: mejor(usdt) },
    asOf: new Date().toISOString(),
  };
}
