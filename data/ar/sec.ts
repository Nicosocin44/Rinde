/**
 * Cómo encontrar los balances de un activo de BYMA en la SEC (verificado el 18/11/2026 contra company_tickers.json).
 */

/** Acciones argentinas con ADR en Nueva York: presentan sus balances ante la SEC con el ticker del ADR. */
export const ADR_DE_ACCION: Record<string, string> = {
  GGAL: "GGAL",
  YPFD: "YPF",
  PAMP: "PAM",
  BMA: "BMA",
  BBAR: "BBAR",
  SUPV: "SUPV",
  CEPU: "CEPU",
  TGSU2: "TGS",
  TECO2: "TEO",
  LOMA: "LOMA",
  EDN: "EDN",
  CRES: "CRESY",
  IRSA: "IRS",
};

/** CEDEARs cuyo ticker en BYMA no es el de Estados Unidos (el resto coincide). */
export const TICKER_EEUU_DE_CEDEAR: Record<string, string> = {
  BRKB: "BRK-B",
  "BRK.B": "BRK-B",
};
