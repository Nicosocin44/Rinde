import { pais } from "@/config/countries/ar";
import { hoyAR } from "@/lib/calculos/fechas";
import * as ad from "../adapters/argentinadatos";

/** Feriados del año actual y el siguiente. Si la API falla, usa la tabla de respaldo de countries/ar.ts. */
export async function cargarFeriados(): Promise<Set<string>> {
  const anio = Number(hoyAR().slice(0, 4));
  const respaldo = new Set<string>(pais.feriadosRespaldo);
  try {
    const [a, b] = await Promise.all([ad.feriados(anio), ad.feriados(anio + 1).catch(() => [])]);
    const desdeApi = [...a, ...b].map((f) => f.fecha);
    if (desdeApi.length < 10) return respaldo;
    return new Set([...desdeApi, ...respaldo]);
  } catch {
    return respaldo;
  }
}
