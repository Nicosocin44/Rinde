import { traerJson } from "../http";
import { revalidar } from "../freshness";
import { d912CclSchema, d912HistoricoSchema, d912MepSchema, d912PanelSchema } from "../schemas";

/**
 * data912: precios de BYMA con demora (letras, bonos, ONs, CEDEARs, acciones). Sin autenticación.
 * Unidades verificadas el 16/11/2026: letras y bonos cotizan por cada 100 de valor nominal ORIGINAL
 * (AL30 = $81.500 por 100 VN; S30N6 = $128,88 por 100 VN).
 */
const BASE = "https://data912.com";
const FUENTE = "data912";

export type Panel = "arg_notes" | "arg_bonds" | "arg_corp" | "arg_cedears" | "arg_stocks" | "usa_stocks";

export function panel(nombre: Panel) {
  return traerJson(`${BASE}/live/${nombre}`, d912PanelSchema, { fuente: FUENTE, revalidate: revalidar("mercado") });
}

/** MEP implícito por activo (bonos y CEDEARs), con precios en ARS y USD. */
export function mepImplicitos() {
  return traerJson(`${BASE}/live/mep`, d912MepSchema, { fuente: FUENTE, revalidate: revalidar("mercado") });
}

export function cclImplicitos() {
  return traerJson(`${BASE}/live/ccl`, d912CclSchema, { fuente: FUENTE, revalidate: revalidar("mercado") });
}

/** Cierres diarios. `clase`: stocks, cedears o bonds (las letras van con bonds). */
export function historico(clase: "stocks" | "cedears" | "bonds", ticker: string) {
  return traerJson(`${BASE}/historical/${clase}/${encodeURIComponent(ticker)}`, d912HistoricoSchema, {
    fuente: FUENTE,
    revalidate: revalidar("historico"),
    timeoutMs: 12000,
  });
}
