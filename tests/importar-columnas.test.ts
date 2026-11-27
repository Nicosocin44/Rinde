import { describe, expect, it } from "vitest";
import { interpretarArchivos, necesitaMapeo } from "@/lib/cartera/brokers";
import { adivinarMapeo, aplicarMapeo, camposQueFaltan, claveOperacion, encontrarEncabezado, firmaColumnas, tickerDe, tipoPorTicker, valoresDeOperacion } from "@/lib/cartera/brokers/columnas";
import { COLUMNAS, leerCsv, planillaModelo } from "@/lib/cartera/importar";

/**
 * Un archivo inventado de un broker argentino cualquiera: un título arriba, una fila vacía (leerCsv la saca, así que los
 * títulos quedan en la fila 1), los títulos de las columnas en otro orden y con otros nombres, montos con coma decimal y
 * una fila de total al final.
 */
const ARCHIVO = leerCsv(
  [
    "Movimientos de la cuenta comitente;;;;;;",
    ";;;;;;",
    "Fecha Concertación;Tipo de operación;Especie;Cantidad;Precio;Importe neto;Moneda",
    "20/11/2026;Compra;AAPL;10;18.500;-185.925,5;Pesos",
    "19/11/2026;Venta;GGAL;-50;6.200;308.140;Pesos",
    "15/11/2026;Dividendo;KO;;;1.234,56;Pesos",
    "14/11/2026;Depósito de fondos;;;;500.000;Pesos",
    "10/11/2026;Compra;XYZ9;5;1.000;-5.025;Pesos",
    "05/11/2026;Compra;S30N6;100000;98,5;-98.600;Pesos",
    "Total;;;;;525.000;",
  ].join("\n"),
);

describe("adivinar las columnas", () => {
  const mapeo = adivinarMapeo(ARCHIVO);

  it("encuentra la fila de títulos aunque haya un título arriba", () => {
    expect(encontrarEncabezado(ARCHIVO)).toBe(1);
    expect(mapeo.encabezado).toBe(1);
  });

  it("reconoce cada columna por su título", () => {
    expect(mapeo.columnas).toEqual({ fecha: 0, operacion: 1, ticker: 2, cantidad: 3, precio: 4, importe: 5, moneda: 6 });
    expect(camposQueFaltan(mapeo)).toEqual([]);
  });

  it("agrupa las operaciones y adivina qué es cada una", () => {
    expect(valoresDeOperacion(ARCHIVO, mapeo).map((v) => [v.clave, v.filas])).toEqual([
      ["compra", 3],
      ["venta", 1],
      ["dividendo", 1],
      ["deposito de fondos", 1],
    ]);
    expect(mapeo.operaciones).toEqual({ compra: "compra", venta: "venta", dividendo: "dividendo", "deposito de fondos": "omitir" });
  });

  it("sin ticker y sin números en la clave: los boletos de distintos tickers van juntos, y la venta no se pierde", () => {
    expect(claveOperacion("Boleto / 10000001 / COMPRA / 1 / NVDA / $", "NVDA")).toBe("boleto compra");
    expect(claveOperacion("Boleto / 10000002 / VENTA / 1 / BRKB / $", "BRKB")).toBe("boleto venta");
  });

  it("la firma de las columnas, para recordar el mapeo", () => {
    expect(firmaColumnas(ARCHIVO, 1)).toBe("fecha concertacion|tipo de operacion|especie|cantidad|precio|importe neto|moneda");
  });
});

describe("aplicar el mapeo", () => {
  it("pasa cada fila a nuestra planilla, con el tipo por el ticker y la comisión por el importe", () => {
    const r = aplicarMapeo(ARCHIVO, adivinarMapeo(ARCHIVO), "Cocos");
    expect(r.filas[0]).toEqual(COLUMNAS);
    // [fecha, tipo_movimiento, activo, ticker, tipo_activo, moneda, cantidad, precio, comision, nota, tna, vencimiento]
    // 10 × 18.500 = 185.000; el importe es 185.925,5: 925,5 de comisión (0,5 %).
    expect(r.filas[1]).toEqual(["2026-11-20", "compra", "", "AAPL", "cedear", "ARS", "10", "18500", "925,5", "Cocos · fila 3", "", ""]);
    // La venta viene negativa: 50 × 6.200 = 310.000, se cobran 308.140: 1.860 de comisión.
    expect(r.filas[2]).toEqual(["2026-11-19", "venta", "", "GGAL", "accion", "ARS", "50", "6200", "1860", "Cocos · fila 4", "", ""]);
    expect(r.filas[3]).toEqual(["2026-11-15", "dividendo", "", "KO", "cedear", "ARS", "1234,56", "", "", "Cocos · fila 5", "", ""]);
    expect(r.filas[4]!.slice(0, 8)).toEqual(["2026-11-05", "compra", "", "S30N6", "lecap", "ARS", "100000", "98,5"]);
    expect(r.origen).toEqual([3, 4, 5, 8]);
  });

  it("lo que no se suma queda omitido: el depósito, el ticker que no conocemos y el total", () => {
    const r = aplicarMapeo(ARCHIVO, adivinarMapeo(ARCHIVO), "Cocos");
    const motivo = (n: number) => r.omitidas.find((o) => o.n === n)?.motivo;
    expect(motivo(6)).toMatch(/Depósito de fondos.*no sumarlo/);
    expect(motivo(7)).toMatch(/No reconocemos XYZ9/);
    expect(motivo(9)).toBe("No parece un movimiento: no tiene fecha.");
    expect(r.omitidas.find((o) => o.n === 9)?.texto).toBe("Total");
    expect(r.omitidas).toHaveLength(3);
  });

  it("si se elige qué son los tickers que no conocemos, se suman como eso", () => {
    const mapeo = { ...adivinarMapeo(ARCHIVO), tipoPorDefecto: "cedear" as const };
    const r = aplicarMapeo(ARCHIVO, mapeo, "Cocos");
    expect(r.filas.find((f) => f[3] === "XYZ9")?.[4]).toBe("cedear");
  });

  it("sin columna de precio, sale del importe; y una columna de tipo de activo manda sobre el ticker", () => {
    const filas = [
      ["Fecha", "Operación", "Ticker", "Cantidad", "Importe", "Tipo de instrumento"],
      ["2026-11-20", "COMPRA", "YPFD", "4", "-160000", "Acciones"],
      ["2026-11-20", "COMPRA", "FCI1", "4", "-160000", "Fondos comunes"],
    ];
    const r = aplicarMapeo(filas, adivinarMapeo(filas), "IOL");
    expect(r.filas[1]!.slice(3, 9)).toEqual(["YPFD", "accion", "", "4", "40000", ""]);
    expect(r.omitidas[0]?.motivo).toMatch(/fondos todavía no/);
  });
});

describe("cuándo preguntar las columnas", () => {
  it("sí para un archivo desconocido; no para nuestra planilla ni para Balanz", () => {
    expect(necesitaMapeo(ARCHIVO)).toBe(true);
    expect(necesitaMapeo(leerCsv(planillaModelo()))).toBe(false);
    expect(necesitaMapeo([["Descripcion", "Ticker", "Tipo de Instrumento", "Concertacion", "Cantidad", "Precio", "Liquidacion", "Moneda", "Importe"]])).toBe(false);
  });

  it("el ticker de una celda y su tipo", () => {
    expect(tickerDe("NVDA - CEDEAR NVIDIA")).toBe("NVDA");
    expect(tickerDe("Cedear Apple (AAPL)")).toBe("AAPL");
    expect(tipoPorTicker("GGAL")).toBe("accion");
    expect(tipoPorTicker("AAPL")).toBe("cedear");
    expect(tipoPorTicker("AL30")).toBeNull();
  });
});

describe("importar con el mapeo", () => {
  it("de punta a punta: la vista previa con las filas del archivo original y las omitidas", () => {
    let i = 0;
    const r = interpretarArchivos([{ nombre: "cocos.csv", filas: ARCHIVO, mapeo: adivinarMapeo(ARCHIVO), broker: "Cocos" }], { activos: [], movimientos: [] }, "2026-11-27", () => `id${++i}`);
    if (!r.ok) throw new Error(r.error);
    expect(r.formatos).toEqual([{ nombre: "cocos.csv", formato: "columnas" }]);
    expect(r.filas.map((f) => [f.n, f.estado === "omitida" ? "omitida" : "se suma"])).toEqual([
      [3, "se suma"],
      [4, "se suma"],
      [5, "se suma"],
      [6, "omitida"],
      [7, "omitida"],
      [8, "se suma"],
      [9, "omitida"],
    ]);
    expect(r.filas[0]!.movimiento).toMatchObject({ tipo: "compra", cantidad: "10", precio: "18500", comision: "925.5", nota: "Cocos · fila 3" });
    // GGAL se vende sin estar en la cartera: para revisar.
    expect(r.filas[1]!.estado).toBe("aviso");
  });
});

describe("la planilla de Nico (títulos con errores y acciones de EE.UU. en dólares)", () => {
  // Tal cual: "tipo_movimineto" con las letras cambiadas, "$ invertida" y montos con "USD".
  const PLANILLA = leerCsv(
    [
      "Fecha;tipo_movimineto;Activo;Ticker;Tipo_activo;Moneda;Cantidad;Precio;$ invertida",
      "25/02/2025;Compra;Microsoft;MSFT;accion;USD;5.00;$400 USD;2.000 USD",
      "22/05/2025;Compra;Google;GOOGL;cedear;ARS;0,57;$175,98;100,3",
    ].join("\n"),
  );

  it("adivina todas las columnas, incluida la que tiene un error de tipeo", () => {
    const m = adivinarMapeo(PLANILLA);
    expect(m.columnas).toMatchObject({ fecha: 0, operacion: 1, ticker: 3, tipo_activo: 4, moneda: 5, cantidad: 6, precio: 7, importe: 8 });
    expect(camposQueFaltan(m)).toEqual([]);
  });

  it("la acción en dólares no se suma y dice por qué; el CEDEAR en pesos queda listo", () => {
    let i = 0;
    const r = interpretarArchivos([{ nombre: "nico.csv", filas: PLANILLA, mapeo: adivinarMapeo(PLANILLA), broker: "Otro" }], { activos: [], movimientos: [] }, "2026-11-27", () => `id${++i}`);
    if (!r.ok) throw new Error(r.error);
    const msft = r.filas.find((f) => f.texto.includes("MSFT"))!;
    expect(msft.estado).toBe("error");
    expect(msft.motivos.join(" ")).toMatch(/acciones de EE\.UU\. no las llevamos/);
    const googl = r.filas.find((f) => f.activo?.id === "cedear:GOOGL")!;
    expect(googl).toMatchObject({ estado: "lista", cantidad: "0.57", precio: "175.98" });
  });
});
