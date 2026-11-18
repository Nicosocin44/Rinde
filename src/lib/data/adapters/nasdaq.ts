import { z } from "zod";
import { sumarDias } from "@/lib/calculos/fechas";
import { traerJson } from "../http";

/**
 * Nasdaq: calendario de resultados de empresas y calendario económico de EE.UU. (api.nasdaq.com, sin autenticación).
 * No es una API oficial: antes del lanzamiento comercial hay que revisar sus condiciones (ver PROGRESO.md).
 *
 * Verificado el 19/11/2026:
 * - Resultados: el día pedido es el día del anuncio (TGT y LOW el miércoles 18/11, WMT el jueves 19/11).
 * - Calendario económico: viene CORRIDO UN DÍA. Lo que pasa el día D aparece al pedir D + 1 (los pedidos de subsidio
 *   por desempleo de un jueves salen el viernes; el informe de empleo del viernes 4/12, el sábado 5/12; la decisión de
 *   la Fed del 9/12, el 10/12). `eventosEconomicos` lo compensa. Las horas son de Nueva York.
 */
const UA = { "user-agent": "Mozilla/5.0 (compatible; Rinde/1.0)" };
const texto = z.string().nullish();

const resultadosSchema = z.object({
  data: z
    .object({
      rows: z.array(z.object({ symbol: texto, name: texto, time: texto, marketCap: texto, epsForecast: texto, fiscalQuarterEnding: texto })).nullish(),
    })
    .nullish(),
});

const economicosSchema = z.object({
  data: z.object({ rows: z.array(z.object({ gmt: texto, country: texto, eventName: texto, previous: texto, consensus: texto, actual: texto })).nullish() }).nullish(),
});

export type ResultadoNasdaq = { simbolo: string; nombre: string; momento: "antes" | "despues" | null; capitalizacion: number; epsEstimado: string | null };
export type EventoNasdaq = { fecha: string; horaNY: string | null; nombre: string; anterior: string | null; esperado: string | null; real: string | null };

const limpio = (x: string | null | undefined) => {
  const v = (x ?? "").replace(/&nbsp;/g, " ").trim();
  return v && v !== "N/A" ? v : null;
};

/** Empresas que presentan resultados ese día (en EE.UU.). Caché de 6 horas. */
export async function resultadosDelDia(fecha: string): Promise<ResultadoNasdaq[]> {
  const r = await traerJson(`https://api.nasdaq.com/api/calendar/earnings?date=${fecha}`, resultadosSchema, { fuente: "nasdaq", revalidate: 21_600, timeoutMs: 8000, headers: UA });
  return (r.data?.rows ?? []).flatMap((x) => {
    const simbolo = limpio(x.symbol);
    if (!simbolo) return [];
    const momento = x.time === "time-pre-market" ? "antes" : x.time === "time-after-hours" ? "despues" : null;
    return [{ simbolo, nombre: limpio(x.name) ?? simbolo, momento, capitalizacion: Number((x.marketCap ?? "").replace(/[^\d]/g, "")) || 0, epsEstimado: limpio(x.epsForecast) }];
  });
}

/** Datos económicos de EE.UU. del día `fecha` (compensa el corrimiento de un día de la fuente). Caché de 1 hora. */
export async function eventosEconomicos(fecha: string): Promise<EventoNasdaq[]> {
  const r = await traerJson(`https://api.nasdaq.com/api/calendar/economicevents?date=${sumarDias(fecha, 1)}`, economicosSchema, { fuente: "nasdaq", revalidate: 3600, timeoutMs: 8000, headers: UA });
  return (r.data?.rows ?? []).flatMap((x) => {
    const nombre = limpio(x.eventName);
    if (!nombre || x.country !== "United States") return [];
    const hora = limpio(x.gmt);
    return [{ fecha, horaNY: hora && /^\d{2}:\d{2}$/.test(hora) ? hora : null, nombre, anterior: limpio(x.previous), esperado: limpio(x.consensus), real: limpio(x.actual) }];
  });
}
