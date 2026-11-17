import { describe, expect, it } from "vitest";
import { cargarCotizaciones, cargarHistorico, cargarRanking } from "@/lib/data/servicios/dolar";
import { cargarPesos } from "@/lib/data/servicios/pesos";
import { cargarMacro } from "@/lib/data/servicios/macro";
import { cargarBonos, cargarCripto, cargarMercados } from "@/lib/data/servicios/mercados";
import { dondeRindeMas } from "@/lib/rankings/pesos";

const resumen = (x: unknown) => JSON.stringify(x, null, 0).slice(0, 900);

describe("fuentes reales", () => {
  it("dólar", async () => {
    const c = await cargarCotizaciones();
    expect(c.ok).toBe(true);
    if (c.ok) console.log("COTIZ", c.status, c.data.map((x) => `${x.id} ${x.venta} var=${x.variacion?.toFixed(4)} br=${x.brecha?.toFixed(4)} n=${x.serie.length}`).join(" | "));
    for (const a of ["USD", "USDT", "USDC"] as const) {
      const r = await cargarRanking(a);
      expect(r.ok).toBe(true);
      if (r.ok) console.log(a, r.status, r.data.proveedores.length, "comparables;", r.data.especiales.length, "especiales; excluidos:", r.excluded?.length, resumen(r.data.proveedores.slice(0, 3).map((p) => [p.nombre, p.compras, p.vendes])));
    }
    const h = await cargarHistorico();
    if (h.ok) console.log("HIST", h.data.mep.length, h.data.brecha.at(-1));
  });

  it("pesos", async () => {
    const p = await cargarPesos();
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    console.log("PESOS", p.status, "opciones", p.data.opciones.length, "excluidas", p.excluded?.length);
    console.log("EXCL", resumen(p.excluded));
    console.log("CURVA", p.data.curva.liquidacion, p.data.curva.letras.map((l) => `${l.ticker} d${l.dias} P${l.precio} tea${(l.tea * 100).toFixed(2)} ${l.enCurva ? "" : l.etiqueta}`).join(" | "));
    console.log("CAUCION", p.data.cauciones.vigente, p.data.cauciones.ultimaRueda);
    console.log("FONDOS", p.data.fondos.slice(0, 5).map((f) => `${f.fondo} ${(f.tna * 100).toFixed(2)}`).join(" | "));
    for (const plazo of [0, 30, 90] as const) {
      const r = dondeRindeMas(p.data.opciones, { monto: 1_000_000, plazo, soloLiquidez: false });
      console.log("RINDE", plazo, r.map((x) => `${x.opcion.nombre} ${(x.opcion.tea * 100).toFixed(2)}% +${Math.round(x.ganancia)}`).join(" | "));
    }
  });

  it("macro, bonos, mercados, cripto", async () => {
    const m = await cargarMacro();
    if (m.ok) console.log("MACRO", m.data.inflacionMensual.at(-1), m.data.inflacionInteranual, m.data.riesgoPais?.valor, m.data.riesgoPais?.variacion, resumen(m.data.rem));
    const b = await cargarBonos();
    if (b.ok) console.log("BONOS", b.data.liquidacion, b.data.bonos.map((x) => `${x.ticker} P${x.precioUsd} tir${(x.tir * 100).toFixed(2)} D${x.duration.toFixed(2)} par${x.paridad.toFixed(3)}`).join(" | "), "ONs", b.data.ons.length, "excl", resumen(b.excluded));
    const mk = await cargarMercados();
    if (mk.ok) console.log("CEDEARS", mk.data.cedears.length, resumen(mk.data.cedears.slice(0, 4)), "ACC", mk.data.acciones.length, mk.data.mepPromedio);
    const c = await cargarCripto();
    if (c.ok) console.log("CRIPTO", c.data.map((x) => `${x.simbolo} ${Math.round(x.precioArs)} usd ${x.precioUsd} n${x.exchanges.length}`).join(" | "));
  });
});
