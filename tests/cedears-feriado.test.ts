import { describe, expect, it } from "vitest";
import { normalizarCedears } from "@/lib/data/servicios/mercados";

/** Un feriado (23/11/2026), data912 trae todos los CEDEARs con volumen 0: la tabla no puede quedar vacía. */
describe("CEDEARs sin rueda", () => {
  const fila = (symbol: string, v: number) => ({ symbol, px_bid: null, px_ask: null, v, q_op: null, c: 1000, pct_change: 1 });
  it("con rueda, solo los que operaron hoy", () => {
    const r = normalizarCedears([fila("AAPL", 0), fila("MSFT", 5000)], [], new Map());
    expect(r.map((c) => c.ticker)).toEqual(["MSFT"]);
  });
  it("sin rueda, el último cierre de los CEDEARs conocidos (no los cientos que nunca operan)", () => {
    const r = normalizarCedears([fila("AAPL", 0), fila("MSFT", 0), fila("ZZZQ", 0)], [], new Map());
    expect(r.map((c) => c.ticker).sort()).toEqual(["AAPL", "MSFT"]);
  });
});
