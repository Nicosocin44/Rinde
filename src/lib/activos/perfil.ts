import { d } from "@/lib/calculos";
import type { PerfilEmpresa } from "@/lib/data/adapters/wikidata";

/**
 * Ayudas puras para la ficha de un activo que no está en nuestras listas curadas (por ejemplo NBIS):
 * con qué nombre buscarlo en las noticias, una descripción en castellano armada con su perfil y el ratio del CEDEAR.
 */

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Sufijos societarios que no sirven para encontrar a la empresa en un título ("Nebius Group N.V." → "Nebius"). */
const SUFIJOS = /\s*[,.]?\s*\b(inc|incorporated|corp|corporation|co|company|group|holdings?|ltd|limited|plc|n\.?v|s\.?a|s\.?a\.?b|ag|se|llc|technologies|platforms)\b\.?/gi;

/** Palabras que también son comunes en castellano: con ese nombre no se puede buscar una empresa en las noticias. */
const AMBIGUOS = new Set(["meta", "vale", "visa", "arm", "target", "block", "apple", "gap", "match", "snap", "ford", "shell", "oracle", "unity", "square", "nu"]);

/**
 * El nombre de la empresa sin sufijos societarios ni aclaraciones ("Alphabet (Google)" → "Alphabet"), aunque sea ambiguo:
 * para buscar con contexto ("Apple" stock) en Google Noticias.
 */
export function nombreLimpio(nombre: string): string | null {
  const limpio = nombre.replace(/\(.*?\)/g, "").replace(SUFIJOS, "").replace(/\s+/g, " ").trim();
  return limpio.length >= 2 ? limpio : null;
}

/** El nombre con el que se busca a una empresa en las noticias, o null si es demasiado corto o ambiguo. */
export function nombreParaBuscar(nombre: string): string | null {
  const limpio = nombre.replace(/\(.*?\)/g, "").replace(SUFIJOS, "").replace(/\s+/g, " ").trim();
  if (limpio.length < 4 || AMBIGUOS.has(sinAcentos(limpio).toLowerCase())) return null;
  return limpio;
}

/** ¿El texto nombra a la empresa? Palabra completa, sin importar mayúsculas ni acentos. */
export function menciona(texto: string, nombre: string): boolean {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapar(sinAcentos(nombre))}(?=$|[^\\p{L}\\p{N}])`, "iu");
  return re.test(sinAcentos(texto));
}

/** Descripción en castellano armada con el perfil, para cuando no hay un artículo de Wikipedia en castellano. */
export function describirEmpresa(p: PerfilEmpresa): string {
  const partes = [`${p.nombre} es una empresa`];
  if (p.industrias[0]) partes.push(`de ${p.industrias[0].toLowerCase()}`);
  if (p.sede && p.pais && !p.sede.includes(p.pais)) partes.push(`con sede en ${p.sede} (${p.pais})`);
  else if (p.sede || p.pais) partes.push(`con sede en ${p.sede ?? p.pais}`);
  let texto = partes.join(" ");
  if (p.fundacion) texto += `, fundada en ${p.fundacion}`;
  texto += ".";
  if (p.bolsa) texto += ` Cotiza en ${p.bolsa === "Bolsa de Buenos Aires" ? "la Bolsa de Buenos Aires" : p.bolsa}.`;
  return texto;
}

/**
 * Ratio aproximado del CEDEAR: cuántos CEDEARs equivalen a una acción, comparando el precio de la acción en EE.UU.
 * con el del CEDEAR en dólares. Solo se informa si da casi un número entero (±4 %); si no, null (no se adivina).
 */
export function ratioAproximado(precioAccionUsd: number | null, precioCedearUsd: number | null): number | null {
  if (!precioAccionUsd || !precioCedearUsd || precioAccionUsd <= 0 || precioCedearUsd <= 0) return null;
  const r = d(precioAccionUsd).div(precioCedearUsd).toNumber();
  if (r < 0.9) return null;
  const entero = Math.round(r);
  return Math.abs(r / entero - 1) <= 0.04 ? entero : null;
}
