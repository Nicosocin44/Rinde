/** Foto de las tasas de un día (la guarda scripts/guardar-tasas.mjs). Tasas como fracción; null si no informó. */
export type FotoTasas = {
  /** Plazo fijo a 30 días por banco (nombre como lo informa el BCRA). */
  plazoFijo: Record<string, { tna: number | null; tnaNoClientes: number | null }>;
  /** Billeteras y cuentas remuneradas. */
  cuentas: Record<string, { tna: number; tope: number | null; fecha: string | null }>;
  /** LECAPs y BONCAPs: precio por 100 VN y TEA. */
  letras: Record<string, { precio: number; tea: number; vencimiento: string | null; dias: number | null }>;
};
