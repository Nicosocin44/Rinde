import type { NoticiaBuscada } from "@/lib/data/adapters/googlenews";
import { limpiarTexto, mismaNoticia, type Noticia } from "./index";

/**
 * Noticias de la ficha de un activo: las de nuestros medios que lo nombran, más una búsqueda en Google Noticias (en
 * castellano y, para los de EE.UU., en inglés). Si las directas son pocas, se completan con las del mercado que lo mueve
 * (Wall Street, el Merval, el riesgo país, las tasas, cripto), marcadas como "lo que lo afecta". Puro.
 */

/** Resultados que no son noticias: páginas de cotización, gráficos y pronósticos automáticos, series de opciones. */
const RUIDO = [
  /stock price,? news,? quote/i,
  /\bquote\b.*\bhistory\b/i,
  /charts? and quotes?/i,
  /gr[aá]fico y cotizaci[oó]n/i,
  /\b(BCBA|NASDAQ|NYSE|BINANCE|BYBIT|AMEX):[A-Z0-9.]+\b.*:/,
  /rentabilidades estacionales/i,
  /\b[A-Z]{1,5}\d{6}[CP]\d{5,8}\b/,
  /stock forecast|price prediction|price target.*\d{4}\b.*\d{4}/i,
  /predicci[oó]n (del )?precio/i,
  // Notas automáticas sobre cada compra o venta de un fondo y cada cambio de precio objetivo.
  /\b(shares|stake|position|holdings?)\b.*\b(sold|bought|acquired|purchased|trimmed|lowered|raised|increased|decreased|boosted|cut)\b.*\bby\b/i,
  /price target (raised|cut|lowered|increased|decreased|boosted)/i,
];

/** Sitios que publican notas automáticas (movimientos de fondos, gráficos, pronósticos de precio) en vez de noticias. */
const MEDIOS_RUIDO = new Set(
  ["MarketBeat", "TradingView", "Traders Union", "TIKR.com", "StockInvest.us", "BigGo Finance", "Pluang", "Gotrade", "TradingKey", "ad-hoc-news.de", "Defense World", "ETF Daily News", "Ticker Report", "Zolmax", "Dispatch Tribunal", "WKRB News", "Daily Political", "Transcript Daily", "The Cerbat Gem", "Markets Daily", "American Banking News", "Modern Readers", "The Enterprise Leader", "Watchlist News", "Week Herald", "The Lincolnian Online"].map((m) => m.toLowerCase()),
);

export const esRuido = (titulo: string, fuente = "") => MEDIOS_RUIDO.has(fuente.toLowerCase()) || RUIDO.some((r) => r.test(titulo));

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
export const idMedio = (fuente: string) =>
  sinAcentos(fuente)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Nuestros medios, como los nombra Google o por su dominio (para usar su logo). */
const NUESTROS: Record<string, string> = {
  infobae: "infobae",
  "la-nacion": "lanacion",
  ambito: "ambito",
  "ambito-financiero": "ambito",
  "el-cronista": "cronista",
  iprofesional: "iprofesional",
  "bloomberg-linea": "bloomberglinea",
  "infobae.com": "infobae",
  "lanacion.com.ar": "lanacion",
  "ambito.com": "ambito",
  "cronista.com": "cronista",
  "iprofesional.com": "iprofesional",
  "bloomberglinea.com": "bloomberglinea",
};

/** Un resultado de la búsqueda, como noticia. */
export function desdeBusqueda(b: NoticiaBuscada, indirecta: boolean): Noticia {
  // El id del medio es su dominio ("cnbc.com"), que es el nombre de su logo; sin dominio, su nombre.
  const id = b.dominio ?? idMedio(b.fuente);
  return {
    id: b.url,
    titulo: limpiarTexto(b.titulo),
    resumen: "",
    url: b.url,
    fecha: b.fecha,
    medioId: NUESTROS[id] ?? id,
    fuente: b.fuente,
    idioma: b.idioma,
    indirecta,
    mercados: [],
    mercadosEnTitulo: [],
    tickers: [],
    tambienEn: [],
    relevancia: 0,
  };
}

const HORA = 3_600_000;

/**
 * Junta las noticias de un activo: sin repetidas (la misma nota en varios medios queda una, con "también en"), de la más
 * nueva a la más vieja. Si hay menos de `minimoDirectas`, completa con las indirectas hasta `maximo`.
 */
export function juntarNoticias(p: {
  propias: Noticia[];
  directas: NoticiaBuscada[];
  indirectas: NoticiaBuscada[];
  /** Notas de nuestros medios sobre el mercado del activo (no lo nombran). */
  propiasIndirectas?: Noticia[];
  ahora?: Date;
  maximo?: number;
  minimoDirectas?: number;
}): Noticia[] {
  const { ahora = new Date(), maximo = 8, minimoDirectas = 4 } = p;
  const lista: Noticia[] = [];
  const agregar = (destino: Noticia[], n: Noticia) => {
    const t = Date.parse(n.fecha);
    if (!n.titulo || !Number.isFinite(t) || t > ahora.getTime() + 10 * 60_000) return;
    const igual = [...lista, ...destino].find((x) => x.url === n.url || (Math.abs(Date.parse(x.fecha) - t) < 36 * HORA && mismaNoticia(x.titulo, n.titulo)));
    if (igual) {
      if (igual.medioId !== n.medioId && !igual.tambienEn.some((m) => m.medioId === n.medioId)) igual.tambienEn.push({ medioId: n.medioId, url: n.url });
      return;
    }
    destino.push(n);
  };
  for (const n of p.propias) agregar(lista, { ...n, indirecta: false });
  for (const b of p.directas) if (!esRuido(b.titulo, b.fuente)) agregar(lista, desdeBusqueda(b, false));
  const directas = lista.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, maximo);
  if (directas.length >= minimoDirectas) return directas;
  const extra: Noticia[] = [];
  for (const n of p.propiasIndirectas ?? []) agregar(extra, { ...n, indirecta: true });
  for (const b of p.indirectas) if (!esRuido(b.titulo, b.fuente)) agregar(extra, desdeBusqueda(b, true));
  return [...directas, ...extra.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, maximo - directas.length)];
}
