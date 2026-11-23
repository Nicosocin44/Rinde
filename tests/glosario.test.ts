import { describe, expect, it } from "vitest";
import { GLOSARIO, terminoDeEtiqueta, terminoPorId } from "@/lib/glosario";

describe("glosario", () => {
  it("cada término tiene un id único y sin espacios (es el ancla en /aprender)", () => {
    const ids = GLOSARIO.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[^\s#/]+$/);
  });

  it("ninguna etiqueta apunta a dos términos distintos", () => {
    const vistas = new Map<string, string>();
    for (const x of GLOSARIO)
      for (const e of [x.t, ...(x.etiquetas ?? [])]) {
        const clave = e.trim().toLowerCase();
        expect(vistas.get(clave) ?? x.id, `"${e}" está en ${vistas.get(clave)} y en ${x.id}`).toBe(x.id);
        vistas.set(clave, x.id);
      }
  });

  it("reconoce los textos tal como aparecen en las pantallas, sin importar mayúsculas", () => {
    expect(terminoDeEtiqueta("Volatilidad anual")?.id).toBe("volatilidad");
    expect(terminoDeEtiqueta("Máxima caída (1 año)")?.id).toBe("máxima-caída");
    expect(terminoDeEtiqueta("PER (precio / ganancia)")?.id).toBe("per");
    expect(terminoDeEtiqueta("Rentabilidad sobre el patrimonio (ROE)")?.id).toBe("roe");
    expect(terminoDeEtiqueta("VI")?.id).toBe("volatilidad-implícita");
    expect(terminoDeEtiqueta("  tir ")?.id).toBe("tir");
    expect(terminoDeEtiqueta("Precio")).toBeUndefined();
    expect(terminoPorId("ebitda")?.t).toBe("EBITDA");
  });
});
