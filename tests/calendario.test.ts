import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { armarSemana, empresasDelDia, eventoEEUU, eventoFed, eventoIndec, horaArgentina, lunesDe, semanaInicial, semanaPermitida } from "@/lib/calendario/semana";
import { leerReunionesFomc } from "@/lib/data/adapters/fed";
import { leerCalendarioIndec } from "@/lib/data/adapters/indec";

describe("calendario · semanas", () => {
  it("el lunes de cualquier día de la semana", () => {
    expect(lunesDe("2026-11-18")).toBe("2026-11-16");
    expect(lunesDe("2026-11-16")).toBe("2026-11-16");
    expect(lunesDe("2026-11-22")).toBe("2026-11-16"); // domingo
  });
  it("el fin de semana muestra la semana que viene", () => {
    expect(semanaInicial("2026-11-18")).toBe("2026-11-16");
    expect(semanaInicial("2026-11-21")).toBe("2026-11-23");
    expect(semanaInicial("2026-11-22")).toBe("2026-11-23");
  });
  it("se puede ir una semana para atrás y cuatro para adelante, siempre desde un lunes", () => {
    expect(semanaPermitida("2026-11-09", "2026-11-18")).toBe(true);
    expect(semanaPermitida("2026-11-02", "2026-11-18")).toBe(false);
    expect(semanaPermitida("2026-12-14", "2026-11-18")).toBe(true);
    expect(semanaPermitida("2026-12-21", "2026-11-18")).toBe(false);
    expect(semanaPermitida("2026-11-17", "2026-11-18")).toBe(false);
  });
});

describe("calendario · horarios", () => {
  it("Nueva York → Argentina, con y sin horario de verano de EE.UU.", () => {
    expect(horaArgentina("2026-12-04", "08:30")).toBe("10:30"); // invierno: NY = UTC−5
    expect(horaArgentina("2026-07-03", "08:30")).toBe("09:30"); // verano: NY = UTC−4
    expect(horaArgentina("2026-12-09", "14:00")).toBe("16:00");
  });
});

describe("calendario · INDEC", () => {
  const html = readFileSync(join(__dirname, "fixtures", "indec-diciembre-2026.html"), "utf8");
  const informes = leerCalendarioIndec(html);
  it("lee los informes del calendario (con acentos y hora)", () => {
    expect(informes.length).toBeGreaterThan(10);
    expect(informes).toContainEqual({ fecha: "2026-12-15", hora: "16:00", titulo: "Índice de precios al consumidor (IPC). Cobertura nacional. Noviembre de 2026" });
  });
  it("solo quedan los que mueven el mercado, en pocas palabras", () => {
    const eventos = informes.map(eventoIndec).filter((e) => e !== null);
    const ipc = eventos.find((e) => e.etiqueta === "IPC")!;
    expect(ipc).toMatchObject({ fecha: "2026-12-15", hora: "16:00", pais: "AR", detalle: "Inflación de noviembre · INDEC" });
    expect(eventos.map((e) => e.etiqueta)).toContain("PBI");
    expect(eventos.every((e) => ["IPC", "EMAE", "PBI", "Balanza", "Desempleo", "Pobreza", "Salarios"].includes(e.etiqueta))).toBe(true);
    expect(eventoIndec({ fecha: "2026-12-04", hora: "16:00", titulo: "Accesos a internet. Tercer trimestre de 2026" })).toBeNull();
  });
});

describe("calendario · EE.UU.", () => {
  it("la Fed: el día de la decisión de cada reunión, también las que cruzan de mes", () => {
    const html = "<h4>2026 FOMC Meetings</h4><div>October 27-28</div><div>December 8-9*</div><h4>2027 FOMC Meetings</h4><div>Apr/May 30-1</div>";
    expect(leerReunionesFomc(html)).toEqual(["2026-10-28", "2026-12-09", "2027-05-01"]);
    expect(eventoFed("2026-12-09")).toMatchObject({ etiqueta: "Tasa Fed", hora: "16:00", pais: "US" });
  });
  it("solo los datos grandes, con lo esperado y lo anterior", () => {
    const e = eventoEEUU({ fecha: "2026-12-04", horaNY: "08:30", nombre: "Nonfarm Payrolls", anterior: "119K", esperado: "50K", real: null })!;
    expect(e).toMatchObject({ etiqueta: "Empleo", hora: "10:30", detalle: "Empleos creados en EE.UU. · esperado 50K · anterior 119K" });
    expect(eventoEEUU({ fecha: "2026-12-04", horaNY: "08:30", nombre: "Manufacturing Payrolls", anterior: null, esperado: null, real: null })).toBeNull();
  });
});

describe("calendario · empresas", () => {
  const fila = (simbolo: string, capitalizacion: number) => ({ simbolo, nombre: simbolo, momento: "despues" as const, capitalizacion });
  it("solo argentinas y con CEDEAR; primero las argentinas, después por tamaño; como mucho 4", () => {
    const r = empresasDelDia("2026-11-24", [fila("XYZ", 9e12), fila("AAPL", 3e12), fila("GGAL", 5e9), fila("NVDA", 4e12), fila("MSFT", 3.5e12), fila("KO", 2e11), fila("YPF", 1e10)], new Set(["AAPL", "NVDA", "MSFT", "KO"]));
    expect(r.empresas.map((e) => e.etiqueta)).toEqual(["YPF", "GGAL", "NVDA", "MSFT"]);
    expect(r.empresas[0]).toMatchObject({ ticker: "YPFD", href: "/activo/YPFD", pais: "AR" });
    expect(r.masEmpresas).toBe(2);
  });
});

describe("calendario · la semana", () => {
  it("cinco días hábiles, sin repetidos, el feriado primero y los datos por hora", () => {
    const s = armarSemana(
      "2026-11-23",
      [
        { id: "a", fecha: "2026-11-25", tipo: "dato", pais: "US", etiqueta: "PBI", detalle: "", hora: "10:30" },
        { id: "b", fecha: "2026-11-25", tipo: "dato", pais: "AR", etiqueta: "EMAE", detalle: "", hora: "16:00" },
        { id: "b", fecha: "2026-11-25", tipo: "dato", pais: "AR", etiqueta: "EMAE", detalle: "", hora: "16:00" },
        { id: "c", fecha: "2026-11-23", tipo: "feriado", pais: "AR", etiqueta: "Feriado", detalle: "" },
        { id: "d", fecha: "2026-11-30", tipo: "lecap", pais: "AR", etiqueta: "Vence S30N6", detalle: "" },
      ],
      {},
    );
    expect(s.dias.map((d) => d.fecha)).toEqual(["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27"]);
    expect(s.dias[0]!.eventos.map((e) => e.etiqueta)).toEqual(["Feriado"]);
    expect(s.dias[2]!.eventos.map((e) => e.etiqueta)).toEqual(["PBI", "EMAE"]);
    expect(s.dias.flatMap((d) => d.eventos).some((e) => e.etiqueta === "Vence S30N6")).toBe(false);
  });
});
