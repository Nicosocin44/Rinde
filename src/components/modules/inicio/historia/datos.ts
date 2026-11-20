import { CARTERA_DEMO } from "@data/samples/cartera-demo";
import { hoyAR } from "@/lib/calculos/fechas";
import { tasaPorPeriodo, valorFuturo, valorReal } from "@/lib/calculos/interes-compuesto";
import { gananciaConTope } from "@/lib/calculos/tasas";
import { describir, evaluar, type Alerta } from "@/lib/alertas/evaluar";
import { analizarCartera, valorEn } from "@/lib/cartera/valuacion";
import { obtenerMacro, obtenerPesos, obtenerRanking } from "@/lib/data";
import { cargarPreciosCartera } from "@/lib/data/servicios/cartera";
import { fotoMercado } from "@/lib/data/servicios/alertas";
import type { EstadoDato, OpcionPesos, TipoOpcionPesos } from "@/lib/data/types";
import { ordenarProveedores } from "@/lib/rankings/dolar";
import { mejorDeCadaTipo, mejoresDelDia } from "@/lib/rankings/pesos";

/**
 * Todo lo que necesita la historia de la home, calculado en el servidor con los mismos servicios y
 * fórmulas del resto del sitio. Cada bloque puede venir en null: la escena correspondiente lo dice.
 * Lo único de ejemplo es la cartera (rotulada); el resto son datos reales del día.
 */

export type Pieza = { id: string; nombre: string; tipo: string; proveedorId?: string; valorArs: number | null };
/** `ganancia30`: lo que ganás en 30 días con $ 1.000.000 a esa TEA, respetando el tope (decimal.js). */
export type OpcionTasa = { id: string; nombre: string; tipo: TipoOpcionPesos; etiquetaTipo: string; tea: number; tna: number; plazoDias: number | null; tope: number | null; ganancia30: number };
export type ProveedorPrecio = { id: string; nombre: string; compras: number; costoMil: number };
export type PuntoComparacion = { fecha: string; cartera: number; inflacion: number; dolar: number };
export type AlertaDemo = { id: string; texto: string; cumplida: boolean; actual: string | null };
export type MesMacizo = { mes: number; quietaReal: number; rindeNominal: number; rindeReal: number };

export type DatosHistoria = {
  piezas: Pieza[] | null;
  tasas: { opciones: OpcionTasa[]; asOf: string; estado: EstadoDato } | null;
  dolar: { proveedores: ProveedorPrecio[]; asOf: string; estado: EstadoDato } | null;
  cartera: { serie: PuntoComparacion[]; inicio: string; carteraTotal: number; vsInflacion: number; vsDolar: number } | null;
  alertas: AlertaDemo[] | null;
  macizo: { monto: number; tea: number; nombre: string; inflacion: number; informeRem: string; meses: MesMacizo[] } | null;
};

const ETIQUETA_TIPO: Record<TipoOpcionPesos, string> = {
  billetera: "Billetera",
  cuenta: "Cuenta remunerada",
  fci: "Fondo money market",
  plazo_fijo: "Plazo fijo",
  caucion: "Caución",
  lecap: "Letra del Tesoro",
};

function aTasa(o: OpcionPesos): OpcionTasa {
  return {
    id: o.id,
    nombre: o.nombre,
    tipo: o.tipo,
    etiquetaTipo: ETIQUETA_TIPO[o.tipo],
    tea: o.tea,
    tna: o.tna,
    plazoDias: o.plazoDias,
    tope: o.tope,
    ganancia30: gananciaConTope(1_000_000, o.tea, 30, o.tope).toNumber(),
  };
}

export async function armarHistoria(): Promise<DatosHistoria> {
  const hoy = hoyAR();
  const ids = CARTERA_DEMO.activos.filter((a) => !["billetera", "plazo_fijo", "fci", "efectivo_usd"].includes(a.tipo)).map((a) => a.id);
  const [pesos, ranking, macro, precios, foto] = await Promise.all([
    obtenerPesos(),
    obtenerRanking("USD"),
    obtenerMacro(),
    cargarPreciosCartera(ids).catch(() => null),
    fotoMercado().catch(() => null),
  ]);

  // 1 · El problema: dónde está repartida la plata (cartera de ejemplo).
  const analisis = precios ? analizarCartera(CARTERA_DEMO.activos, CARTERA_DEMO.movimientos, precios, hoy) : null;
  const elegidos = ["billetera:mercadopago", "plazo_fijo:bna-1021", "efectivo_usd:ahorro", "cedear:AAPL", "lecap:T30J7", "cripto:BTC"];
  const piezas: Pieza[] = elegidos.flatMap((id) => {
    const activo = CARTERA_DEMO.activos.find((a) => a.id === id);
    if (!activo) return [];
    const pos = analisis?.posiciones.find((p) => p.activo.id === id);
    return [{ id, nombre: activo.nombre, tipo: activo.tipo, proveedorId: activo.proveedorId, valorArs: pos ? pos.valorArs.toNumber() : null }];
  });

  // 2 · La respuesta: la mejor de cada tipo, en la misma tasa (TEA).
  const tasas = pesos.ok ? { opciones: mejorDeCadaTipo(pesos.data.opciones).map(aTasa), asOf: pesos.asOf, estado: pesos.status } : null;

  // 3 · El dólar: precio final para comprar, de más barato a más caro.
  const dolar = ranking.ok
    ? {
        proveedores: ordenarProveedores(ranking.data.proveedores, "comprar")
          .slice(0, 9)
          .map((p) => ({ id: p.id, nombre: p.nombre, compras: p.compras, costoMil: p.costoMil })),
        asOf: ranking.asOf,
        estado: ranking.status,
      }
    : null;

  // 4 · Tu cartera contra la inflación y el dólar (índices base 100 desde el primer aporte).
  let cartera: DatosHistoria["cartera"] = null;
  if (analisis && precios && analisis.serie.length > 4 && analisis.inicio) {
    const base = analisis.serie[0]!;
    const mep0 = valorEn(precios.mep, base.fecha);
    let indiceIpc = 1;
    let mesIpc = base.fecha.slice(0, 7);
    const serie: PuntoComparacion[] = [];
    for (const p of analisis.serie) {
      // IPC acumulado de los meses cerrados entre el inicio y la fecha del punto.
      for (const [f, v] of precios.ipc) {
        const mes = f.slice(0, 7);
        if (mes > mesIpc && mes < p.fecha.slice(0, 7)) {
          indiceIpc *= 1 + v;
          mesIpc = mes;
        }
      }
      const mep = valorEn(precios.mep, p.fecha);
      serie.push({ fecha: p.fecha, cartera: 100 * (1 + p.twr), inflacion: 100 * indiceIpc, dolar: mep && mep0 ? (100 * mep) / mep0 : 100 });
    }
    const ultimo = serie.at(-1)!;
    cartera = {
      serie,
      inicio: analisis.inicio,
      carteraTotal: analisis.totalArs,
      vsInflacion: ultimo.cartera / ultimo.inflacion - 1,
      vsDolar: ultimo.cartera / ultimo.dolar - 1,
    };
  }

  // 5 · Alertas de ejemplo, evaluadas con el mercado de hoy.
  const mepHoy = foto?.dolares.mep;
  const umbral = mepHoy ? Math.round(mepHoy / 50) * 50 + 50 : 1650;
  const definidas: Alerta[] = [
    { id: "a1", tipo: "precio", dolar: "mep", condicion: "mayor", valor: umbral, creada: hoy, activa: true },
    { id: "a2", tipo: "tasa", condicion: "mayor", valor: 0.2, creada: hoy, activa: true },
    { id: "a3", tipo: "comparacion", creada: hoy, activa: true },
  ];
  const alertas = foto
    ? definidas.map((a) => {
        const r = evaluar(a, foto);
        return { id: a.id, texto: describir(a), cumplida: r.cumplida, actual: r.actual ?? null };
      })
    : null;

  // 6 · Macizo o hueco: $ 1.000.000 quieto contra puesto en la mejor tasa sin plazo (la misma regla que la
  // portada: liquidez inmediata y sin tope por debajo del monto), 12 meses, con la inflación del REM.
  const mejorLiquida = pesos.ok ? mejoresDelDia(pesos.data.opciones).liquida : null;
  const inflacion = macro.ok ? macro.data.rem?.proximos12m ?? null : null;
  const monto = 1_000_000;
  const macizo =
    mejorLiquida && inflacion !== null && macro.ok && macro.data.rem
      ? {
          monto,
          tea: mejorLiquida.tea,
          nombre: mejorLiquida.nombre,
          inflacion,
          informeRem: macro.data.rem.informe,
          meses: Array.from({ length: 13 }, (_, mes) => {
            const nominal = valorFuturo(monto, 0, tasaPorPeriodo(mejorLiquida.tea, 12), mes);
            return {
              mes,
              quietaReal: valorReal(monto, inflacion, mes / 12).toNumber(),
              rindeNominal: nominal.toNumber(),
              rindeReal: valorReal(nominal, inflacion, mes / 12).toNumber(),
            };
          }),
        }
      : null;

  return { piezas: piezas.length ? piezas : null, tasas, dolar, cartera, alertas, macizo };
}
