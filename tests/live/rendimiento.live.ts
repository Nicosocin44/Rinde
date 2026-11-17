import { it } from "vitest";
import { cargarPesos } from "@/lib/data/servicios/pesos";
import { dondeRindeMas } from "@/lib/rankings/pesos";

it("tiempo de dondeRindeMas", async () => {
  const p = await cargarPesos();
  if (!p.ok) return;
  const t0 = performance.now();
  for (let i = 0; i < 10; i++) dondeRindeMas(p.data.opciones, { monto: 1_000_000 + i, plazo: 30, soloLiquidez: false });
  console.log("MEDIDA dondeRindeMas x10:", Math.round(performance.now() - t0), "ms;", p.data.opciones.length, "opciones");
});
