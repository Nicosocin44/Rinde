import { describe, expect, it } from "vitest";
import { armarMes, eventosDeLaSemana, filtrarDia, lunesDelMes, mesInicial, mesPermitido, pasaFiltro, sumarMesesISO, type DiaMes } from "@/lib/calendario/mes";
import { armarSemana, type EventoCalendario } from "@/lib/calendario/semana";

const ev = (id: string, fecha: string, tipo: EventoCalendario["tipo"], pais: EventoCalendario["pais"]): EventoCalendario => ({ id, fecha, tipo, pais, etiqueta: id, detalle: id });

describe("calendario · mes", () => {
  it("las semanas que cubren el mes: desde la que tiene su primer día hábil hasta la del último", () => {
    // Noviembre de 2026 arranca un domingo: la semana del 26/10 no tiene días hábiles de noviembre.
    expect(lunesDelMes("2026-11")).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
    // Agosto de 2026 arranca un sábado y termina un lunes.
    expect(lunesDelMes("2026-08")).toEqual(["2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"]);
    // Enero de 2027 arranca un viernes: la primera semana empieza el lunes 28 de diciembre.
    expect(lunesDelMes("2027-01")).toEqual(["2026-12-28", "2027-01-04", "2027-01-11", "2027-01-18", "2027-01-25"]);
    // Febrero de 2027: cuatro semanas justas.
    expect(lunesDelMes("2027-02")).toEqual(["2027-02-01", "2027-02-08", "2027-02-15", "2027-02-22"]);
  });

  it("al abrir se ve el mes de hoy; el fin de semana, el del lunes que viene", () => {
    expect(mesInicial("2026-11-18")).toBe("2026-11");
    expect(mesInicial("2026-11-21")).toBe("2026-11"); // sábado: el lunes 23 sigue en noviembre
    expect(mesInicial("2026-10-30")).toBe("2026-10"); // viernes
    expect(mesInicial("2026-10-31")).toBe("2026-11"); // sábado: el lunes es 2 de noviembre
    expect(sumarMesesISO("2026-12", 1)).toBe("2027-01");
    expect(sumarMesesISO("2026-01", -1)).toBe("2025-12");
  });

  it("se puede ir un mes para atrás y dos para adelante, con un mes bien escrito", () => {
    const hoy = "2026-11-21";
    expect(["2026-10", "2026-11", "2026-12", "2027-01"].map((m) => mesPermitido(m, hoy))).toEqual([true, true, true, true]);
    expect(["2026-09", "2027-02", "2026-13", "2026-1", "noviembre", ""].map((m) => mesPermitido(m, hoy))).toEqual([false, false, false, false, false, false]);
  });

  it("arma el mes con las semanas y marca los días de otro mes", () => {
    const mes = armarMes("2026-11", [armarSemana("2026-11-30", [], {})]);
    expect(mes.semanas[0]!.map((d) => [d.fecha, d.enMes])).toEqual([
      ["2026-11-30", true],
      ["2026-12-01", false],
      ["2026-12-02", false],
      ["2026-12-03", false],
      ["2026-12-04", false],
    ]);
  });

  it("cuenta lo que pasa en la semana para el botón: sin feriados, con todas las empresas", () => {
    const semana = armarSemana("2026-11-16", [ev("feriado", "2026-11-16", "feriado", "AR"), ev("ipc", "2026-11-17", "dato", "AR")], {
      "2026-11-18": { empresas: [ev("NVDA", "2026-11-18", "empresa", "US"), ev("GGAL", "2026-11-18", "empresa", "AR")], masEmpresas: 3 },
    });
    expect(eventosDeLaSemana(semana)).toBe(6);
  });

  it("filtra por tipo y país; los feriados quedan con cualquier tipo", () => {
    const lecap = ev("lecap", "2026-11-27", "lecap", "AR");
    const feriado = ev("feriado", "2026-11-23", "feriado", "AR");
    const cpi = ev("cpi", "2026-11-13", "dato", "US");
    expect(pasaFiltro(lecap, "bonos", "todos")).toBe(true);
    expect(pasaFiltro(lecap, "dato", "todos")).toBe(false);
    expect(pasaFiltro(feriado, "dato", "todos")).toBe(true);
    expect(pasaFiltro(feriado, "todo", "US")).toBe(false);
    expect(pasaFiltro(cpi, "todo", "AR")).toBe(false);
    expect(pasaFiltro(cpi, "dato", "US")).toBe(true);

    const dia: DiaMes = { fecha: "2026-11-18", enMes: true, eventos: [cpi, ev("fed", "2026-11-18", "tasa", "US")], empresas: [ev("GGAL", "2026-11-18", "empresa", "AR"), ev("NVDA", "2026-11-18", "empresa", "US")], masEmpresas: 5 };
    expect(filtrarDia(dia, "todo", "todos").masEmpresas).toBe(5);
    expect(filtrarDia(dia, "tasa", "todos")).toMatchObject({ eventos: [{ id: "fed" }], empresas: [], masEmpresas: 0 });
    // Con país, las de más no se cuentan: no se sabe de dónde son.
    expect(filtrarDia(dia, "empresa", "AR")).toMatchObject({ eventos: [], empresas: [{ id: "GGAL" }], masEmpresas: 0 });
  });
});
