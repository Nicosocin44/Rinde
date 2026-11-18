import { lanzamientoCubierto, tasaCaja } from "@/lib/calculos";
import type { FilaLanzamiento, FilaOpciones } from "@/lib/data/types";

/** Una tasa fuera de ±300 % sale de una punta suelta: se descarta. */
export const TNA_MAXIMA = 3;

/**
 * Lanzamiento cubierto de cada call con punta compradora: comprás la acción a `precioAccion` (punta vendedora) y
 * vendés el call a su punta compradora. `dias`: de la liquidación de hoy al cobro del ejercicio.
 */
export function armarLanzamientos(filas: FilaOpciones[], precioAccion: number, dias: number, comision = 0): FilaLanzamiento[] {
  const salida: FilaLanzamiento[] = [];
  for (const f of filas) {
    const prima = f.call?.compra;
    if (!f.call || !prima) continue;
    const l = lanzamientoCubierto(precioAccion, prima, f.base, dias, comision);
    if (!l || l.tna.abs().gt(TNA_MAXIMA)) continue;
    salida.push({
      simbolo: f.call.simbolo,
      base: f.base,
      prima,
      inversion: l.inversion.toNumber(),
      directo: l.directo.toNumber(),
      tna: l.tna.toNumber(),
      tea: l.tea.toNumber(),
      colchon: l.colchon.toNumber(),
      equilibrio: l.equilibrio.toNumber(),
      caidaEquilibrio: l.caidaEquilibrio.toNumber(),
    });
  }
  return salida;
}

export type FilaCaja = {
  id: string;
  baja: number;
  alta: number;
  /** Por acción: lo que ponés (colocar) o recibís (tomar) hoy. */
  hoy: number;
  alVencimiento: number;
  directo: number;
  tna: number;
  tea: number;
  /** Cuántas cajas se pueden armar con las cantidades que hay en las cuatro puntas. */
  contratos: number | null;
};

const minimo = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === "number" && x > 0);
  return v.length === xs.length ? Math.min(...v) : null;
};

/**
 * Una caja es un préstamo sintético: su tasa tiene que andar cerca de la de mercado. Fuera de la mitad o el doble de la
 * tasa de referencia (la caución al plazo más parecido) sale de puntas sueltas de bases lejanas, y se descarta.
 * Sin referencia, la banda es fija: 5 % a 150 % TNA.
 */
export function bandaCajas(referenciaTna: number | null): [number, number] {
  return referenciaTna && referenciaTna > 0 ? [referenciaTna / 2, referenciaTna * 2] : [0.05, 1.5];
}

/**
 * Todas las cajas que se pueden armar con las puntas de ahora, para colocar o para tomar pesos.
 * Colocar: de mayor a menor TNA. Tomar: de menor a mayor (es tu costo). Solo la métrica, nada más.
 */
export function armarCajas(filas: FilaOpciones[], operacion: "colocar" | "tomar", dias: number, comision = 0, referenciaTna: number | null = null): FilaCaja[] {
  const [minimaTna, maximaTna] = bandaCajas(referenciaTna);
  const completas = filas.filter((f) => f.call && f.put);
  const salida: FilaCaja[] = [];
  for (let i = 0; i < completas.length; i++) {
    for (let j = i + 1; j < completas.length; j++) {
      const b = completas[i]!;
      const a = completas[j]!;
      const puntas = {
        callBaja: { compra: b.call!.compra, venta: b.call!.venta },
        callAlta: { compra: a.call!.compra, venta: a.call!.venta },
        putBaja: { compra: b.put!.compra, venta: b.put!.venta },
        putAlta: { compra: a.put!.compra, venta: a.put!.venta },
      };
      const t = tasaCaja(b.base, a.base, puntas, operacion, dias, comision);
      if (!t || t.tna.lt(minimaTna) || t.tna.gt(maximaTna)) continue;
      // Las puntas que usás: para colocar comprás call bajo y put alto (ventas) y vendés call alto y put bajo (compras).
      const contratos =
        operacion === "colocar"
          ? minimo([b.call!.cantVenta, a.put!.cantVenta, a.call!.cantCompra, b.put!.cantCompra])
          : minimo([a.call!.cantVenta, b.put!.cantVenta, b.call!.cantCompra, a.put!.cantCompra]);
      salida.push({
        id: `${b.base}-${a.base}`,
        baja: b.base,
        alta: a.base,
        hoy: t.hoy.toNumber(),
        alVencimiento: t.alVencimiento.toNumber(),
        directo: t.directo.toNumber(),
        tna: t.tna.toNumber(),
        tea: t.tea.toNumber(),
        contratos,
      });
    }
  }
  return salida.sort((x, y) => (operacion === "colocar" ? y.tna - x.tna : x.tna - y.tna));
}
