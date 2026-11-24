import { describe, expect, it } from "vitest";
import type { Activo, Movimiento } from "@/lib/calculos/cartera";
import { fechaDe, filasDeExcel, interpretarPlanilla, leerCsv, numeroDe, planillaModelo } from "@/lib/cartera/importar";
import { movimientosACsv } from "@/lib/cartera/repositorio";

const HOY = "2026-11-24";
const ids = () => {
  let i = 0;
  return () => `id-${++i}`;
};
const vacia = { activos: [] as Activo[], movimientos: [] as Movimiento[] };
const ENCABEZADO = "fecha;tipo_movimiento;activo;ticker;tipo_activo;moneda;cantidad;precio;comision;nota;tna;vencimiento";
const leer = (lineas: string[], cartera = vacia) => interpretarPlanilla(leerCsv([ENCABEZADO, ...lineas].join("\n")), cartera, HOY, ids());

describe("numeroDe", () => {
  it.each([
    ["1.234.567,89", "1234567.89"],
    ["1234,5", "1234.5"],
    ["18500", "18500"],
    ["0.005", "0.005"],
    ["0,005", "0.005"],
    ["$ 18.500", "18500"],
    ["US$ 62,5", "62.5"],
    ["1234.56", "1234.56"],
    ["30%", "30"],
  ])("%s → %s", (entrada, salida) => expect(numeroDe(entrada)).toBe(salida));
  it("no inventa números", () => {
    expect(numeroDe("abc")).toBeNull();
    expect(numeroDe("")).toBeNull();
    expect(numeroDe("12a")).toBeNull();
  });
});

describe("fechaDe", () => {
  it.each([
    ["10/03/2026", "2026-03-10"],
    ["1/3/26", "2026-03-01"],
    ["10-03-2026", "2026-03-10"],
    ["2026-03-10", "2026-03-10"],
  ])("%s → %s", (entrada, salida) => expect(fechaDe(entrada)).toBe(salida));
  it("rechaza fechas que no existen", () => {
    expect(fechaDe("31/02/2026")).toBeNull();
    expect(fechaDe("marzo")).toBeNull();
  });
});

describe("leerCsv", () => {
  it("detecta el separador y respeta las comillas", () => {
    expect(leerCsv('a;b;c\n1;"x;y";3')).toEqual([["a", "b", "c"], ["1", "x;y", "3"]]);
    expect(leerCsv("a,b,c\r\n1,2,3\r\n")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(leerCsv("﻿sep=;\na;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("interpretarPlanilla", () => {
  it("una compra de CEDEAR queda lista, con el nombre de nuestra lista", () => {
    const r = leer(["10/03/2026;compra;;AAPL;cedear;ARS;10;18.500;150;;;"]);
    if (!r.ok) throw new Error(r.error);
    const f = r.filas[0]!;
    expect(f.estado).toBe("lista");
    expect(f.activo?.id).toBe("cedear:AAPL");
    expect(f.activo?.nombre).toBe("Apple");
    expect(f.movimiento).toEqual({ id: "id-1", activoId: "cedear:AAPL", fecha: "2026-03-10", tipo: "compra", cantidad: "10", precio: "18500", comision: "150" });
    expect(r.activos).toHaveLength(1);
  });

  it("billetera: la cantidad es el monto, con TNA en % y el mismo id que el formulario", () => {
    const r = leer(["15/05/2026;deposito;Mercado Pago;;billetera;ARS;500000;;;;30;"]);
    if (!r.ok) throw new Error(r.error);
    const f = r.filas[0]!;
    expect(f.estado).toBe("lista");
    expect(f.activo).toMatchObject({ id: "billetera:mercado-pago", tna: 0.3, inicio: "2026-05-15", moneda: "ARS" });
    expect(f.monto).toBe("500000");
    expect(f.movimiento?.precio).toBe("1"); // el primer día vale 1
  });

  it("plazo fijo sin vencimiento: aviso, no error", () => {
    const r = leer(["01/06/2026;deposito;Galicia;;plazo fijo;ARS;1000000;;;;35;"]);
    if (!r.ok) throw new Error(r.error);
    expect(r.filas[0]!.estado).toBe("aviso");
    expect(r.filas[0]!.activo?.id).toBe("plazo_fijo:galicia-2026-06-01");
    expect(r.filas[0]!.motivos.join(" ")).toMatch(/vencimiento/);
  });

  it("marca los errores con su motivo y no arma el movimiento", () => {
    const r = leer([
      "31/02/2026;compra;;AAPL;cedear;ARS;10;100;;;;",
      "10/03/2026;compra;;AAPL;cedear;USD;10;100;;;;",
      "10/03/2026;compra;;AAPL;cedear;ARS;10;;;;;",
      "10/03/2026;regalo;;AAPL;cedear;ARS;10;100;;;;",
      "10/03/2026;compra;;AAPL;acciones raras;ARS;10;100;;;;",
      "10/03/2027;compra;;AAPL;cedear;ARS;10;100;;;;",
      "10/03/2026;compra;Mercado Pago;;billetera;ARS;100;;;;;",
    ]);
    if (!r.ok) throw new Error(r.error);
    expect(r.filas.map((f) => f.estado)).toEqual(Array(7).fill("error"));
    expect(r.filas.every((f) => f.movimiento === null && f.motivos.length > 0)).toBe(true);
    expect(r.filas[1]!.motivos[0]).toMatch(/pesos/);
    expect(r.activos).toHaveLength(0);
  });

  it("lo que ya está en la cartera se marca como repetido", () => {
    const cartera = {
      activos: [{ id: "cedear:AAPL", tipo: "cedear", nombre: "Apple", ticker: "AAPL", moneda: "ARS" } as Activo],
      movimientos: [{ id: "x", activoId: "cedear:AAPL", fecha: "2026-03-10", tipo: "compra", cantidad: "10", precio: "18500" } as Movimiento],
    };
    const r = leer(["10/03/2026;compra;;AAPL;cedear;ARS;10;18500;;;;", "11/03/2026;compra;;AAPL;cedear;ARS;5;18600;;;;"], cartera);
    if (!r.ok) throw new Error(r.error);
    expect(r.filas.map((f) => f.estado)).toEqual(["repetida", "lista"]);
    expect(r.activos).toHaveLength(0); // el activo ya existía: no se crea otro
  });

  it("ticker que no conocemos: aviso", () => {
    const r = leer(["10/03/2026;compra;;ZZZZ;cedear;ARS;10;100;;;;"]);
    if (!r.ok) throw new Error(r.error);
    expect(r.filas[0]!.estado).toBe("aviso");
  });

  it("acepta otros nombres de columnas y valores con tildes", () => {
    const r = interpretarPlanilla(leerCsv("Fecha,Operación,Símbolo,Tipo,Cantidad,Precio\n10/03/2026,Compra,GGAL,Acción,100,\"6.500,5\""), vacia, HOY, ids());
    if (!r.ok) throw new Error(r.error);
    expect(r.filas[0]).toMatchObject({ estado: "lista", cantidad: "100", precio: "6500.5" });
    expect(r.filas[0]!.activo?.id).toBe("accion:GGAL");
  });

  it("sin encabezado reconocible o sin columnas obligatorias: error claro", () => {
    expect(interpretarPlanilla([["hola", "chau"], ["1", "2"]], vacia, HOY, ids())).toMatchObject({ ok: false });
    const r = interpretarPlanilla([["fecha", "ticker", "precio"], ["10/03/2026", "AAPL", "1"]], vacia, HOY, ids());
    expect(r.ok ? "" : r.error).toMatch(/tipo_movimiento/);
  });
});

describe("planilla modelo", () => {
  it("se lee bien y sus filas de ejemplo no se importan", () => {
    const r = interpretarPlanilla(leerCsv(planillaModelo()), vacia, HOY, ids());
    if (!r.ok) throw new Error(r.error);
    expect(r.filas).toHaveLength(5);
    expect(r.filas.every((f) => f.estado === "ejemplo")).toBe(true);
    expect(r.activos).toHaveLength(0);
  });
});

describe("ida y vuelta: exportar y volver a importar", () => {
  it("el CSV que exporta la web se importa igual en una cartera vacía", () => {
    const activos: Activo[] = [
      { id: "cedear:AAPL", tipo: "cedear", nombre: "Apple", ticker: "AAPL", moneda: "ARS" },
      { id: "billetera:mercado-pago", tipo: "billetera", nombre: "Mercado Pago", moneda: "ARS", tna: 0.3, inicio: "2026-05-15" },
      { id: "cripto:BTC", tipo: "cripto", nombre: "Bitcoin", ticker: "BTC", moneda: "USD" },
    ];
    const movimientos: Movimiento[] = [
      { id: "a", activoId: "cedear:AAPL", fecha: "2026-03-10", tipo: "compra", cantidad: "10", precio: "18500.5", comision: "150" },
      { id: "b", activoId: "billetera:mercado-pago", fecha: "2026-05-15", tipo: "deposito", cantidad: "500000", precio: "1" },
      { id: "c", activoId: "cripto:BTC", fecha: "2026-06-20", tipo: "compra", cantidad: "0.005", precio: "65000" },
    ];
    const r = interpretarPlanilla(leerCsv(movimientosACsv({ version: 1, activos, movimientos })), vacia, HOY, ids());
    if (!r.ok) throw new Error(r.error);
    expect(r.filas.map((f) => f.estado)).toEqual(["lista", "lista", "lista"]);
    expect(r.activos.map((a) => a.id).sort()).toEqual(activos.map((a) => a.id).sort());
    expect(r.activos.find((a) => a.tipo === "billetera")).toMatchObject({ tna: 0.3, inicio: "2026-05-15" });
    expect(r.filas.map((f) => [f.movimiento?.cantidad, f.movimiento?.precio, f.movimiento?.comision])).toEqual([
      ["10", "18500.5", "150"],
      ["500000", "1", undefined],
      ["0.005", "65000", undefined],
    ]);
    // Y en la misma cartera, todo aparece como repetido.
    const otra = interpretarPlanilla(leerCsv(movimientosACsv({ version: 1, activos, movimientos })), { activos, movimientos }, HOY, ids());
    expect(otra.ok && otra.filas.every((f) => f.estado === "repetida")).toBe(true);
  });
});

describe("filasDeExcel", () => {
  it("pasa fechas y números de Excel a texto sin confundir decimales con miles", () => {
    const filas = filasDeExcel([
      ["fecha", "tipo_movimiento", "ticker", "tipo_activo", "cantidad", "precio"],
      [new Date(Date.UTC(2026, 5, 20)), "compra", "BTC", "cripto", 1.234, 65000],
      [null, null, null, null, null, null],
    ]);
    expect(filas).toEqual([
      ["fecha", "tipo_movimiento", "ticker", "tipo_activo", "cantidad", "precio"],
      ["2026-06-20", "compra", "BTC", "cripto", "1,234", "65000"],
    ]);
    const r = interpretarPlanilla(filas, vacia, HOY, ids());
    expect(r.ok && r.filas[0]!.cantidad).toBe("1.234");
  });
});
