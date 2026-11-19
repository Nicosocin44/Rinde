import { z } from "zod";
import { traerTexto } from "../http";

/**
 * CNV: estados contables de las empresas argentinas, tal como los presentan en la Autopista de Información Financiera.
 * Verificado el 19/11/2026 (YPF, Pampa, Banco Galicia):
 * - La página de la empresa (cnv.gov.ar/SitioWeb/Empresas/Empresa/{cuit}) lista cada presentación: fecha, descripción
 *   ("NORMA CONTABLE: NIIF - TIPO BALANCE: CONSOLIDADO - PERIODICIDAD: 3 - FECHA CIERRE: 2026-09-30 - ESTADOS CONTABLES -
 *   NIIF") y un link a su vista pública (aif2.cnv.gov.ar/presentations/publicview/{guid}). La página pesa unos 4 MB.
 * - La vista pública trae el formulario completo en XML: período (1 = anual, 3 = trimestral), fecha de cierre,
 *   consolidado o individual, moneda, unidad ("Millones de $", "Miles de $"), cantidad de acciones y cada rubro con su
 *   código fijo (1999999 = total del activo, 3049999 = ganancia del período…).
 * - Los resultados y los flujos vienen acumulados desde el inicio del ejercicio (3, 6, 9 y 12 meses).
 * Las respuestas son grandes: se piden sin la caché de fetch y quien llama guarda el resumen (ver servicios/balances).
 */
const UA = { "user-agent": "Mozilla/5.0 (compatible; Rinde/1.0)", accept: "text/html" };
const MESES: Record<string, string> = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", set: "09", oct: "10", nov: "11", dic: "12" };

export type PresentacionCnv = {
  /** Fecha en que la presentó (AAAA-MM-DD). */
  presentada: string;
  descripcion: string;
  guid: string;
  periodicidad: "anual" | "trimestral";
  cierre: string;
  tipo: "consolidado" | "individual";
  /** Formulario de bancos y entidades financieras (sus rubros significan otra cosa). */
  bancaria: boolean;
};

const textoPlano = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, " ")
    .trim();

/** "29 oct. 2026" → "2026-10-29". */
function fechaCnv(texto: string): string | null {
  const m = /(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})/i.exec(texto);
  const mes = m ? MESES[m[2]!.toLowerCase()] : undefined;
  return m && mes ? `${m[3]}-${mes}-${m[1]!.padStart(2, "0")}` : null;
}

/** Las presentaciones de estados contables propios (sin traducciones ni balances de controladas). Puro. */
export function leerPresentaciones(html: string): PresentacionCnv[] {
  const salida: PresentacionCnv[] = [];
  for (const [, fila] of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    if (!fila!.includes("publicview") || !fila!.includes("NORMA CONTABLE")) continue;
    const celdas = [...fila!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => textoPlano(m[1]!));
    const guid = /publicview\/([0-9a-f-]{36})/.exec(fila!)?.[1];
    const descripcion = celdas[2] ?? "";
    if (!guid || !/ESTADOS CONTABLES/.test(descripcion) || /OTROS IDIOMAS|CONTROLADAS|VINCULADAS/.test(descripcion)) continue;
    const periodo = /PERIODICIDAD:\s*(\w+)/.exec(descripcion)?.[1];
    const cierre = /FECHA CIERRE:\s*(\d{4}-\d{2}-\d{2})/.exec(descripcion)?.[1];
    const tipo = /TIPO BALANCE:\s*(CONSOLIDADO|INDIVIDUAL)/.exec(descripcion)?.[1];
    const presentada = fechaCnv(celdas[0] ?? "");
    if (!cierre || !tipo || !presentada || !periodo) continue;
    const periodicidad = periodo === "1" || periodo === "ANUAL" ? "anual" : periodo === "3" || periodo === "TRIMESTRAL" ? "trimestral" : null;
    if (!periodicidad) continue;
    salida.push({ presentada, descripcion, guid, periodicidad, cierre, tipo: tipo === "CONSOLIDADO" ? "consolidado" : "individual", bancaria: /BANCOS Y ENTIDADES FINANCIERAS/.test(descripcion) });
  }
  return salida;
}

export type FormularioCnv = {
  cierre: string;
  periodicidad: "anual" | "trimestral";
  tipo: "consolidado" | "individual";
  /** "ARS" si la unidad es en pesos; null si no la reconocemos (no se usa). */
  moneda: "ARS" | null;
  unidad: string;
  /** Por cuánto multiplicar los montos para tenerlos en unidades (1e6 si es "Millones de $"). */
  factor: number;
  acciones: number | null;
  /** Código de rubro → monto en la unidad del formulario (null si vino vacío: "-"). */
  cuentas: Record<string, number | null>;
};

const propiedad = (xml: string, id: string) => new RegExp(`<propiedad id="${id}"[^>]*>([^<]*)</propiedad>`).exec(xml)?.[1]?.trim() ?? "";
const numero = (s: string | undefined) => {
  const v = Number((s ?? "").trim().replace(/,/g, ""));
  return (s ?? "").trim() && (s ?? "").trim() !== "-" && Number.isFinite(v) ? v : null;
};

const formularioSchema = z.object({ cierre: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), factor: z.number().positive(), cuentas: z.record(z.string(), z.number().nullable()) });

/** El formulario de la vista pública (el XML viene en una variable de la página). Puro. */
export function leerFormulario(html: string): FormularioCnv | null {
  const xml = /var presentation\s*=\s*'([\s\S]*?)';\s*\n/.exec(html)?.[1]?.replace(/&amp;/g, "&");
  if (!xml) return null;
  const unidad = propiedad(xml, "UnidadMedida");
  const enPesos = /\$/.test(unidad) && !/US\$|U\$S|d[óo]lar/i.test(unidad);
  const factor = /millon/i.test(unidad) ? 1e6 : /miles/i.test(unidad) ? 1e3 : 1;
  const cuentas: Record<string, number | null> = {};
  for (const [, fila] of xml.matchAll(/<fila[^>]*>([\s\S]*?)<\/fila>/g)) {
    const nro = propiedad(fila!, "Nro");
    if (/^\d{7}$/.test(nro)) cuentas[nro] = numero(propiedad(fila!, "Monto"));
  }
  const periodo = propiedad(xml, "PeriodoBalance");
  const datos = {
    cierre: propiedad(xml, "FechaCierre").slice(0, 10),
    periodicidad: periodo === "1" ? ("anual" as const) : ("trimestral" as const),
    tipo: /consolidado/i.test(propiedad(xml, "TipoBalance")) ? ("consolidado" as const) : ("individual" as const),
    moneda: enPesos ? ("ARS" as const) : null,
    unidad,
    factor,
    acciones: numero(propiedad(xml, "ODBCantidadAcciones")),
    cuentas,
  };
  return formularioSchema.safeParse(datos).success && Object.keys(cuentas).length > 10 ? datos : null;
}

/** Las presentaciones de una empresa, por CUIT. */
export async function presentaciones(cuit: string): Promise<PresentacionCnv[]> {
  const html = await traerTexto(`https://www.cnv.gov.ar/SitioWeb/Empresas/Empresa/${cuit}`, { fuente: "cnv", revalidate: 0, sinCache: true, timeoutMs: 30_000, headers: UA });
  return leerPresentaciones(html);
}

/** El formulario de una presentación. */
export async function formulario(guid: string): Promise<FormularioCnv | null> {
  const html = await traerTexto(`https://aif2.cnv.gov.ar/presentations/publicview/${guid}`, { fuente: "cnv", revalidate: 86_400, timeoutMs: 20_000, headers: UA });
  return leerFormulario(html);
}
