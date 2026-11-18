import { cache } from "react";
import { cargarActivo } from "./servicios/activo";
import { cargarFichaBono, cargarFichaCripto, cargarFichaLetra } from "./servicios/fichas";
import { cargarQueHubiera } from "./servicios/que-hubiera";
import { cargarCotizaciones, cargarHistorico, cargarRanking } from "./servicios/dolar";
import { cargarFeriados } from "./servicios/feriados";
import { armarPulso } from "./servicios/inicio";
import { cargarMacro } from "./servicios/macro";
import { cargarBonos, cargarCripto, cargarMercados } from "./servicios/mercados";
import { cargarNoticias } from "./servicios/noticias";
import { cargarOpciones } from "./servicios/opciones";
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
export const obtenerNoticias = cache(cargarNoticias);
export const obtenerActivo = cache(cargarActivo);
export const obtenerFichaBono = cache(cargarFichaBono);
export const obtenerFichaLetra = cache(cargarFichaLetra);
export const obtenerFichaCripto = cache(cargarFichaCripto);
export const obtenerQueHubiera = cache(cargarQueHubiera);
export const obtenerOpciones = cache(cargarOpciones);

export const obtenerPulso = cache(async () => {
  const [c, m, p] = await Promise.all([obtenerCotizaciones(), obtenerMacro(), obtenerPesos()]);
  return armarPulso(c.ok ? c.data : null, m.ok ? m.data : null, p.ok ? p.data.opciones : null);
});
