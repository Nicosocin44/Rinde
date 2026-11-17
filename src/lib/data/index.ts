import { cache } from "react";
import { cargarCotizaciones, cargarHistorico, cargarRanking } from "./servicios/dolar";
import { cargarFeriados } from "./servicios/feriados";
import { armarPulso } from "./servicios/inicio";
import { cargarMacro } from "./servicios/macro";
import { cargarBonos, cargarCripto, cargarMercados } from "./servicios/mercados";
import { cargarPesos } from "./servicios/pesos";

/**
 * Punto de acceso a los datos desde la UI (servidor). `cache` de React deduplica dentro de un mismo
 * render: el layout y la página pueden pedir lo mismo sin generar dos requests.
 */
export const obtenerCotizaciones = cache(cargarCotizaciones);
export const obtenerHistoricoDolar = cache(cargarHistorico);
export const obtenerRanking = cache(cargarRanking);
export const obtenerPesos = cache(cargarPesos);
export const obtenerMacro = cache(cargarMacro);
export const obtenerBonos = cache(cargarBonos);
export const obtenerMercados = cache(cargarMercados);
export const obtenerCripto = cache(cargarCripto);
export const obtenerFeriados = cache(cargarFeriados);

export const obtenerPulso = cache(async () => {
  const [c, m, p] = await Promise.all([obtenerCotizaciones(), obtenerMacro(), obtenerPesos()]);
  return armarPulso(c.ok ? c.data : null, m.ok ? m.data : null, p.ok ? p.data.opciones : null);
});
