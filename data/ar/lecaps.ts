/**
 * LECAPs (letras) y BONCAPs (bonos) capitalizables del Tesoro.
 *
 * `vf` = valor final por cada 100 de valor nominal: lo que paga al vencimiento.
 *
 * ORIGEN DEL VALOR FINAL (16/11/2026): no pudimos bajar los comunicados de licitación del Ministerio de
 * Economía en esta sesión, así que el VF de cada letra está DERIVADO del precio y la TEA que publica
 * ArgentinaDatos (VF = precio × (1 + TEA)^(días/365)), con una diferencia menor a 0,01 %. Por eso todas
 * llevan `vfEstimado: true`. T15E7 coincide con el valor oficial conocido (161,104).
 * Pendiente: reemplazar por el valor oficial de cada licitación y pasar `vfEstimado` a false.
 *
 * Si aparece una letra nueva que no está en esta tabla, el servicio deriva su VF de la misma forma
 * en tiempo real y la marca como estimada: una licitación nueva nunca deja la tabla desactualizada.
 */

export type LecapEstatica = {
  ticker: string;
  tipo: "LECAP" | "BONCAP";
  vencimiento: string;
  vf: number;
  vfEstimado: boolean;
};

export const LECAPS: LecapEstatica[] = [
  { ticker: "S30N6", tipo: "LECAP", vencimiento: "2026-11-30", vf: 129.889, vfEstimado: true },
  { ticker: "T15E7", tipo: "BONCAP", vencimiento: "2027-01-15", vf: 161.104, vfEstimado: true },
  { ticker: "S29E7", tipo: "LECAP", vencimiento: "2027-01-29", vf: 111.687, vfEstimado: true },
  { ticker: "S26F7", tipo: "LECAP", vencimiento: "2027-02-26", vf: 108.368, vfEstimado: true },
  { ticker: "T30A7", tipo: "BONCAP", vencimiento: "2027-04-30", vf: 157.342, vfEstimado: true },
  { ticker: "T31Y7", tipo: "BONCAP", vencimiento: "2027-05-31", vf: 151.565, vfEstimado: true },
  { ticker: "T30J7", tipo: "BONCAP", vencimiento: "2027-06-30", vf: 156.037, vfEstimado: true },
];

/** Patrón de tickers de capitalizables: S o T + día (2 dígitos) + mes (letra) + año (1 dígito). Ej.: S30N6, T15E7. */
export const PATRON_LECAP = /^[ST]\d{2}[A-Z]\d$/;

export function tipoPorTicker(ticker: string): "LECAP" | "BONCAP" {
  return ticker.startsWith("S") ? "LECAP" : "BONCAP";
}
