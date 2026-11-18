import { describe, expect, it } from "vitest";
import { describirEmpresa, menciona, nombreParaBuscar, ratioAproximado } from "@/lib/activos/perfil";
import { armarNombres, armarPerfil, sparqlSchema } from "@/lib/data/adapters/wikidata";
import respuestas from "./fixtures/wikidata.json";

// Respuestas reales de Wikidata (18/11/2026) para NBIS (Nebius Group) y C (que tiene tickers viejos de otras empresas).

describe("perfil de empresa (Wikidata)", () => {
  it("arma el perfil de NBIS con país, sede, fundación, web, industrias y bolsa", () => {
    const p = armarPerfil(sparqlSchema.parse(respuestas.NBIS).results.bindings)!;
    expect(p.nombre).toBe("Nebius Group");
    expect(p.pais).toBe("Países Bajos");
    expect(p.sede).toBe("Ámsterdam");
    expect(p.fundacion).toBe(2004);
    expect(p.web).toBe("https://nebius.group/");
    expect(p.bolsa).toBe("Nasdaq");
    expect(p.industrias).toContain("inteligencia artificial");
    expect(p.empleados?.cantidad).toBeGreaterThan(0);
    expect(p.wikipediaEn).toBe("https://en.wikipedia.org/wiki/Nebius_Group");
  });

  it("con un ticker compartido elige la empresa vigente más conocida (C → Citigroup)", () => {
    expect(armarPerfil(sparqlSchema.parse(respuestas.C).results.bindings)?.nombre).toBe("Citigroup");
  });

  it("sin filas no hay perfil", () => {
    expect(armarPerfil([])).toBeNull();
  });

  it("descripción en castellano con lo que hay", () => {
    const p = armarPerfil(sparqlSchema.parse(respuestas.NBIS).results.bindings)!;
    expect(describirEmpresa({ ...p, industrias: ["inteligencia artificial"] })).toBe(
      "Nebius Group es una empresa de inteligencia artificial con sede en Ámsterdam (Países Bajos), fundada en 2004. Cotiza en Nasdaq.",
    );
    expect(describirEmpresa({ ...p, industrias: [], sede: null, fundacion: null, bolsa: "Bolsa de Buenos Aires" })).toBe(
      "Nebius Group es una empresa con sede en Países Bajos. Cotiza en la Bolsa de Buenos Aires.",
    );
  });
});

describe("noticias de una empresa por su nombre", () => {
  it("saca los sufijos societarios y descarta nombres ambiguos o cortos", () => {
    expect(nombreParaBuscar("Nebius Group")).toBe("Nebius");
    expect(nombreParaBuscar("Palantir Technologies Inc.")).toBe("Palantir");
    expect(nombreParaBuscar("Vale S.A.")).toBeNull();
    expect(nombreParaBuscar("Nu Holdings")).toBeNull();
    expect(nombreParaBuscar("IBM")).toBeNull();
  });

  it("busca la palabra completa, sin importar mayúsculas ni acentos", () => {
    expect(menciona("Nebius se dispara tras su balance", "Nebius")).toBe(true);
    expect(menciona("NEBIUS: récord de ingresos", "Nebius")).toBe(true);
    expect(menciona("La compañía Nebiusx no existe", "Nebius")).toBe(false);
    expect(menciona("Pampa Energía invierte", "Pampa Energia")).toBe(true);
  });
});

describe("ratio del CEDEAR", () => {
  it("solo si da casi entero", () => {
    expect(ratioAproximado(106.15, 106.15 / 15.2)).toBe(15);
    expect(ratioAproximado(351.18, 351.18 / 20)).toBe(20);
    expect(ratioAproximado(100, 100 / 7.5)).toBeNull();
    expect(ratioAproximado(null, 4)).toBeNull();
    expect(ratioAproximado(10, 20)).toBeNull();
  });
});

describe("nombres en tanda (Wikidata)", () => {
  const fila = (t: string, nombre: string, n: number) => ({ t: { type: "literal", value: t }, empresaLabel: { type: "literal", value: nombre }, n: { type: "literal", value: String(n) } });
  it("un nombre por ticker: el de la empresa más conocida, sin ids sueltos", () => {
    expect(armarNombres([fila("MU", "Micron Technology", 40), fila("C", "Q12306354", 0), fila("C", "Citigroup", 50), fila("C", "Stellantis North America", 30)])).toEqual({
      MU: "Micron Technology",
      C: "Citigroup",
    });
  });
});
