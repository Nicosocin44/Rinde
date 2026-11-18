import { ACCIONES_GENERAL, CEDEARS, PANEL_LIDER } from "@data/ar/mercados";

/**
 * Noticias: limpieza de textos, clasificación por mercado y agrupación de la misma noticia en varios medios.
 * Todo puro (sin IO) y testeado. La carga de los feeds está en lib/data/servicios/noticias.ts.
 */

export type Mercado = "dolar" | "tasas" | "bonos" | "acciones" | "cripto" | "economia";

export const MERCADOS: { id: Mercado; nombre: string }[] = [
  { id: "dolar", nombre: "Dólar" },
  { id: "tasas", nombre: "Tasas y pesos" },
  { id: "bonos", nombre: "Bonos y deuda" },
  { id: "acciones", nombre: "Acciones y CEDEARs" },
  { id: "cripto", nombre: "Cripto" },
  { id: "economia", nombre: "Economía" },
];

export type NoticiaCruda = { medioId: string; titulo: string; resumen: string; url: string; fecha: string };

export type Noticia = {
  id: string;
  titulo: string;
  resumen: string;
  url: string;
  fecha: string;
  medioId: string;
  mercados: Mercado[];
  /** Los mercados que aparecen en el título (no solo en el resumen). */
  mercadosEnTitulo: Mercado[];
  /** Tickers mencionados (CEDEARs y acciones locales que tenemos en el sitio). */
  tickers: string[];
  /** La misma noticia en otros medios. */
  tambienEn: { medioId: string; url: string }[];
  /** Para elegir la destacada: cuántos medios la cubren y si el título habla de un mercado. */
  relevancia: number;
};

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", uuml: "ü", iexcl: "¡", iquest: "¿", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", hellip: "…", ndash: "–", mdash: "—" };

/** Saca HTML, scripts y entidades; colapsa espacios. */
export function limpiarTexto(html: string): string {
  return html
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTIDADES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** Recorta en el último espacio antes de `max` caracteres y agrega "…". Solo un extracto: la nota completa queda en el medio. */
export function recortar(texto: string, max = 220): string {
  if (texto.length <= max) return texto;
  const corte = texto.lastIndexOf(" ", max);
  return `${texto.slice(0, corte > max * 0.6 ? corte : max).replace(/[,;:.\s]+$/, "")}…`;
}

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Palabras clave por mercado (sin acentos, en minúscula; se buscan como palabra completa o inicio de palabra). */
const CLAVES: Record<Mercado, string[]> = {
  dolar: ["dolar", "dolares", "blue", "mep", "ccl", "contado con liqui", "brecha cambiaria", "cepo", "tipo de cambio", "devaluacion", "banda cambiaria", "bandas cambiarias", "divisas", "mercado cambiario"],
  tasas: ["plazo fijo", "plazos fijos", "tasa de interes", "tasas de interes", "tasa", "tasas", "lecap", "lecaps", "boncap", "caucion", "billeteras virtuales", "fondo comun", "fondos comunes", "money market", "rendimiento en pesos", "licitacion del tesoro", "letras del tesoro"],
  bonos: ["bono", "bonos", "riesgo pais", "deuda", "bonares", "globales", "al30", "gd30", "gd35", "canje", "default", "fmi", "obligaciones negociables", "vencimientos", "curva soberana", "bopreal"],
  acciones: ["accion", "acciones", "merval", "s&p", "s&p 500", "nasdaq", "dow jones", "wall street", "adr", "adrs", "cedear", "cedears", "bolsa", "byma", "balance trimestral", "resultados trimestrales", "dividendo", "dividendos"],
  cripto: ["bitcoin", "cripto", "criptomoneda", "criptomonedas", "criptoactivos", "ethereum", "ether", "stablecoin", "stablecoins", "usdt", "usdc", "tether", "blockchain"],
  economia: ["inflacion", "ipc", "indec", "bcra", "banco central", "reservas", "pbi", "actividad economica", "recesion", "superavit", "deficit", "salarios", "jubilaciones", "presupuesto", "ministerio de economia", "caputo", "exportaciones", "importaciones", "consumo", "paritarias", "fed", "reserva federal"],
};

const PATRONES = Object.fromEntries(
  (Object.keys(CLAVES) as Mercado[]).map((m) => [m, new RegExp(`(^|[^a-z0-9])(${CLAVES[m].map(escapar).join("|")})(?=$|[^a-z0-9])`, "i")]),
) as Record<Mercado, RegExp>;

/** Nombres que también son palabras comunes en castellano: no sirven para detectar una empresa. */
const AMBIGUOS = new Set(["Meta", "Vale", "Visa", "Arm", "Capex", "Celulosa", "Molinos"]);

/** Nombres de empresas → ticker, para detectar menciones ("Nvidia", "YPF", "Grupo Galicia"). */
const EMPRESAS: [RegExp, string][] = [
  ...Object.entries(CEDEARS).map(([t, v]): [string, string] => [v.nombre.replace(/\s*\(.*\)/, ""), t]),
  ...Object.entries(PANEL_LIDER).map(([t, n]): [string, string] => [n, t]),
  ...Object.entries(ACCIONES_GENERAL).map(([t, n]): [string, string] => [n, t]),
]
  .filter(([n]) => n.length >= 3 && !n.startsWith("ETF ") && !AMBIGUOS.has(n))
  .map(([n, t]): [RegExp, string] => [new RegExp(`(^|[^\\p{L}])${escapar(sinAcentos(n))}(?=$|[^\\p{L}])`, "iu"), t]);

/** Mercados y tickers de los que habla una noticia, según su título y su resumen. */
export function clasificar(titulo: string, resumen: string): { mercados: Mercado[]; tickers: string[]; enTitulo: Mercado[] } {
  const t = sinAcentos(titulo);
  const texto = sinAcentos(`${titulo} ${resumen}`);
  const mercados = (Object.keys(PATRONES) as Mercado[]).filter((m) => PATRONES[m].test(texto));
  const enTitulo = (Object.keys(PATRONES) as Mercado[]).filter((m) => PATRONES[m].test(t));
  const tickersTitulo = EMPRESAS.filter(([re]) => re.test(t)).map(([, x]) => x);
  // Una empresa nombrada solo en el resumen cuenta si la nota además habla de algún mercado.
  const tickersResumen = mercados.length ? EMPRESAS.filter(([re]) => re.test(texto)).map(([, x]) => x) : [];
  const tickers = [...new Set([...tickersTitulo, ...tickersResumen])].slice(0, 4);
  if (tickers.length && !mercados.includes("acciones")) mercados.push("acciones");
  if (tickersTitulo.length && !enTitulo.includes("acciones")) enTitulo.push("acciones");
  return { mercados, tickers, enTitulo };
}

const VACIAS = new Set("el la los las un una unos unas de del al a y o e en por para con sin que se su sus es son fue ser como mas mas lo le les ya hoy este esta estos estas tras ante sobre entre desde hasta cuanto cuando donde porque".split(" "));

function palabras(titulo: string): Set<string> {
  return new Set(
    sinAcentos(titulo)
      .replace(/[^a-z0-9%$ ]/g, " ")
      .split(/\s+/)
      .filter((p) => p.length > 2 && !VACIAS.has(p)),
  );
}

/** Parecido entre dos títulos (Jaccard sobre palabras con contenido), de 0 a 1. */
export function parecido(a: string, b: string): number {
  const A = palabras(a);
  const B = palabras(b);
  if (!A.size || !B.size) return 0;
  let comunes = 0;
  for (const p of A) if (B.has(p)) comunes++;
  return comunes / (A.size + B.size - comunes);
}

/**
 * ¿Cuentan lo mismo? Títulos muy parecidos, o que comparten al menos 3 palabras con contenido que son
 * buena parte del más corto ("inflación mayorista octubre 1,6 %" en dos medios con redacciones distintas).
 */
export function mismaNoticia(a: string, b: string): boolean {
  if (parecido(a, b) >= 0.45) return true;
  const A = palabras(a);
  const B = palabras(b);
  let comunes = 0;
  for (const p of A) if (B.has(p)) comunes++;
  return comunes >= 3 && comunes / Math.min(A.size, B.size) >= 0.35;
}

/**
 * Arma la lista final: limpia, clasifica, se queda con las que hablan de algún mercado, agrupa la misma
 * noticia de distintos medios (títulos muy parecidos dentro de 18 horas) y ordena de la más nueva a la más vieja.
 */
export function armarNoticias(crudas: NoticiaCruda[], { ahora = new Date(), horas = 72, maximo = 150 }: { ahora?: Date; horas?: number; maximo?: number } = {}): Noticia[] {
  const desde = ahora.getTime() - horas * 3_600_000;
  const vistas = new Set<string>();
  const candidatas = crudas
    .map((c) => ({ ...c, titulo: limpiarTexto(c.titulo), resumen: recortar(limpiarTexto(c.resumen)) }))
    .filter((c) => {
      const t = new Date(c.fecha).getTime();
      if (!c.titulo || !c.url || !Number.isFinite(t) || t < desde || t > ahora.getTime() + 600_000) return false;
      if (vistas.has(c.url)) return false;
      vistas.add(c.url);
      return true;
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const resultado: Noticia[] = [];
  for (const c of candidatas) {
    const { mercados, tickers, enTitulo } = clasificar(c.titulo, c.resumen);
    if (!mercados.length) continue;
    const t = new Date(c.fecha).getTime();
    const igual = resultado.find((n) => Math.abs(new Date(n.fecha).getTime() - t) < 18 * 3_600_000 && mismaNoticia(n.titulo, c.titulo));
    if (igual) {
      if (igual.medioId !== c.medioId && !igual.tambienEn.some((x) => x.medioId === c.medioId)) {
        igual.tambienEn.push({ medioId: c.medioId, url: c.url });
        igual.relevancia += 3;
      }
      continue;
    }
    resultado.push({ id: c.url, titulo: c.titulo, resumen: c.resumen, url: c.url, fecha: new Date(c.fecha).toISOString(), medioId: c.medioId, mercados, mercadosEnTitulo: enTitulo, tickers, tambienEn: [], relevancia: Math.min(enTitulo.length, 3) * 2 });
    if (resultado.length >= maximo) break;
  }
  // Las notas de rutina ("a cuánto cotiza hoy", "minuto a minuto") salen todos los días: siguen en la lista,
  // pero no compiten por la destacada.
  for (const n of resultado) if (esRutina(n.titulo)) n.relevancia -= 10;
  return resultado;
}

const RUTINA = /(a cuanto (cotiza|cotizo|cerro|opero|abrio|esta)|minuto a minuto|cotizacion (del|de hoy|de este)|^(dolar|euro|real)( blue)? hoy)/;

/** ¿Es una nota de rutina sobre la cotización del día? */
export function esRutina(titulo: string): boolean {
  return RUTINA.test(sinAcentos(titulo));
}
