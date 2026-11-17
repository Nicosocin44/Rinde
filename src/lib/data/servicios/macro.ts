import * as ad from "../adapters/argentinadatos";
import { conRespaldo } from "../cache";
import { FUENTES, type Macro } from "../types";
import type { z } from "zod";
import type { adRemSchema } from "../schemas";

const INDICADOR_IPC = "Precios minoristas (IPC nivel general-Nacional; INDEC)";

export function normalizarRem(filas: z.infer<typeof adRemSchema>): Macro["rem"] {
  // Usamos la muestra completa ("todos"), no el top 10 de pronosticadores.
  const ipc = filas.filter((f) => f.indicador === INDICADOR_IPC && f.mediana !== null && (!f.muestra || f.muestra === "todos"));
  if (ipc.length === 0) return null;
  const proximos = ipc.find((f) => f.periodoTipo === "proximos_12_meses");
  const porMes = new Map<string, number>();
  for (const f of ipc) {
    if (f.periodoTipo !== "mensual" || !f.periodoDesde) continue;
    const mes = f.periodoDesde.slice(0, 7);
    if (!porMes.has(mes)) porMes.set(mes, (f.mediana ?? 0) / 100);
  }
  const mensual = [...porMes].map(([mes, valor]) => ({ mes, valor })).sort((a, b) => a.mes.localeCompare(b.mes));
  return {
    informe: ipc[0]!.informe,
    proximos12m: proximos?.mediana !== undefined && proximos.mediana !== null ? proximos.mediana / 100 : null,
    mensual,
    url: ipc[0]!.publicacionUrl ?? "https://www.bcra.gob.ar/relevamiento-de-expectativas-de-mercado-rem/",
  };
}

export async function cargarMacro() {
  return conRespaldo<Macro>("macro", [FUENTES.argentinadatos, FUENTES.bcra], async () => {
    const [inflR, interR, riesgoR, remR] = await Promise.allSettled([ad.inflacionMensual(), ad.inflacionInteranual(), ad.riesgoPais(), ad.remUltimo()]);
    const val = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
    const infl = val(inflR);
    const inter = val(interR);
    const riesgo = val(riesgoR);
    const rem = val(remR);
    if (!infl && !riesgo) throw new Error("Sin datos macro");
    const serieRiesgo = (riesgo ?? []).filter((p) => p.valor > 0).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const ultimo = serieRiesgo.at(-1);
    const previo = serieRiesgo.at(-2);
    const data: Macro = {
      // Desde 2017: la serie larga existe, pero nadie la necesita en una pantalla.
      inflacionMensual: (infl ?? []).filter((p) => p.fecha >= "2017-01-01").map((p) => ({ fecha: p.fecha, valor: p.valor / 100 })),
      inflacionInteranual: inter?.at(-1) ? inter.at(-1)!.valor / 100 : null,
      riesgoPais: ultimo
        ? {
            valor: ultimo.valor,
            fecha: ultimo.fecha,
            variacion: previo ? ultimo.valor / previo.valor - 1 : null,
            serie: serieRiesgo.slice(-260).map((p) => ({ fecha: p.fecha, valor: p.valor })),
          }
        : null,
      rem: rem ? normalizarRem(rem) : null,
    };
    const asOf = [data.inflacionMensual.at(-1)?.fecha, data.riesgoPais?.fecha].filter(Boolean).sort().at(-1)!;
    return { data, asOf, status: "close" };
  });
}
