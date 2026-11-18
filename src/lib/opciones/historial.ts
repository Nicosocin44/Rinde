import type { FotoOpciones } from "@data/historico/opciones/tipos";

/** Historial de primas de un subyacente, solo de las series que siguen vigentes. Puro: recibe el historial guardado. */
export type HistorialOpciones = {
  /** Días guardados y desde cuándo. */
  dias: number;
  desde: string | null;
  /** Por serie: la prima de cada día (punto medio de las puntas o, si no había, el último si operó). */
  series: Record<string, { fecha: string; prima: number }[]>;
  /** Precio de cierre de la acción cada día. */
  precio: { fecha: string; valor: number }[];
};

export function armarHistorial(historial: Record<string, FotoOpciones>, ticker: string, vigentes: ReadonlySet<string>): HistorialOpciones {
  const fechas = Object.keys(historial)
    .filter((f) => historial[f]?.[ticker])
    .sort();
  const series: HistorialOpciones["series"] = {};
  const precio: HistorialOpciones["precio"] = [];
  for (const fecha of fechas) {
    const foto = historial[fecha]![ticker]!;
    if (foto.precio) precio.push({ fecha, valor: foto.precio });
    for (const [simbolo, [compra, venta, ultimo, volumen]] of Object.entries(foto.series)) {
      if (!vigentes.has(simbolo)) continue;
      const prima = compra && venta && compra <= venta ? (compra + venta) / 2 : volumen > 0 ? ultimo : null;
      if (prima === null || !(prima > 0)) continue;
      (series[simbolo] ??= []).push({ fecha, prima });
    }
  }
  return { dias: fechas.length, desde: fechas[0] ?? null, series, precio };
}
