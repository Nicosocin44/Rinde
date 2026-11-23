import { d } from "./decimal";

/**
 * Cuánto subió o bajó algo entre dos puntos del gráfico (arrastrando el mouse o con dos dedos), como en Google Finance.
 * Puro: recibe los puntos dibujados ([fecha, valor]) y los dos índices elegidos, en cualquier orden.
 */

export type Tramo = {
  desde: [string, number];
  hasta: [string, number];
  /** Hasta − desde, en la unidad de la serie (pesos, dólares, puntos). */
  diferencia: number;
  /** Fracción (0,1 = +10 %); con `en: "puntos"`, la diferencia en puntos. Null si el punto de partida es 0 o negativo. */
  variacion: number | null;
};

/** El índice de dato más cercano a una posición del eje (la librería la da con decimales y puede caer afuera). */
export function indiceCercano(posicion: number, cantidad: number): number | null {
  if (cantidad <= 0 || !Number.isFinite(posicion)) return null;
  return Math.min(cantidad - 1, Math.max(0, Math.round(posicion)));
}

/** El tramo entre dos índices (el más viejo primero). Null si son el mismo punto o alguno no existe. */
export function tramoEntre(puntos: readonly [string, number][], i: number, j: number, en: "porcentaje" | "puntos" = "porcentaje"): Tramo | null {
  if (i === j) return null;
  const [a, b] = i < j ? [i, j] : [j, i];
  const desde = puntos[a];
  const hasta = puntos[b];
  if (!desde || !hasta) return null;
  const diferencia = d(hasta[1]).minus(desde[1]);
  const variacion = en === "puntos" ? diferencia.toNumber() : desde[1] > 0 ? d(hasta[1]).div(desde[1]).minus(1).toNumber() : null;
  return { desde, hasta, diferencia: diferencia.toNumber(), variacion };
}
