import { unstable_cache } from "next/cache";
import { EMPRESAS_CNV } from "@data/ar/cnv";
import { ADR_DE_ACCION, TICKER_EEUU_DE_CEDEAR } from "@data/ar/sec";
import { construirIndice, hoyAR, resumirBalances, resumirCnv, sumarDias, type FormularioEntrada, type ResumenBalances } from "@/lib/calculos";
import * as ad from "../adapters/argentinadatos";
import * as cnv from "../adapters/cnv";
import * as sec from "../adapters/sec";
import { conRespaldo } from "../cache";
import { FUENTES } from "../types";

/** El ticker con el que la empresa presenta ante la SEC, o null si no presenta (acciones sin ADR, ETFs). */
export function tickerSec(ticker: string, tipo: "cedear" | "accion", sector: string | null): string | null {
  if (tipo === "accion") return ADR_DE_ACCION[ticker] ?? null;
  if (sector === "ETF") return null;
  return TICKER_EEUU_DE_CEDEAR[ticker] ?? ticker;
}

/**
 * El resumen de una empresa. La respuesta de la SEC pesa hasta 4 MB (no entra en la caché de fetch): se guarda el
 * resumen, que pesa unos pocos KB, 12 horas. Los balances salen como mucho una vez por trimestre.
 */
const resumenDeCik = unstable_cache(async (cik: number): Promise<ResumenBalances | null> => resumirBalances(await sec.hechos(cik), hoyAR()), ["balances-sec-v2"], {
  revalidate: 43_200,
});

/** Formularios que se piden por empresa: hasta 5 ejercicios y los trimestres de los últimos dos años y medio. */
const ANUALES = 5;
const MESES_TRIMESTRES = 30;

/**
 * Balances de una empresa argentina en la CNV: su página (4 MB, sin caché de fetch), el consolidado si lo presenta, la
 * versión más nueva de cada cierre y el formulario de cada uno. Se guarda el resumen 12 horas.
 */
const resumenCnv = unstable_cache(
  async (ticker: string): Promise<ResumenBalances | null> => {
    const empresa = EMPRESAS_CNV[ticker];
    if (!empresa) return null;
    const hoy = hoyAR();
    const [todas, dolar, inflacion] = await Promise.all([cnv.presentaciones(empresa.cuit), ad.historicoDolar("mayorista"), ad.inflacionMensual().catch(() => [])]);
    const tipo = todas.some((x) => x.tipo === "consolidado" && x.periodicidad === "anual") ? "consolidado" : "individual";
    const delTipo = todas.filter((x) => x.tipo === tipo);
    // La más nueva de cada cierre (si la empresa corrigió un balance, gana la corrección).
    const porCierre = new Map<string, cnv.PresentacionCnv>();
    for (const x of delTipo) {
      const clave = `${x.periodicidad}|${x.cierre}`;
      const previa = porCierre.get(clave);
      if (!previa || x.presentada > previa.presentada) porCierre.set(clave, x);
    }
    const unicas = [...porCierre.values()].sort((a, b) => a.cierre.localeCompare(b.cierre));
    const desde = sumarDias(hoy, -Math.round(MESES_TRIMESTRES * 30.44));
    const elegidas = [...unicas.filter((x) => x.periodicidad === "anual").slice(-ANUALES), ...unicas.filter((x) => x.periodicidad === "trimestral" && x.cierre >= desde)];
    const formularios = await Promise.all(
      elegidas.map(async (x): Promise<FormularioEntrada | null> => {
        const f = await cnv.formulario(x.guid).catch(() => null);
        // Solo formularios en pesos con la unidad reconocida.
        return f && f.moneda === "ARS" ? { cierre: f.cierre, periodicidad: x.periodicidad, factor: f.factor, acciones: f.acciones, cuentas: f.cuentas, presentada: x.presentada, guid: x.guid } : null;
      }),
    );
    return resumirCnv({
      empresa: empresa.razonSocial,
      bancaria: elegidas.some((x) => x.bancaria),
      formularios: formularios.filter((f): f is FormularioEntrada => f !== null),
      dolar: dolar.map((p) => ({ fecha: p.fecha.slice(0, 10), valor: p.venta })),
      // Desde seis años atrás alcanza (la serie arranca en 1943).
      ipc: inflacion.length > 12 ? construirIndice(inflacion.filter((x) => x.fecha >= sumarDias(hoy, -6 * 365))) : undefined,
      hoy,
    });
  },
  ["balances-cnv-v2"],
  { revalidate: 43_200 },
);

/**
 * Balances y resultados de una empresa. Las acciones argentinas salen de la CNV (al día); si la CNV no responde o la
 * empresa no está en nuestra lista, de la SEC (las que tienen ADR, con atraso). Los CEDEARs, de la SEC.
 * `data.resumen` es null si la empresa no presenta en ninguna de las dos.
 */
export async function cargarBalances(ticker: string, tipo: "cedear" | "accion", sector: string | null) {
  const fuentes = tipo === "accion" && EMPRESAS_CNV[ticker] ? [FUENTES.cnv, FUENTES.argentinadatos] : [FUENTES.sec];
  return conRespaldo<{ resumen: ResumenBalances | null; tickerSec: string | null }>(`balances:${ticker}`, fuentes, async () => {
    const enSec = tickerSec(ticker, tipo, sector);
    if (tipo === "accion" && EMPRESAS_CNV[ticker]) {
      const desdeCnv = await resumenCnv(ticker).catch(() => null);
      if (desdeCnv) return { data: { resumen: desdeCnv, tickerSec: enSec }, asOf: new Date().toISOString(), status: "close" };
    }
    const cik = enSec ? (await sec.ciks()).get(enSec) : undefined;
    const resumen = cik ? await resumenDeCik(cik) : null;
    return { data: { resumen, tickerSec: enSec }, asOf: new Date().toISOString(), status: "close" };
  });
}
