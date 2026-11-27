import { describe, expect, it } from "vitest";
import { balanzMovimientos, balanzTenencia, fechaDelNombre, formatoBalanz, notaTenencia, tenenciaImportadaHasta } from "@/lib/cartera/brokers/balanz";
import { detectarFormato, interpretarArchivos } from "@/lib/cartera/brokers";
import { COLUMNAS } from "@/lib/cartera/importar";

/**
 * Archivos de Balanz inventados, con el formato de los reales (noviembre de 2026): las celdas como las deja
 * `filasDeExcel` (fechas AAAA-MM-DD, números con coma decimal). Los montos no son de nadie.
 */

const MOVIMIENTOS = [
  ["Descripcion", "Ticker", "Tipo de Instrumento", "Concertacion", "Cantidad", "Precio", "Liquidacion", "Moneda", "Importe"],
  ["Boleto / 10000001 / COMPRA / 1 / NVDA / $", "NVDA", "Cedears", "2026-11-20", "1", "10000", "2026-11-21", "Pesos", "-10067"],
  ["Boleto / 10000002 / VENTA / 1 / BRKB / $", "BRKB", "Cedears", "2026-11-20", "-2", "20000", "2026-11-21", "Pesos", "39732"],
  ["Comprobante de Pago / 20000001", "", "", "2026-11-18", "0", "-1", "2026-11-18", "Pesos", "-50000"],
  ["Recibo de Cobro / 30000001", "", "", "2026-11-10", "0", "-1", "2026-11-10", "Dólares", "200"],
  ["Dividendo en efectivo / SPY", "SPY", "Cedears", "2026-11-02", "0", "-1", "2026-11-02", "Dólares C.V. 7000", "1,25"],
  ["Dividendo en efectivo / SPY", "SPY", "Cedears", "2026-11-02", "0", "-1", "2026-11-02", "Pesos", "-310,5"],
  ["Boleto / 10000003 / COMPRA / 1 / GOOGL / $", "GOOGL", "Cedears", "2026-09-15", "3", "8500,5", "2026-09-16", "Pesos", "-25672,21"],
  ["Boleto / 10000004 / COMPRA / 1 / AL30 / $", "AL30", "Bonos", "2026-09-15", "100", "84000", "2026-09-16", "Pesos", "-84100"],
  ["Boleto / 10000005 / COMPRA / 1 / YPFD / $", "YPFD", "Acciones", "2026-09-10", "2", "41000", "2026-09-11", "Pesos", "-82549,4"],
];

const TENENCIA = [
  ["Ticker", "Tipo de Instrumento", "Descripcion", "Nominales", "Garantías", "Precio", "Fecha", "Porcentaje de tenencia", "Precio promedio de compra", "Valor actual", "Valor inicial", "Rendimiento", "Variación (%)", "Porcentaje de rendimiento", "Días promedio de tenencia", "TNA", "Moneda"],
  ["NVDA", "Cedears", "CEDEAR NVIDIA CORPORATION", "12", "0", "11000", "17:00", "0,6", "9500,25", "132000", "114003", "17997", "+500.00 (4.76%)", "0,158", "30,4", "35.00%", "Pesos"],
  ["YPFD", "Acciones", "YPF S.A. ESCRIT. \"D\" 1 VOTO", "2", "0", "45000", "17:00", "0,4", "41000", "90000", "82000", "8000", "+1000.00 (2.27%)", "0,098", "77", "20.00%", "Pesos"],
  ["AL30", "Bonos", "BONAR 2030", "100", "0", "85000", "17:00", "0", "84000", "85000", "84000", "1000", "+0.00 (0.00%)", "0,01", "73", "5.00%", "Pesos"],
];

const NOMBRE_TENENCIA = "[MisInstrumentos][com1][cuo1][PRUEBA][20261125]_[223712hs].xlsx";
const vacia = { activos: [], movimientos: [] };
const hoy = "2026-11-27";
const ids = () => {
  let i = 0;
  return () => `id-${++i}`;
};

describe("formato de Balanz", () => {
  it("se reconoce por los títulos", () => {
    expect(formatoBalanz(MOVIMIENTOS)).toBe("movimientos");
    expect(formatoBalanz(TENENCIA)).toBe("tenencia");
    expect(formatoBalanz([COLUMNAS])).toBeNull();
    expect(detectarFormato(MOVIMIENTOS)).toBe("balanz-movimientos");
    expect(detectarFormato([COLUMNAS])).toBe("planilla");
  });

  it("la fecha de la tenencia sale del nombre del archivo", () => {
    expect(fechaDelNombre(NOMBRE_TENENCIA)).toBe("2026-11-25");
    expect(fechaDelNombre("movimientos (3).xlsx")).toBeNull();
    expect(tenenciaImportadaHasta([undefined, "otra cosa", notaTenencia("2026-11-25"), notaTenencia("2026-10-01")])).toBe("2026-11-25");
  });
});

describe("Movimientos de Balanz", () => {
  const r = balanzMovimientos(MOVIMIENTOS, null);

  it("compras y ventas de CEDEARs y acciones, con la comisión que sale del importe", () => {
    // [fecha, tipo_movimiento, activo, ticker, tipo_activo, moneda, cantidad, precio, comision, nota, tna, vencimiento]
    expect(r.filas[0]).toEqual(COLUMNAS);
    expect(r.filas[1]).toEqual(["2026-11-20", "compra", "", "NVDA", "cedear", "ARS", "1", "10000", "67", "Balanz · boleto 10000001", "", ""]);
    // La venta viene con cantidad negativa y el importe neto: 2 × 20.000 − 39.732 = 268 de comisión.
    expect(r.filas[2]).toEqual(["2026-11-20", "venta", "", "BRKB", "cedear", "ARS", "2", "20000", "268", "Balanz · boleto 10000002", "", ""]);
    // Decimales con coma, para que "8500,5" no se lea como miles.
    expect(r.filas[3]).toEqual(["2026-09-15", "compra", "", "GOOGL", "cedear", "ARS", "3", "8500,5", "170,71", "Balanz · boleto 10000003", "", ""]);
    expect(r.filas[4]![4]).toBe("accion");
    // Cada fila convertida sabe de qué fila del Excel salió.
    expect(r.origen).toEqual([2, 3, 8, 10]);
  });

  it("lo que no se suma queda omitido, con el motivo", () => {
    const motivo = (n: number) => r.omitidas.find((o) => o.n === n)?.motivo;
    expect(motivo(4)).toMatch(/salió de tu cuenta de Balanz/);
    expect(motivo(5)).toMatch(/entró a tu cuenta de Balanz/);
    expect(motivo(6)).toMatch(/Dividendo en dólares de SPY/);
    expect(motivo(7)).toMatch(/Débito en pesos del dividendo de SPY/);
    expect(motivo(9)).toMatch(/Todavía no sabemos leer Bonos de Balanz/);
    expect(r.omitidas).toHaveLength(5);
  });

  it("con una tenencia importada al 25/11, lo de hasta ese día ya está contado", () => {
    const conTenencia = balanzMovimientos(MOVIMIENTOS, "2026-11-25");
    expect(conTenencia.filas).toHaveLength(1);
    expect(conTenencia.omitidas.filter((o) => /Ya está contado en la tenencia/.test(o.motivo)).map((o) => o.n)).toEqual([2, 3, 6, 7, 8, 9, 10]);
  });
});

describe("Mis Instrumentos de Balanz", () => {
  it("una compra por instrumento, al precio promedio, con la fecha = tenencia − días promedio", () => {
    const r = balanzTenencia(TENENCIA, "2026-11-25");
    expect(r.filas[1]).toEqual(["2026-10-26", "compra", "CEDEAR NVIDIA CORPORATION", "NVDA", "cedear", "ARS", "12", "9500,25", "", "Tenencia de Balanz al 25/11/2026", "", ""]);
    expect(r.filas[2]!.slice(0, 8)).toEqual(["2026-09-09", "compra", 'YPF S.A. ESCRIT. "D" 1 VOTO', "YPFD", "accion", "ARS", "2", "41000"]);
    expect(r.omitidas).toEqual([{ n: 4, texto: "AL30", fecha: null, motivo: "Todavía no sabemos leer Bonos de Balanz: cargalo con la planilla." }]);
  });
});

describe("importar archivos de Balanz", () => {
  it("la tenencia y los movimientos juntos: la tenencia va primero y los movimientos ya contados se omiten", () => {
    const r = interpretarArchivos(
      [
        { nombre: "movimientos (3).xlsx", filas: MOVIMIENTOS },
        { nombre: NOMBRE_TENENCIA, filas: TENENCIA },
      ],
      vacia,
      hoy,
      ids(),
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.formatos.map((f) => f.formato)).toEqual(["balanz-movimientos", "balanz-tenencia"]);
    const tenencia = r.filas.filter((f) => f.archivo === NOMBRE_TENENCIA);
    expect(tenencia.map((f) => f.n)).toEqual([2, 3, 4]);
    // NVDA e YPFD se suman (lista, o aviso si no están en nuestra lista de activos); el bono queda omitido.
    expect(tenencia.slice(0, 2).every((f) => f.estado === "lista" || f.estado === "aviso")).toBe(true);
    expect(tenencia[2]!.estado).toBe("omitida");
    expect(tenencia.find((f) => f.n === 3)?.movimiento).toMatchObject({ fecha: "2026-09-09", tipo: "compra", cantidad: "2", precio: "41000", nota: "Tenencia de Balanz al 25/11/2026" });
    const movimientos = r.filas.filter((f) => f.archivo === "movimientos (3).xlsx");
    expect(movimientos.every((f) => f.estado === "omitida")).toBe(true);
    expect(r.activos.map((a) => a.ticker).sort()).toEqual(["NVDA", "YPFD"]);
  });

  it("los movimientos solos: compras, ventas y comisión, con el número de fila del Excel", () => {
    const r = interpretarArchivos([{ nombre: "movimientos.xlsx", filas: MOVIMIENTOS }], vacia, hoy, ids());
    if (!r.ok) throw new Error(r.error);
    const nvda = r.filas.find((f) => f.n === 2)!;
    expect(nvda.estado === "lista" || nvda.estado === "aviso").toBe(true);
    expect(nvda.movimiento).toMatchObject({ fecha: "2026-11-20", tipo: "compra", cantidad: "1", precio: "10000", comision: "67", nota: "Balanz · boleto 10000001" });
    const brkb = r.filas.find((f) => f.n === 3)!;
    expect(brkb.movimiento).toMatchObject({ tipo: "venta", cantidad: "2", comision: "268" });
    // BRKB se vende sin haberse comprado antes en la cartera ni en el archivo: se marca para revisar.
    expect(brkb.estado).toBe("aviso");
    expect(brkb.motivos.join(" ")).toMatch(/Vendés más BRKB de lo que hay en tu cartera/);
    expect(r.filas.map((f) => f.n)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("subir dos veces el mismo archivo marca todo como repetido", () => {
    const primera = interpretarArchivos([{ nombre: "movimientos.xlsx", filas: MOVIMIENTOS }], vacia, hoy, ids());
    if (!primera.ok) throw new Error(primera.error);
    const cartera = { activos: primera.activos, movimientos: primera.filas.filter((f) => f.movimiento).map((f) => f.movimiento!) };
    const segunda = interpretarArchivos([{ nombre: "movimientos.xlsx", filas: MOVIMIENTOS }], cartera, hoy, ids());
    if (!segunda.ok) throw new Error(segunda.error);
    expect(segunda.filas.filter((f) => f.estado !== "omitida").every((f) => f.estado === "repetida")).toBe(true);
  });

  it("con una tenencia ya importada, los movimientos de hasta ese día se omiten; y una tenencia avisa si el activo ya tiene movimientos", () => {
    const tenencia = interpretarArchivos([{ nombre: NOMBRE_TENENCIA, filas: TENENCIA }], vacia, hoy, ids());
    if (!tenencia.ok) throw new Error(tenencia.error);
    const cartera = { activos: tenencia.activos, movimientos: tenencia.filas.filter((f) => f.movimiento).map((f) => f.movimiento!) };

    const movimientos = interpretarArchivos([{ nombre: "movimientos.xlsx", filas: MOVIMIENTOS }], cartera, hoy, ids());
    if (!movimientos.ok) throw new Error(movimientos.error);
    expect(movimientos.filas.every((f) => f.estado === "omitida")).toBe(true);

    const otraVez = interpretarArchivos([{ nombre: NOMBRE_TENENCIA.replace("20261125", "20261127"), filas: TENENCIA }], cartera, hoy, ids());
    if (!otraVez.ok) throw new Error(otraVez.error);
    expect(otraVez.filas.find((f) => f.n === 2)?.motivos.join(" ")).toMatch(/Ya tenés movimientos de NVDA en tu cartera/);
  });
});
