import type { OpcionPesos } from "@/lib/data/types";

export const TIPO_OPCION: Record<OpcionPesos["tipo"], string> = {
  billetera: "Billetera",
  cuenta: "Cuenta remunerada",
  fci: "Fondo de dinero",
  plazo_fijo: "Plazo fijo",
  caucion: "Caución",
  lecap: "Letra del Tesoro",
};

export const LIQUIDEZ_OPCION: Record<OpcionPesos["liquidez"], string> = {
  inmediata: "Al instante",
  "24hs": "En 24 h",
  al_vencimiento: "Al vencimiento",
  mercado: "Vendible antes",
};

/** Explicación de una línea de cada garantía, para que se entienda el riesgo sin jerga. */
export const GARANTIA: Record<OpcionPesos["garantia"], string> = {
  SEDESA: "Depósito garantizado por SEDESA hasta el tope vigente",
  "Tesoro nacional": "Lo paga el Estado nacional al vencimiento",
  "Cartera del fondo": "Sin garantía: el valor depende de lo que compra el fondo",
  "Garantía de mercado": "La garantiza el mercado (BYMA)",
  "Sin garantía": "Sin garantía de depósitos",
};
