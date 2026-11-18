import { describe, expect, it } from "vitest";
import { filtrarPorGrupo, filtrosDeGrupo, gruposDisponibles, normalizarGrupo, SIN_GRUPO, TODOS } from "@/lib/favoritos/grupos";
import { indicesEEUU } from "@/lib/data/servicios/mercados";

const favs = [
  { ticker: "NVDA", grupo: "Especulativas" },
  { ticker: "KO", grupo: "Dividendos" },
  { ticker: "NBIS", grupo: "Especulativas" },
  { ticker: "BTC", grupo: "Cripto largo plazo" },
  { ticker: "AL30", grupo: null },
];

describe("grupos de seguimiento", () => {
  it("normaliza el nombre: espacios, largo, mayúscula inicial y reusa el que ya existe", () => {
    expect(normalizarGrupo("  mis   apuestas ")).toBe("Mis apuestas");
    expect(normalizarGrupo("   ")).toBeNull();
    expect(normalizarGrupo("a".repeat(40))!.length).toBe(24);
    expect(normalizarGrupo("dividendos", ["Dividendos"])).toBe("Dividendos");
    expect(normalizarGrupo("DÍVIDENDOS", ["Dividendos"])).toBe("Dividendos");
  });

  it("no hay grupos armados: solo los de la persona, en orden alfabético y sin repetir", () => {
    expect(gruposDisponibles([])).toEqual([]);
    expect(gruposDisponibles(favs, ["Argentina", "especulativas"])).toEqual(["Argentina", "Cripto largo plazo", "Dividendos", "Especulativas"]);
  });

  it("filtros: todos, los grupos con algo adentro y sin grupo al final", () => {
    expect(filtrosDeGrupo(favs)).toEqual([
      { id: TODOS, etiqueta: "Todos", cantidad: 5 },
      { id: "Cripto largo plazo", etiqueta: "Cripto largo plazo", cantidad: 1 },
      { id: "Dividendos", etiqueta: "Dividendos", cantidad: 1 },
      { id: "Especulativas", etiqueta: "Especulativas", cantidad: 2 },
      { id: SIN_GRUPO, etiqueta: "Sin grupo", cantidad: 1 },
    ]);
    expect(filtrosDeGrupo([{ grupo: null }, {}])).toEqual([]);
  });

  it("filtra por grupo; un grupo vacío o 'todos' muestra todo", () => {
    expect(filtrarPorGrupo(favs, "Especulativas").map((f) => f.ticker)).toEqual(["NVDA", "NBIS"]);
    expect(filtrarPorGrupo(favs, SIN_GRUPO).map((f) => f.ticker)).toEqual(["AL30"]);
    expect(filtrarPorGrupo(favs, "Grupo que ya no existe")).toHaveLength(5);
    expect(filtrarPorGrupo(favs, TODOS)).toHaveLength(5);
  });
});

describe("índices de EE.UU. por sus CEDEARs", () => {
  const fila = (symbol: string, c: number | null, pct_change: number | null) => ({ symbol, px_bid: c, px_ask: c, v: 100, q_op: 10, c, pct_change });
  it("variación en dólares de la especie D y en pesos de la especie en pesos", () => {
    const panel = [fila("SPY", 20980, 1.64), fila("SPYD", 12.93, -0.46), fila("QQQ", 56800, 2.25), fila("DIA", 43180, 0.55), fila("DIAD", null, -0.63)];
    expect(indicesEEUU(panel)).toEqual([
      { nombre: "S&P 500", ticker: "SPY", precioArs: 20980, variacionArs: 0.0164, variacionUsd: -0.0046 },
      { nombre: "Nasdaq 100", ticker: "QQQ", precioArs: 56800, variacionArs: 0.0225, variacionUsd: null },
      { nombre: "Dow Jones", ticker: "DIA", precioArs: 43180, variacionArs: 0.0055, variacionUsd: null },
    ]);
  });
  it("sin precio en pesos, el índice no aparece", () => {
    expect(indicesEEUU([fila("SPY", 0, 1), fila("SPYD", 12, 1)])).toEqual([]);
  });
});
