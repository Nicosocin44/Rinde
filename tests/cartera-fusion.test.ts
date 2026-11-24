import { describe, expect, it } from "vitest";
import type { Activo, Movimiento } from "@/lib/calculos/cartera";
import { aSubir } from "@/lib/cartera/fusion";

const activo = (id: string, nombre = id): Activo => ({ id, tipo: "cedear", nombre, moneda: "ARS" });
const mov = (id: string, activoId: string): Movimiento => ({ id, activoId, fecha: "2026-11-20", tipo: "compra", cantidad: "10", precio: "1000" });

describe("aSubir (al iniciar sesión)", () => {
  it("con la cuenta vacía, sube todo lo del navegador", () => {
    const local = { activos: [activo("cedear:AAPL"), activo("cedear:KO")], movimientos: [mov("m1", "cedear:AAPL"), mov("m2", "cedear:KO")] };
    expect(aSubir(local, { activos: [], movimientos: [] })).toEqual(local);
  });

  it("no repite los movimientos que la cuenta ya tiene", () => {
    const local = { activos: [activo("cedear:AAPL")], movimientos: [mov("m1", "cedear:AAPL"), mov("m2", "cedear:AAPL")] };
    const cuenta = { activos: [activo("cedear:AAPL")], movimientos: [mov("m1", "cedear:AAPL")] };
    expect(aSubir(local, cuenta).movimientos.map((m) => m.id)).toEqual(["m2"]);
  });

  it("si el activo ya está en la cuenta, manda la cuenta (no se pisa)", () => {
    const local = { activos: [activo("cedear:AAPL", "Apple (navegador)")], movimientos: [mov("m2", "cedear:AAPL")] };
    const cuenta = { activos: [activo("cedear:AAPL", "Apple (cuenta)")], movimientos: [mov("m1", "cedear:AAPL")] };
    expect(aSubir(local, cuenta)).toEqual({ activos: [], movimientos: [mov("m2", "cedear:AAPL")] });
  });

  it("no sube activos sin movimientos nuevos", () => {
    const local = { activos: [activo("cedear:AAPL"), activo("cedear:KO")], movimientos: [mov("m1", "cedear:AAPL")] };
    const cuenta = { activos: [activo("cedear:AAPL")], movimientos: [mov("m1", "cedear:AAPL")] };
    expect(aSubir(local, cuenta)).toEqual({ activos: [], movimientos: [] });
  });
});
