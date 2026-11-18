/**
 * Foto de las opciones de un día (la guarda scripts/guardar-opciones.mjs), por subyacente.
 * Cada serie: [compra, venta, último, volumen]; precios por acción en pesos, null si no había.
 */
export type SerieGuardada = [number | null, number | null, number | null, number];

export type FotoOpciones = Record<string, { precio: number | null; series: Record<string, SerieGuardada> }>;
