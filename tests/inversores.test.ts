import { describe, expect, it } from "vitest";
import { enlaceDe, etiquetaTrimestre, iniciales } from "@/lib/inversores/datos";

/** Carteras de grandes inversores (13F): las funciones puras de la pantalla. */
describe("Inversores", () => {
  it("el trimestre de un cierre", () => {
    expect(etiquetaTrimestre("2026-09-30")).toBe("3T 2026");
    expect(etiquetaTrimestre("2026-03-31")).toBe("1T 2026");
    expect(etiquetaTrimestre("2025-12-31")).toBe("4T 2025");
  });
  it("iniciales del monograma, sin conectores", () => {
    expect(iniciales({ nombre: "Berkshire Hathaway" })).toBe("BH");
    expect(iniciales({ nombre: "Fundación Gates" })).toBe("FG");
    expect(iniciales({ nombre: "Pershing Square" })).toBe("PS");
    expect(iniciales({ nombre: "North of South Capital" })).toBe("NS");
    expect(iniciales({ nombre: "Helikon" })).toBe("HE");
  });
  it("a dónde lleva cada fila: acciones argentinas por su ticker de BYMA; CEDEARs solo si cotizan hoy", () => {
    const cedears = new Set(["AAPL", "BRKB"]);
    expect(enlaceDe({ ticker: "YPF", byma: "YPFD" }, cedears)).toBe("/activo/YPFD");
    expect(enlaceDe({ ticker: "AAPL", byma: null }, cedears)).toBe("/activo/AAPL");
    expect(enlaceDe({ ticker: "BRK.B", byma: null }, cedears)).toBe("/activo/BRKB");
    expect(enlaceDe({ ticker: "BBD", byma: null }, cedears)).toBeNull();
    expect(enlaceDe({ ticker: null, byma: null }, cedears)).toBeNull();
  });
});
