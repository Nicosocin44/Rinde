/**
 * Metadatos de proveedores (bancos, billeteras, exchanges, brokers). Investigación propia, 16/11/2026.
 * En v1 usamos monogramas propios (dos letras); los logos reales se suman con permiso.
 *
 * `alias` lista cómo aparece cada proveedor en las distintas fuentes (ids de CriptoYa, nombres del BCRA).
 */

export type TipoProveedor = "banco" | "casa_de_cambio" | "billetera" | "exchange" | "p2p" | "broker" | "fondo";

export type Proveedor = {
  id: string;
  nombre: string;
  /** Dos letras para el monograma. */
  sigla: string;
  tipo: TipoProveedor;
  /** Quién lo regula en Argentina, si aplica. */
  regulador?: "BCRA" | "CNV" | "PSP (BCRA)" | "PSAV (CNV)";
  /** Los depósitos en pesos están cubiertos por la garantía de SEDESA (solo bancos). */
  garantiaDepositos?: boolean;
  opera247?: boolean;
  sitio?: string;
  alias?: string[];
};

const P = (p: Proveedor): Proveedor => p;

export const PROVEEDORES: Proveedor[] = [
  // ───── Bancos ─────
  P({ id: "bna", nombre: "Banco Nación", sigla: "BN", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, sitio: "https://www.bna.com.ar", alias: ["banco de la nacion argentina", "bna"] }),
  P({ id: "galicia", nombre: "Galicia", sigla: "GA", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, sitio: "https://www.galicia.ar", alias: ["banco de galicia y buenos aires s.a.", "galicia"] }),
  P({ id: "bbva", nombre: "BBVA", sigla: "BB", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, sitio: "https://www.bbva.com.ar", alias: ["banco bbva argentina s.a."] }),
  P({ id: "santander", nombre: "Santander", sigla: "SA", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, sitio: "https://www.santander.com.ar", alias: ["banco santander argentina s.a."] }),
  P({ id: "bapro", nombre: "Banco Provincia", sigla: "BP", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, sitio: "https://www.bancoprovincia.com.ar", alias: ["banco de la provincia de buenos aires"] }),
  P({ id: "macro", nombre: "Macro", sigla: "MA", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, sitio: "https://www.macro.com.ar", alias: ["banco macro s.a."] }),
  P({ id: "icbc", nombre: "ICBC", sigla: "IC", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, sitio: "https://www.icbc.com.ar", alias: ["industrial and commercial bank of china (argentina) s.a.u."] }),
  P({ id: "ciudad", nombre: "Banco Ciudad", sigla: "CI", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, sitio: "https://www.bancociudad.com.ar", alias: ["banco de la ciudad de buenos aires"] }),
  P({ id: "patagonia", nombre: "Patagonia", sigla: "PA", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, sitio: "https://www.bancopatagonia.com.ar", alias: ["banco patagonia s.a."] }),
  P({ id: "credicoop", nombre: "Credicoop", sigla: "CR", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, sitio: "https://www.bancocredicoop.coop", alias: ["banco credicoop cooperativo limitado"] }),
  P({ id: "bica", nombre: "Banco Bica", sigla: "BI", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco bica s.a.", "bica cuenta positiva"] }),
  P({ id: "cmf", nombre: "Banco CMF", sigla: "CM", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco cmf s.a."] }),
  P({ id: "comafi", nombre: "Comafi", sigla: "CO", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco comafi sociedad anonima"] }),
  P({ id: "comercio", nombre: "Banco de Comercio", sigla: "BC", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco de comercio s.a."] }),
  P({ id: "formosa", nombre: "Banco de Formosa", sigla: "FO", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco de formosa s.a."] }),
  P({ id: "bancor", nombre: "Bancor", sigla: "BC", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco de la provincia de cordoba s.a."] }),
  P({ id: "chubut", nombre: "Banco del Chubut", sigla: "CH", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco del chubut s.a."] }),
  P({ id: "delsol", nombre: "Banco del Sol", sigla: "BS", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco del sol s.a."] }),
  P({ id: "dino", nombre: "Banco Dino", sigla: "DI", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco dino s.a."] }),
  P({ id: "hipotecario", nombre: "Hipotecario", sigla: "HI", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco hipotecario s.a."] }),
  P({ id: "julio", nombre: "Banco Julio", sigla: "JU", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco julio sociedad anonima"] }),
  P({ id: "mariva", nombre: "Mariva", sigla: "MV", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco mariva s.a."] }),
  P({ id: "masventas", nombre: "Banco Masventas", sigla: "MS", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco masventas s.a."] }),
  P({ id: "meridian", nombre: "Banco Meridian", sigla: "ME", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco meridian s.a."] }),
  P({ id: "btf", nombre: "Banco Tierra del Fuego", sigla: "TF", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco provincia de tierra del fuego"] }),
  P({ id: "voii", nombre: "Banco Voii", sigla: "VO", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco voii s.a.", "voii"] }),
  P({ id: "bibank", nombre: "Bibank", sigla: "BI", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["bibank s.a."] }),
  P({ id: "creditoregional", nombre: "Crédito Regional", sigla: "CR", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["crédito regional compañía financiera s.a.u."] }),
  P({ id: "reba", nombre: "Reba", sigla: "RE", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["reba compañia financiera s.a."] }),
  P({ id: "piano", nombre: "Banco Piano", sigla: "PI", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["banco piano"] }),
  P({ id: "brubank", nombre: "Brubank", sigla: "BR", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, opera247: true, sitio: "https://www.brubank.com" }),
  P({ id: "supervielle", nombre: "Supervielle", sigla: "SU", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["supervielle hit iol"] }),
  P({ id: "columbia", nombre: "Banco Columbia", sigla: "CL", tipo: "banco", regulador: "BCRA", garantiaDepositos: true }),
  P({ id: "carrefour", nombre: "Carrefour Banco", sigla: "CB", tipo: "banco", regulador: "BCRA", garantiaDepositos: true, alias: ["carrefour banco"] }),
  // No es un banco: el "andina" de CriptoYa es Andina Cambio, casa de cambio de Bariloche y Villa La Angostura (verificado el 19/11/2026).
  P({ id: "andina", nombre: "Andina Cambio", sigla: "AC", tipo: "casa_de_cambio", regulador: "BCRA", sitio: "https://www.andinacambio.com.ar" }),

  // ───── Casas de cambio ─────
  P({ id: "pluscambio", nombre: "Plus Cambio", sigla: "PC", tipo: "casa_de_cambio", regulador: "BCRA" }),
  P({ id: "plazacambio", nombre: "Plaza Cambio", sigla: "PZ", tipo: "casa_de_cambio", regulador: "BCRA" }),
  P({ id: "triacambio", nombre: "Tría Cambio", sigla: "TR", tipo: "casa_de_cambio", regulador: "BCRA" }),
  P({ id: "bytelime", nombre: "Bytelime", sigla: "BY", tipo: "casa_de_cambio", regulador: "BCRA" }),

  // ───── Billeteras y fintech ─────
  P({ id: "mercadopago", nombre: "Mercado Pago", sigla: "MP", tipo: "billetera", regulador: "PSP (BCRA)", opera247: true, sitio: "https://www.mercadopago.com.ar" }),
  P({ id: "uala", nombre: "Ualá", sigla: "UA", tipo: "billetera", regulador: "BCRA", opera247: true, sitio: "https://www.uala.com.ar", alias: ["uala plus"] }),
  P({ id: "naranjax", nombre: "Naranja X", sigla: "NX", tipo: "billetera", regulador: "BCRA", opera247: true, sitio: "https://www.naranjax.com", alias: ["naranja x", "naranja x frascos"] }),
  P({ id: "personalpay", nombre: "Personal Pay", sigla: "PP", tipo: "billetera", regulador: "PSP (BCRA)", opera247: true }),
  P({ id: "prex", nombre: "Prex", sigla: "PX", tipo: "billetera", regulador: "PSP (BCRA)", opera247: true }),
  P({ id: "montemar", nombre: "Montemar Pay", sigla: "MO", tipo: "billetera", regulador: "PSP (BCRA)", opera247: true, alias: ["montemar pay"] }),
  P({ id: "cresium", nombre: "Cresium", sigla: "CS", tipo: "billetera", regulador: "PSP (BCRA)" }),
  P({ id: "astropay", nombre: "AstroPay", sigla: "AP", tipo: "billetera", opera247: true }),
  P({ id: "takenos", nombre: "Takenos", sigla: "TK", tipo: "billetera", opera247: true }),
  P({ id: "wallbit", nombre: "Wallbit", sigla: "WB", tipo: "billetera", opera247: true }),
  P({ id: "saldo", nombre: "Saldo", sigla: "SD", tipo: "billetera", opera247: true }),
  P({ id: "airtm", nombre: "Airtm", sigla: "AT", tipo: "billetera", opera247: true }),
  P({ id: "peanut", nombre: "Peanut", sigla: "PN", tipo: "billetera", opera247: true }),
  // Vibrant pasó a llamarse Vesseo (misma empresa, Sunship, y misma app; verificado el 19/11/2026). El id sigue siendo el de CriptoYa.
  P({ id: "vibrant", nombre: "Vesseo (ex Vibrant)", sigla: "VE", tipo: "billetera", opera247: true, sitio: "https://vibrantapp.com" }),
  // DolarApp pasó a llamarse ARQ el 2/3/2026 (misma empresa, DolarApp Inc., y misma app; verificado el 21/11/2026). El id sigue siendo el de CriptoYa.
  P({ id: "dolarapp", nombre: "ARQ (ex DolarApp)", sigla: "AQ", tipo: "billetera", opera247: true, sitio: "https://www.arqfinance.com", alias: ["arq", "dolar app"] }),
  P({ id: "vitawallet", nombre: "Vita Wallet", sigla: "VW", tipo: "billetera", opera247: true }),

  // ───── Exchanges cripto ─────
  P({ id: "belo", nombre: "Belo", sigla: "BE", tipo: "exchange", regulador: "PSAV (CNV)", opera247: true, sitio: "https://www.belo.app" }),
  P({ id: "lemoncash", nombre: "Lemon", sigla: "LE", tipo: "exchange", regulador: "PSAV (CNV)", opera247: true, sitio: "https://www.lemon.me" }),
  P({ id: "ripio", nombre: "Ripio", sigla: "RI", tipo: "exchange", regulador: "PSAV (CNV)", opera247: true, sitio: "https://www.ripio.com" }),
  P({ id: "ripioexchange", nombre: "Ripio Trade", sigla: "RT", tipo: "exchange", regulador: "PSAV (CNV)", opera247: true }),
  P({ id: "buenbit", nombre: "Buenbit", sigla: "BU", tipo: "exchange", regulador: "PSAV (CNV)", opera247: true }),
  P({ id: "fiwind", nombre: "Fiwind", sigla: "FI", tipo: "exchange", regulador: "PSAV (CNV)", opera247: true }),
  P({ id: "letsbit", nombre: "Let'sBit", sigla: "LB", tipo: "exchange", regulador: "PSAV (CNV)", opera247: true }),
  P({ id: "satoshitango", nombre: "SatoshiTango", sigla: "ST", tipo: "exchange", regulador: "PSAV (CNV)", opera247: true }),
  P({ id: "decrypto", nombre: "Decrypto", sigla: "DE", tipo: "exchange", regulador: "PSAV (CNV)", opera247: true }),
  P({ id: "tiendacrypto", nombre: "TiendaCrypto", sigla: "TC", tipo: "exchange", regulador: "PSAV (CNV)", opera247: true }),
  P({ id: "universalcoins", nombre: "Universal Coins", sigla: "UC", tipo: "exchange", opera247: true }),
  P({ id: "cocoscrypto", nombre: "Cocos Crypto", sigla: "CC", tipo: "exchange", regulador: "PSAV (CNV)", opera247: true }),
  P({ id: "cryptomkt", nombre: "CryptoMarket", sigla: "CK", tipo: "exchange", opera247: true, alias: ["cryptomktpro"] }),
  P({ id: "bitsoalpha", nombre: "Bitso", sigla: "BT", tipo: "exchange", regulador: "PSAV (CNV)", opera247: true, alias: ["bitso"] }),
  P({ id: "binance", nombre: "Binance", sigla: "BI", tipo: "exchange", opera247: true }),
  P({ id: "bybit", nombre: "Bybit", sigla: "BY", tipo: "exchange", opera247: true }),
  P({ id: "mexc", nombre: "MEXC", sigla: "MX", tipo: "exchange", opera247: true }),
  P({ id: "nexo", nombre: "Nexo", sigla: "NE", tipo: "exchange", opera247: true }),
  P({ id: "xapo", nombre: "Xapo", sigla: "XA", tipo: "exchange", opera247: true }),
  P({ id: "banexcoin", nombre: "Banexcoin", sigla: "BX", tipo: "exchange", opera247: true }),
  P({ id: "kriptonmarket", nombre: "Kripton Market", sigla: "KM", tipo: "exchange", opera247: true }),
  P({ id: "trubit", nombre: "TruBit", sigla: "TB", tipo: "exchange", opera247: true }),
  P({ id: "eluter", nombre: "Eluter", sigla: "EL", tipo: "exchange", opera247: true }),
  P({ id: "pluscrypto", nombre: "Plus Crypto", sigla: "PL", tipo: "exchange", opera247: true }),
  P({ id: "eldoradop2p", nombre: "El Dorado", sigla: "ED", tipo: "p2p", opera247: true }),

  // ───── P2P (el precio depende de la contraparte: no es comparable) ─────
  P({ id: "binancep2p", nombre: "Binance P2P", sigla: "BI", tipo: "p2p", opera247: true }),
  P({ id: "okexp2p", nombre: "OKX P2P", sigla: "OK", tipo: "p2p", opera247: true }),
  P({ id: "bybitp2p", nombre: "Bybit P2P", sigla: "BY", tipo: "p2p", opera247: true }),
  P({ id: "kucoinp2p", nombre: "KuCoin P2P", sigla: "KU", tipo: "p2p", opera247: true }),
  P({ id: "bitgetp2p", nombre: "Bitget P2P", sigla: "BG", tipo: "p2p", opera247: true }),
  P({ id: "bingxp2p", nombre: "BingX P2P", sigla: "BX", tipo: "p2p", opera247: true }),
  P({ id: "huobip2p", nombre: "HTX P2P", sigla: "HT", tipo: "p2p", opera247: true }),
  P({ id: "mexcp2p", nombre: "MEXC P2P", sigla: "MX", tipo: "p2p", opera247: true }),
  P({ id: "weexp2p", nombre: "WEEX P2P", sigla: "WE", tipo: "p2p", opera247: true }),
  P({ id: "lemoncashp2p", nombre: "Lemon P2P", sigla: "LE", tipo: "p2p", opera247: true }),
  P({ id: "paydecep2p", nombre: "Paydece P2P", sigla: "PD", tipo: "p2p", opera247: true }),

  // ───── Brokers y administradoras de fondos ─────
  P({ id: "cocos", nombre: "Cocos", sigla: "CC", tipo: "broker", regulador: "CNV", sitio: "https://cocos.capital" }),
  P({ id: "balanz", nombre: "Balanz", sigla: "BZ", tipo: "broker", regulador: "CNV", sitio: "https://balanz.com" }),
  P({ id: "iol", nombre: "IOL", sigla: "IO", tipo: "broker", regulador: "CNV", sitio: "https://www.invertironline.com" }),
  P({ id: "ppi", nombre: "PPI", sigla: "PP", tipo: "broker", regulador: "CNV" }),
  P({ id: "allaria", nombre: "Allaria", sigla: "AL", tipo: "broker", regulador: "CNV" }),
  P({ id: "adcap", nombre: "Adcap", sigla: "AD", tipo: "broker", regulador: "CNV" }),
  P({ id: "sbs", nombre: "SBS", sigla: "SB", tipo: "broker", regulador: "CNV" }),
  P({ id: "tesoro", nombre: "Tesoro Nacional", sigla: "TN", tipo: "fondo" }),
  P({ id: "byma", nombre: "Mercado (BYMA)", sigla: "BY", tipo: "fondo", regulador: "CNV" }),
];

const porId = new Map(PROVEEDORES.map((p) => [p.id, p]));
const porAlias = new Map<string, Proveedor>();
for (const p of PROVEEDORES) {
  porAlias.set(normalizar(p.id), p);
  porAlias.set(normalizar(p.nombre), p);
  for (const a of p.alias ?? []) porAlias.set(normalizar(a), p);
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SUFIJOS = /\b(s\.?a\.?u?\.?|sociedad anonima|cooperativo limitado|compania financiera|argentina)\b/g;

/** Convierte un nombre legal en mayúsculas ("BANCO DE COMERCIO S.A.") en algo legible ("Banco de Comercio"). */
export function nombreLegible(texto: string): string {
  const limpio = normalizar(texto).replace(SUFIJOS, "").replace(/[.,]+$/g, "").replace(/\s+/g, " ").trim();
  const menores = new Set(["de", "del", "la", "las", "los", "y", "el"]);
  return limpio
    .split(" ")
    .map((palabra, i) => (i > 0 && menores.has(palabra) ? palabra : palabra.charAt(0).toUpperCase() + palabra.slice(1)))
    .join(" ");
}

function siglaDe(nombre: string): string {
  const palabras = nombre.replace(/^Banco (de |del |de la )?/i, "").split(/\s+/).filter(Boolean);
  const letras = palabras.length >= 2 ? palabras[0]!.charAt(0) + palabras[1]!.charAt(0) : (palabras[0] ?? nombre).slice(0, 2);
  return letras.toUpperCase();
}

/**
 * Busca un proveedor por id o por cómo lo nombra una fuente. Si no está en la tabla, arma uno genérico
 * con nombre legible y monograma: una fuente nueva nunca rompe la UI.
 */
export function resolverProveedor(textoOId: string, tipoPorDefecto: TipoProveedor = "exchange"): Proveedor {
  const directo = porId.get(textoOId) ?? porAlias.get(normalizar(textoOId));
  if (directo) return directo;
  // Coincidencia por prefijo: "UALA PLUS 1" → Ualá; "BICA CUENTA POSITIVA 2" → Banco Bica.
  const clave = normalizar(textoOId);
  let mejor: Proveedor | undefined;
  let largo = 0;
  for (const [alias, p] of porAlias) {
    if (alias.length >= 4 && clave.startsWith(alias) && alias.length > largo) {
      mejor = p;
      largo = alias.length;
    }
  }
  if (mejor) return mejor;
  const esP2P = clave.endsWith("p2p");
  const nombre = esP2P ? `${nombreLegible(clave.replace(/p2p$/, ""))} P2P` : nombreLegible(textoOId);
  return {
    id: clave.replace(/[^a-z0-9]+/g, "-"),
    nombre,
    sigla: siglaDe(nombre),
    tipo: esP2P ? "p2p" : tipoPorDefecto,
    opera247: tipoPorDefecto === "exchange" || esP2P,
  };
}

export function proveedorPorId(id: string): Proveedor | undefined {
  return porId.get(id);
}
