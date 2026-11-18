import { z } from "zod";
import { site } from "@/config/site";
import { CONCEPTOS, type HechosEmpresa } from "@/lib/calculos/balances";
import { traerJson } from "../http";

/**
 * SEC EDGAR: los estados contables que las empresas que cotizan en EE.UU. presentan ante la SEC, en XBRL. Sin
 * autenticación y de dominio público. La SEC pide un User-Agent con el nombre y un mail de contacto de quien consulta
 * y no más de 10 pedidos por segundo (verificado el 18/11/2026). El mail sale de `site.contacto`: cambiarlo ahí.
 */
const FUENTE = "sec";
const headers = { "user-agent": `${site.name} ${site.contacto}` };

const tickersSchema = z.record(z.string(), z.object({ cik_str: z.number(), ticker: z.string(), title: z.string() }));

/** Ticker de EE.UU. → CIK (el número de la empresa en la SEC). ~800 KB, cambia poco: un día de caché. */
export async function ciks(): Promise<Map<string, number>> {
  const t = await traerJson("https://www.sec.gov/files/company_tickers.json", tickersSchema, { fuente: FUENTE, revalidate: 86_400, timeoutMs: 12_000, headers });
  return new Map(Object.values(t).map((x) => [x.ticker.toUpperCase(), x.cik_str]));
}

const hechoSchema = z.object({
  start: z.string().optional(),
  end: z.string(),
  val: z.number(),
  accn: z.string(),
  fy: z.number().nullable().optional(),
  fp: z.string().nullable().optional(),
  form: z.string(),
  filed: z.string(),
});
const conceptoSchema = z.object({ units: z.record(z.string(), z.array(hechoSchema)) });
const crudoSchema = z.object({ cik: z.number(), entityName: z.string(), facts: z.record(z.string(), z.record(z.string(), z.unknown())) });

/**
 * Los hechos XBRL de una empresa, solo de los conceptos que usamos (validados uno por uno). La respuesta completa pesa
 * hasta 4 MB, más de lo que guarda la caché de fetch de Next: se pide sin caché y quien llama guarda el resumen.
 */
export async function hechos(cik: number): Promise<HechosEmpresa> {
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, "0")}.json`;
  const crudo = await traerJson(url, crudoSchema, { fuente: FUENTE, revalidate: 0, sinCache: true, timeoutMs: 15_000, headers });
  const facts: HechosEmpresa["facts"] = {};
  for (const [tax, concepto] of Object.values(CONCEPTOS).flat()) {
    const valor = crudo.facts[tax]?.[concepto];
    if (valor === undefined) continue;
    const r = conceptoSchema.safeParse(valor);
    if (r.success) (facts[tax] ??= {})[concepto] = r.data;
  }
  return { cik: crudo.cik, entityName: crudo.entityName, facts };
}
