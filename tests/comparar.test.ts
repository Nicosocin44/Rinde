import { describe, expect, it } from "vitest";
import { conPagosReinvertidos, desdeCero, diaExCupon, enMoneda, inicioComun, numerosDelPeriodo, type PuntoPrecio } from "@/lib/calculos/comparar";

const HOY = "2026-11-19";

describe("comparar activos", () => {
  it("pasa una serie a dólares con el MEP de cada día (o el último anterior) y vuelve a pesos", () => {
    const mep: PuntoPrecio[] = [
      ["2026-11-02", 1500],
      ["2026-11-04", 1600],
    ];
    const pesos: PuntoPrecio[] = [
      ["2026-11-01", 1000], // sin MEP previo: se saltea
      ["2026-11-03", 3000], // usa el MEP del 2 (1500)
      ["2026-11-04", 3200],
    ];
    expect(enMoneda(pesos, "ARS", "USD", mep)).toEqual([
      ["2026-11-03", 2],
      ["2026-11-04", 2],
    ]);
    expect(enMoneda([["2026-11-04", 2]], "USD", "ARS", mep)).toEqual([["2026-11-04", 3200]]);
    expect(enMoneda(pesos, "ARS", "ARS", mep)).toBe(pesos);
  });

  it("todos arrancan juntos: el rango pedido, salvo que un activo empiece a cotizar después", () => {
    const viejo: PuntoPrecio[] = [
      ["2020-01-02", 10],
      ["2026-11-18", 20],
    ];
    const nuevo: PuntoPrecio[] = [
      ["2025-06-02", 5],
      ["2026-11-18", 6],
    ];
    expect(inicioComun([viejo], "1A", HOY)).toBe("2025-11-18");
    expect(inicioComun([viejo, nuevo], "3A", HOY)).toBe("2025-06-02");
    expect(inicioComun([[]], "1A", HOY)).toBeNull();
  });

  it("cada línea arranca en 0 % y muestra la variación contra su primer precio del período", () => {
    const s: PuntoPrecio[] = [
      ["2026-10-01", 80],
      ["2026-10-02", 100],
      ["2026-10-03", 110],
      ["2026-10-06", 90],
    ];
    expect(desdeCero(s, "2026-10-02")).toEqual([
      ["2026-10-02", 0],
      ["2026-10-03", 0.1],
      ["2026-10-06", -0.1],
    ]);
    expect(desdeCero(s, "2026-10-06")).toEqual([]);
  });

  it("números del período: variación, máxima caída, volatilidad del último año y último precio", () => {
    // 40 ruedas que alternan +1 % y −1 %, en el último año.
    const s: PuntoPrecio[] = [];
    let p = 100;
    for (let i = 0; i < 40; i++) {
      s.push([`2026-09-${String((i % 28) + 1).padStart(2, "0")}`.replace("2026-09", i < 28 ? "2026-09" : "2026-10"), p]);
      p = p * (i % 2 === 0 ? 1.01 : 0.99);
    }
    s.sort((a, b) => a[0].localeCompare(b[0]));
    const n = numerosDelPeriodo(s, "2026-09-01", HOY);
    expect(n.ultimo).toBe(s.at(-1)![1]);
    expect(n.variacion).toBeCloseTo(s.at(-1)![1] / 100 - 1, 10);
    expect(n.maximaCaida).toBeLessThan(0);
    // Saltos de ±1 % todos los días: alrededor de 1 % diario × √252 ≈ 16 % anual.
    expect(n.volatilidad).toBeGreaterThan(0.14);
    expect(n.volatilidad).toBeLessThan(0.18);
    expect(numerosDelPeriodo([], "2026-01-01", HOY)).toEqual({ variacion: null, maximaCaida: null, volatilidad: null, ultimo: null });
  });

  it("el bono deja de cotizar con el pago el hábil anterior al día de pago", () => {
    expect(diaExCupon("2026-01-09")).toBe("2026-01-08"); // viernes: corta el jueves
    expect(diaExCupon("2026-11-16")).toBe("2026-11-13"); // lunes: corta el viernes
    expect(diaExCupon("2027-01-09")).toBe("2027-01-08"); // sábado: se paga el lunes 11, corta el viernes 8
  });

  it("bonos: el pago se reinvierte, así la caída del día de corte no cuenta como pérdida", () => {
    // Paga 10 el 9/1; el 8/1 el precio cae de 100 a 90 (exactamente lo pagado) y después sube a 99.
    const serie: PuntoPrecio[] = [
      ["2026-01-07", 100],
      ["2026-01-08", 90],
      ["2026-01-12", 99],
    ];
    const total = conPagosReinvertidos(serie, [{ fecha: "2026-01-09", monto: 10 }]);
    expect(total.map(([f]) => f)).toEqual(serie.map(([f]) => f));
    expect(total[0]![1]).toBeCloseTo(90, 9); // antes del corte, reescalado
    expect(total[1]![1]).toBeCloseTo(90, 9); // el corte no es una caída
    expect(total[2]![1]).toBe(99); // el precio de hoy es el real
    // Rendimiento total del período: +10 % (de 100 a 90 + 10 cobrados, reinvertidos y subiendo a 99).
    expect(total[2]![1] / total[0]![1] - 1).toBeCloseTo(0.1, 9);
  });

  it("bonos: pagos anteriores o posteriores a la serie, o en cero, no la cambian; dos pagos entre dos puntos semanales, sí", () => {
    const serie: PuntoPrecio[] = [
      ["2026-01-12", 60],
      ["2026-03-02", 66],
    ];
    expect(conPagosReinvertidos(serie, [{ fecha: "2025-07-09", monto: 8 }, { fecha: "2026-07-09", monto: 8 }, { fecha: "2026-02-09", monto: 0 }])).toEqual(serie);
    const dos = conPagosReinvertidos(serie, [{ fecha: "2026-02-02", monto: 6 }, { fecha: "2026-02-20", monto: 6.6 }]);
    expect(dos[1]![1]).toBe(66);
    // Cada pago se reinvierte al precio del primer punto sin él (66): 1 + 6/66 y 1 + 6,6/66.
    expect(dos[0]![1]).toBeCloseTo(60 / ((1 + 6 / 66) * (1 + 6.6 / 66)), 9);
    expect(conPagosReinvertidos([], [{ fecha: "2026-01-09", monto: 10 }])).toEqual([]);
  });
});
