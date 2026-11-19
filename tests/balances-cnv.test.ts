import { describe, expect, it } from "vitest";
import { construirIndice, dolarDelCierre, resumirCnv, type FormularioEntrada } from "@/lib/calculos";
import { leerFormulario, leerPresentaciones } from "@/lib/data/adapters/cnv";

const fila = (fecha: string, hora: string, descripcion: string, guid: string) =>
  `<tr><td> ${fecha} </td><td> ${hora} </td><td>${descripcion}</td><td>1</td><td><a href="https://aif2.cnv.gov.ar/presentations/publicview/${guid}"><i>add_circle_outline</i></a></td><td></td></tr>`;

describe("CNV · presentaciones de la página de la empresa", () => {
  const html = [
    fila("29 oct. 2026", "16:03", "NORMA CONTABLE: NIIF - TIPO BALANCE: CONSOLIDADO - PERIODICIDAD: 3 - FECHA CIERRE: 2026-09-30 - ESTADOS CONTABLES - NIIF", "706213b4-8609-4c6c-966a-f997f8765771"),
    fila("29 oct. 2026", "16:22", "NORMA CONTABLE: NIIF - TIPO BALANCE: CONSOLIDADO - PERIODICIDAD: TRIMESTRAL - FECHA CIERRE: 2026-09-30 - YPF CONSOLIDATED FS USD - ESTADOS CONTABLES - OTROS IDIOMAS", "039ac155-e763-4c6e-bc0c-042aee595b1c"),
    fila("6 mar. 2026", "15:01", "NORMA CONTABLE: NIIF - TIPO BALANCE: INDIVIDUAL - PERIODICIDAD: 1 - FECHA CIERRE: 2025-12-31 - ESTADOS CONTABLES - NIIF PARA BANCOS Y ENTIDADES FINANCIERAS", "11111111-2222-3333-4444-555555555555"),
    fila("6 mar. 2026", "14:10", "RELAC.: VINCULADA - NORMA CONTABLE: OTROS - ESTADOS CONTABLES - CONTROLADAS Y VINCULADAS", "66666666-7777-8888-9999-000000000000"),
  ].join("\n");

  it("lee fecha, período, cierre, consolidado o individual y el link al formulario; descarta traducciones y controladas", () => {
    expect(leerPresentaciones(html)).toEqual([
      { presentada: "2026-10-29", descripcion: expect.stringContaining("CONSOLIDADO"), guid: "706213b4-8609-4c6c-966a-f997f8765771", periodicidad: "trimestral", cierre: "2026-09-30", tipo: "consolidado", bancaria: false },
      { presentada: "2026-03-06", descripcion: expect.stringContaining("BANCOS"), guid: "11111111-2222-3333-4444-555555555555", periodicidad: "anual", cierre: "2025-12-31", tipo: "individual", bancaria: true },
    ]);
  });
});

describe("CNV · formulario de estados contables", () => {
  const pagina = (unidad: string) =>
    `<script>var presentationIdGlobal = '1';\n var presentation ='<modeloDatos><entidad clave="IdentificacionBalance"><propiedad id="PeriodoBalance">3</propiedad><propiedad id="FechaCierre">2026-09-30T03:00:00.000Z</propiedad><propiedad id="TipoBalance">Consolidado</propiedad><propiedad id="UnidadMedida">${unidad}</propiedad></entidad><entidad clave="Otros Datos Balance"><propiedad id="ODBCantidadAcciones">3933127930</propiedad></entidad><entidad clave="Estados Contables Cuentas" grid="1">${Array.from(
      { length: 11 },
      (_, k) => `<fila><propiedad id="Nro">${1000000 + k}</propiedad><propiedad id="Rubro">R${k}</propiedad><propiedad id="Monto"> ${k * 10}.00</propiedad></fila>`,
    ).join(
      "",
    )}<fila><propiedad id="Nro">1999999</propiedad><propiedad id="Rubro">TOTAL DEL ACTIVO</propiedad><propiedad id="Monto"> 51697491.00</propiedad></fila><fila><propiedad id="Nro">2210900</propiedad><propiedad id="Rubro">OTROS</propiedad><propiedad id="Monto"> -</propiedad></fila></entidad></modeloDatos>';\n</script>`;

  it("lee el período, la unidad, las acciones y cada rubro por su código", () => {
    const f = leerFormulario(pagina("Millones de $"))!;
    expect(f).toMatchObject({ cierre: "2026-09-30", periodicidad: "trimestral", tipo: "consolidado", moneda: "ARS", factor: 1e6, acciones: 3933127930 });
    expect(f.cuentas["1999999"]).toBe(51697491);
    expect(f.cuentas["2210900"]).toBeNull();
  });
  it("miles de pesos; y en dólares no la reconoce como pesos", () => {
    expect(leerFormulario(pagina("Miles de $"))!.factor).toBe(1e3);
    expect(leerFormulario(pagina("Millones de US$"))!.moneda).toBeNull();
  });
});

describe("CNV · resumen en dólares", () => {
  const dolar = [
    { fecha: "2025-12-31", valor: 1000 },
    { fecha: "2026-03-31", valor: 1100 },
    { fecha: "2026-06-30", valor: 1200 },
    { fecha: "2026-09-30", valor: 1300 },
  ];
  const form = (cierre: string, periodicidad: "anual" | "trimestral", cuentas: Record<string, number | null>): FormularioEntrada => ({ cierre, periodicidad, factor: 1e6, acciones: 1000, cuentas, presentada: cierre, guid: cierre });
  const formularios = [
    form("2025-12-31", "anual", { "3000100": 1000, "3049999": 100, "1999999": 1500 }),
    form("2026-03-31", "trimestral", { "3000100": 300, "3049999": 30, "1999999": 1600 }),
    form("2026-06-30", "trimestral", { "3000100": 700, "3049999": 80, "1999999": 1800 }),
    form("2026-09-30", "trimestral", { "3000100": 1200, "3049999": 150, "1999999": 2000 }),
  ];

  it("el dólar del cierre, o el del último día hábil anterior (hasta 10 días)", () => {
    expect(dolarDelCierre(dolar, "2026-10-03")).toBe(1300);
    expect(dolarDelCierre(dolar, "2026-10-20")).toBeNull();
  });

  it("ejercicio y trimestres en dólares del cierre; cada trimestre es la diferencia entre acumulados (calculado a mano)", () => {
    const r = resumirCnv({ empresa: "Prueba S.A.", bancaria: false, formularios, dolar, hoy: "2026-11-19" })!;
    expect(r).toMatchObject({ fuente: "cnv", moneda: "USD", financiera: false, desactualizado: false, ultimo: { fin: "2026-09-30" } });
    expect(r.anual.valores.ingresos).toEqual([1_000_000]); // 1.000 millones de pesos / 1.000
    const t = r.trimestral!;
    expect(t.periodos.map((p) => [p.fin, p.derivado])).toEqual([
      ["2026-03-31", false],
      ["2026-06-30", true],
      ["2026-09-30", true],
    ]);
    expect(t.valores.ingresos[0]).toBeCloseTo(300e6 / 1100, 4);
    expect(t.valores.ingresos[1]).toBeCloseTo((700e6 - 300e6) / 1200, 4);
    expect(t.valores.ingresos[2]).toBeCloseTo((1200e6 - 700e6) / 1300, 4);
    // El balance es la foto del cierre, no una diferencia.
    expect(r.balance!.valores.activos).toBeCloseTo(2000e6 / 1300, 4);
    // Con tres trimestres no alcanza para 12 meses: usa el ejercicio.
    expect(r.ultimos12.fuente).toBe("ejercicio");
  });

  it("con el IPC, el acumulado anterior se lleva a la moneda del cierre nuevo antes de restar", () => {
    const ipc = construirIndice(["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].map((m) => ({ fecha: `${m}-28`, valor: 1 })));
    const r = resumirCnv({ empresa: "Prueba S.A.", bancaria: false, formularios, dolar, ipc, hoy: "2026-11-19" })!;
    // Junio: 700 − 300 × 1,01³ (tres meses de 1 %), en millones de pesos de junio, al dólar de junio.
    expect(r.trimestral!.valores.ingresos[1]).toBeCloseTo((700e6 - 300e6 * 1.01 ** 3) / 1200, 2);
  });

  it("los bancos no tienen ingresos como una empresa: quedan como entidad financiera", () => {
    const r = resumirCnv({ empresa: "Banco S.A.", bancaria: true, formularios, dolar, hoy: "2026-11-19" })!;
    expect(r.financiera).toBe(true);
    expect(r.anual.valores.ingresos).toEqual([null]);
    expect(r.anual.valores.gananciaNeta).toEqual([100_000]);
  });

  it("sin ningún balance anual no hay resumen; un balance de hace más de 15 meses queda marcado como viejo", () => {
    expect(resumirCnv({ empresa: "X", bancaria: false, formularios: formularios.slice(1), dolar, hoy: "2026-11-19" })).toBeNull();
    expect(resumirCnv({ empresa: "X", bancaria: false, formularios: formularios.slice(0, 1), dolar, hoy: "2027-06-30" })!.desactualizado).toBe(true);
  });
});
