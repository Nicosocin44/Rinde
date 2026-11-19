import { describe, expect, it } from "vitest";
import { leerBusqueda, sinMedio, type NoticiaBuscada } from "@/lib/data/adapters/googlenews";
import { consultasDe } from "@/lib/data/servicios/noticias-activo";
import { esRuido, juntarNoticias } from "@/lib/noticias/activo";
import type { Noticia } from "@/lib/noticias";

const AHORA = new Date("2026-11-19T20:00:00Z");
const buscada = (titulo: string, fuente: string, fecha: string, idioma: "es" | "en" = "es", url = `https://news.google.com/rss/articles/${encodeURIComponent(titulo)}`): NoticiaBuscada => ({ titulo, fuente, fecha, idioma, url });

describe("Google Noticias · lectura del RSS", () => {
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Nvidia</title>
    <item><title>Jensen Huang's legal exposure balloons - CNBC</title><link>https://news.google.com/rss/articles/abc</link><pubDate>Thu, 19 Nov 2026 17:30:25 GMT</pubDate><source url="https://www.cnbc.com">CNBC</source></item>
    <item><title>Trump bought Nvidia stock - Reuters</title><link>https://news.google.com/rss/articles/def</link><pubDate>Thu, 19 Nov 2026 18:37:35 GMT</pubDate><source url="https://www.reuters.com">Reuters</source></item>
  </channel></rss>`;
  it("lee título (sin el medio pegado al final), medio, fecha e idioma", () => {
    expect(leerBusqueda(xml, "en")).toEqual([
      { titulo: "Jensen Huang's legal exposure balloons", url: "https://news.google.com/rss/articles/abc", fecha: "2026-11-19T17:30:25.000Z", fuente: "CNBC", idioma: "en" },
      { titulo: "Trump bought Nvidia stock", url: "https://news.google.com/rss/articles/def", fecha: "2026-11-19T18:37:35.000Z", fuente: "Reuters", idioma: "en" },
    ]);
  });
  it("una búsqueda sin resultados no es un error", () => {
    expect(leerBusqueda(`<rss><channel><title>x</title></channel></rss>`, "es")).toEqual([]);
  });
  it("solo saca el medio si está al final", () => {
    expect(sinMedio("Riesgo país hoy - Infobae", "Infobae")).toBe("Riesgo país hoy");
    expect(sinMedio("Infobae - una nota", "Infobae")).toBe("Infobae - una nota");
  });
});

describe("noticias de un activo · ruido", () => {
  it("descarta páginas de cotización, gráficos, series de opciones y notas automáticas", () => {
    expect(esRuido("NVIDIA Corporation (NVDA) stock price, news, quote and history")).toBe(true);
    expect(esRuido("Gráfico y cotización de CRES.CI: BCBA:CRES.CI")).toBe(true);
    expect(esRuido("Gráfico de rentabilidades estacionales de GGAL Nov 2026 46.000 call (GGAL261120C00046000)")).toBe(true);
    expect(esRuido("Apple Inc. (NASDAQ:AAPL) Shares Sold by Smith Capital LLC")).toBe(true);
    expect(esRuido("MercadoLibre (NASDAQ:MELI) Stock Price Target Cut by Bank of America")).toBe(true);
    expect(esRuido("Cualquier título", "MarketBeat")).toBe(true);
    expect(esRuido("Trump bought up to $265,000 of Nvidia stock in September", "Reuters")).toBe(false);
  });
});

describe("noticias de un activo · cómo se juntan", () => {
  const propia: Noticia = {
    id: "p1",
    titulo: "Galicia ganó más de lo esperado en el tercer trimestre",
    resumen: "",
    url: "https://www.infobae.com/galicia",
    fecha: "2026-11-19T12:00:00.000Z",
    medioId: "infobae",
    mercados: ["acciones"],
    mercadosEnTitulo: ["acciones"],
    tickers: ["GGAL"],
    tambienEn: [],
    relevancia: 0,
  };

  it("la misma noticia en otro medio queda una sola, con 'también en'", () => {
    const r = juntarNoticias({ propias: [propia], directas: [buscada("Galicia ganó más de lo esperado en el tercer trimestre", "El Cronista", "2026-11-19T13:00:00Z")], indirectas: [], ahora: AHORA });
    expect(r).toHaveLength(1);
    expect(r[0]!.tambienEn).toEqual([{ medioId: "cronista", url: expect.any(String) }]); // El Cronista es uno de nuestros medios (su logo)
  });

  it("de la más nueva a la más vieja, sin ruido, con el medio y el idioma", () => {
    const r = juntarNoticias({
      propias: [],
      directas: [buscada("Nota vieja", "CNN", "2026-11-17T10:00:00Z", "en"), buscada("Nota nueva", "CNBC", "2026-11-19T10:00:00Z", "en"), buscada("NVDA stock price, news, quote and history", "Yahoo", "2026-11-19T11:00:00Z", "en")],
      indirectas: [],
      ahora: AHORA,
      minimoDirectas: 1,
    });
    expect(r.map((n) => [n.titulo, n.fuente, n.idioma, n.indirecta])).toEqual([
      ["Nota nueva", "CNBC", "en", false],
      ["Nota vieja", "CNN", "en", false],
    ]);
  });

  it("si las directas son pocas, completa con las del mercado (marcadas) hasta el máximo", () => {
    const titulos = ["Subió el riesgo país y cayeron los bonos", "El Merval cerró en baja por Wall Street", "Licitación del Tesoro: cuánto consiguió", "Las reservas del BCRA tocaron un récord", "El dólar mayorista quedó estable", "Qué esperan los analistas para diciembre", "Inflación de octubre: lo que dijo el INDEC", "Bancos argentinos con balances mixtos"];
    const indirectas = titulos.map((t, k) => buscada(t, "Ámbito", `2026-11-19T0${k}:00:00Z`));
    const r = juntarNoticias({ propias: [propia], directas: [], indirectas, ahora: AHORA, maximo: 6, minimoDirectas: 4 });
    expect(r).toHaveLength(6);
    expect(r[0]!.indirecta).toBe(false);
    expect(r.slice(1).every((n) => n.indirecta)).toBe(true);
  });

  it("con suficientes directas no agrega las del mercado", () => {
    const titulos = ["Nvidia unveils new data center chip", "Jensen Huang steps down as CEO", "Nvidia shares fall after earnings", "China restricts Nvidia exports again", "Analysts debate Nvidia valuation"];
    const directas = titulos.map((t, k) => buscada(t, "Reuters", `2026-11-19T1${k}:00:00Z`, "en"));
    const r = juntarNoticias({ propias: [], directas, indirectas: [buscada("Wall Street sube", "CNBC", "2026-11-19T15:00:00Z", "en")], ahora: AHORA });
    expect(r.some((n) => n.indirecta)).toBe(false);
  });
});

describe("noticias de un activo · qué se busca", () => {
  it("CEDEAR: la empresa en inglés y en castellano, con contexto (Apple es ambiguo); el mercado, Wall Street", () => {
    const c = consultasDe({ tipo: "cedear", ticker: "AAPL", nombre: "Apple Inc." });
    expect(c.directas).toEqual([
      { q: '"Apple" stock', idioma: "en", dias: 4 },
      { q: '"Apple" acciones', idioma: "es", dias: 7 },
    ]);
    expect(c.indirectas.map((x) => x.q)).toContain("Wall Street stocks");
  });
  it("acción argentina con ADR: también en inglés; el mercado, el Merval", () => {
    const c = consultasDe({ tipo: "accion", ticker: "GGAL", nombre: "Grupo Galicia", conAdr: true });
    expect(c.directas.map((x) => [x.q, x.idioma])).toEqual([
      ['"Grupo Galicia"', "es"],
      ['"Grupo Galicia" Argentina', "en"],
    ]);
    expect(c.indirectas[0]!.q).toMatch(/Merval/);
  });
  it("bono, LECAP y cripto", () => {
    expect(consultasDe({ tipo: "bono", ticker: "AL30", nombre: "Bonar 2030" }).directas[0]!.q).toBe('"AL30" bonos');
    expect(consultasDe({ tipo: "lecap", ticker: "S30N6", nombre: null }).indirectas[0]!.q).toMatch(/LECAP/);
    expect(consultasDe({ tipo: "cripto", ticker: "BTC", nombre: null }).directas.map((x) => x.q)).toEqual(['"Bitcoin"', '"Bitcoin"']);
  });
});
