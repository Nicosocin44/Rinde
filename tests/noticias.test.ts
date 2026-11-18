import { describe, expect, it } from "vitest";
import { armarNoticias, clasificar, limpiarTexto, mismaNoticia, parecido, recortar, type NoticiaCruda } from "@/lib/noticias";

const ahora = new Date("2026-11-17T21:00:00Z");
const cruda = (medioId: string, titulo: string, minutosAtras: number, resumen = "", url?: string): NoticiaCruda => ({
  medioId,
  titulo,
  resumen,
  url: url ?? `https://${medioId}.com/${encodeURIComponent(titulo)}`,
  fecha: new Date(ahora.getTime() - minutosAtras * 60_000).toISOString(),
});

describe("noticias · limpieza", () => {
  it("saca HTML, scripts y entidades", () => {
    expect(limpiarTexto("<p>El d&oacute;lar <b>subi&#243;</b></p><script>alert(1)</script>  hoy")).toBe("El dólar subió hoy");
  });
  it("recorta en un espacio y agrega puntos suspensivos", () => {
    const largo = "palabra ".repeat(60);
    const r = recortar(largo, 50);
    expect(r.length).toBeLessThanOrEqual(51);
    expect(r.endsWith("…")).toBe(true);
    expect(recortar("corto", 50)).toBe("corto");
  });
});

describe("noticias · clasificación por mercado", () => {
  it("detecta dólar, bonos, tasas, cripto y economía", () => {
    expect(clasificar("El dólar blue tocó un nuevo máximo", "").mercados).toContain("dolar");
    expect(clasificar("El riesgo país perforó los 800 puntos", "").mercados).toContain("bonos");
    expect(clasificar("Cuánto paga el plazo fijo hoy", "").mercados).toContain("tasas");
    expect(clasificar("Bitcoin vuelve a subir", "").mercados).toContain("cripto");
    expect(clasificar("La inflación de octubre fue 2,1 % según el INDEC", "").mercados).toContain("economia");
  });
  it("reconoce empresas por su nombre y las suma a acciones", () => {
    const r = clasificar("Nvidia superó las expectativas", "El balance del tercer trimestre");
    expect(r.tickers).toContain("NVDA");
    expect(r.mercados).toContain("acciones");
    expect(clasificar("Grupo Galicia ganó más que el año pasado", "").tickers).toContain("GGAL");
  });
  it("no confunde palabras comunes con empresas", () => {
    expect(clasificar("La meta fiscal del año", "").tickers).toEqual([]);
    expect(clasificar("Vale la pena ahorrar", "").tickers).toEqual([]);
  });
  it("una noticia que no habla de mercados no se clasifica", () => {
    expect(clasificar("Ganó Boca en la Bombonera", "Fue 2 a 1 con un gol en el final").mercados).toEqual([]);
  });
});

describe("noticias · armado de la lista", () => {
  it("agrupa la misma noticia de distintos medios y deja la más nueva primero", () => {
    const lista = armarNoticias(
      [
        cruda("ambito", "El riesgo país cae a 780 puntos y los bonos suben", 30),
        cruda("infobae", "Los bonos suben y el riesgo país cae a 780 puntos", 45),
        cruda("cronista", "Cuánto paga hoy el plazo fijo en los principales bancos", 10),
      ],
      { ahora },
    );
    expect(lista).toHaveLength(2);
    expect(lista[0]!.medioId).toBe("cronista");
    expect(lista[1]!.tambienEn).toEqual([{ medioId: "infobae", url: expect.any(String) }]);
  });
  it("descarta las viejas, las del futuro, las repetidas por link y las que no son de mercados", () => {
    const lista = armarNoticias(
      [
        cruda("ambito", "El dólar MEP cerró estable", 60 * 80),
        cruda("ambito", "El dólar MEP abrió en alza", -60),
        cruda("ambito", "Ganó Boca", 5),
        cruda("ambito", "El dólar oficial no se movió", 5, "", "https://x.com/1"),
        cruda("infobae", "Otra nota con el mismo link sobre el dólar", 6, "", "https://x.com/1"),
      ],
      { ahora },
    );
    expect(lista.map((n) => n.titulo)).toEqual(["El dólar oficial no se movió"]);
  });
  it("reconoce la misma noticia con redacciones distintas, sin juntar noticias diferentes", () => {
    expect(mismaNoticia("La inflación mayorista se desaceleró al 1,6% en octubre tras el freno del petróleo", "La inflación mayorista en octubre fue de 1,6% y acumuló 29,8% en doce meses")).toBe(true);
    expect(mismaNoticia("Nvidia superó una prueba clave y descartó el regreso de Jensen Huang", "Nvidia desafía el escándalo por la salida de Jensen Huang con un balance récord")).toBe(true);
    expect(mismaNoticia("El dólar blue superó los $1.600", "La inflación mayorista fue de 1,6% en octubre")).toBe(false);
  });
  it("una empresa nombrada solo en el resumen no alcanza para que sea noticia de mercado", () => {
    expect(clasificar("Fallas en Outlook complicaron a turistas", "El servicio de Microsoft estuvo caído varias horas").mercados).toEqual([]);
    expect(clasificar("Wall Street cerró en baja", "Microsoft y Apple lideraron las caídas").tickers).toEqual(expect.arrayContaining(["MSFT", "AAPL"]));
  });
  it("la destacada sube con la cantidad de medios que la cubren", () => {
    const lista = armarNoticias(
      [cruda("ambito", "El riesgo país cae a 780 puntos y suben los bonos", 30), cruda("infobae", "Suben los bonos y el riesgo país cae a 780 puntos", 40), cruda("cronista", "El dólar blue sube", 5)],
      { ahora },
    );
    const bonos = lista.find((n) => n.titulo.includes("riesgo"))!;
    const dolar = lista.find((n) => n.titulo.includes("blue"))!;
    expect(bonos.relevancia).toBeGreaterThan(dolar.relevancia);
  });
  it("parecido es simétrico y va de 0 a 1", () => {
    expect(parecido("El dólar blue sube", "El dólar blue sube")).toBe(1);
    expect(parecido("El dólar blue sube", "Bitcoin cae fuerte")).toBe(0);
  });
});

describe("noticias · notas de rutina", () => {
  it("reconoce las notas de cotización diaria y no las deja como destacadas", async () => {
    const { esRutina } = await import("@/lib/noticias");
    expect(esRutina("Dólar hoy y dólar blue hoy: cuál es la cotización del viernes minuto a minuto")).toBe(true);
    expect(esRutina("Real blue: a cuánto operó este martes 17 de noviembre")).toBe(true);
    expect(esRutina("El dólar blue superó los $1.600 y alcanzó un máximo nominal")).toBe(false);
  });
});
