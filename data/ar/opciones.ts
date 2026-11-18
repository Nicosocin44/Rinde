/**
 * Acciones con opciones en BYMA. El prefijo es el de los símbolos de data912 (GFGC5400DI → GFG = GGAL).
 * Verificado el 18/11/2026 en data912 /live/arg_options: GGAL concentra casi todo el volumen.
 * Para sumar otra (YPF, PAMP…) alcanza con agregarla acá.
 */
export type SubyacenteOpciones = { ticker: string; prefijo: string; nombre: string; panel: "arg_stocks"; lote: number };

export const SUBYACENTES_OPCIONES: Record<string, SubyacenteOpciones> = {
  GGAL: { ticker: "GGAL", prefijo: "GFG", nombre: "Grupo Financiero Galicia", panel: "arg_stocks", lote: 100 },
};
