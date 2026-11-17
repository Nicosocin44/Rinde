import { CARTERA_DEMO } from "@data/samples/cartera-demo";
import { hoyAR } from "@/lib/calculos/fechas";
import { tasaPorPeriodo, valorFuturo, valorReal } from "@/lib/calculos/interes-compuesto";
import { describir, evaluar, type Alerta } from "@/lib/alertas/evaluar";
import { analizarCartera, valorEn } from "@/lib/cartera/valuacion";
import { obtenerCotizaciones, obtenerMacro, obtenerPesos, obtenerRanking } from "@/lib/data";
import { cargarPreciosCartera } from "@/lib/data/servicios/cartera";
import { fotoMercado } from "@/lib/data/servicios/alertas";
import type { Cargado, EstadoDato, OpcionPesos, TipoOpcionPesos } from "@/lib/data/types";
import { ordenarProveedores } from "@/lib/rankings/dolar";

/**
 * Todo lo que necesita la historia de la home, calculado en el servidor con los mismos servicios y
 * fórmulas del resto del sitio. Cada bloque puede venir en null: la escena correspondiente lo dice.
 * Lo único de ejemplo es la cartera (rotulada); el resto son datos reales del día.
 */

export type Pieza = { id: string; nombre: string; tipo: string; proveedorId?: string; valorArs: number | null };
export type OpcionTasa = { id: string; nombre: string; tipo: TipoOpcionPesos; etiquetaTipo: string; tea: number; tna: number; plazoDias: number | null };
export type ProveedorPrecio = { id: string; nombre: string; compras: number; costoMil: number };
export type PuntoComparacion = { fecha: string; cartera: number; inflacion: number; dolar: number };
export type AlertaDemo = { id: string; texto: string; cumplida: boolean; actual: string | null };
export type MesMacizo = { mes: number; quietaReal: number; rindeNominal: number; rindeReal: number };
export type FuenteEstado = { id: string; nombre: string; url: string; usadaPara: string; estado: EstadoDato | "error"; asOf: string | null };

export type DatosHistoria = {
  piezas: Pieza[] | null;
  tasas: { opciones: OpcionTasa[]; asOf: string; estado: EstadoDato } | null;
  dolar: { proveedores: ProveedorPrecio[]; asOf: string; estado: EstadoDato } | null;
  cartera: { serie: PuntoComparacion[]; inicio: string; carteraTotal: number; vsInflacion: number; vsDolar: number } | null;
  alertas: AlertaDemo[] | null;
  macizo: { monto: number; tea: number; nombre: string; inflacion: number; informeRem: string; meses: MesMacizo[] } | null;
  fuentes: FuenteEstado[];
};

const ETIQUETA_TIPO: Record<TipoOpcionPesos, string> = {
  billetera: "Billetera",
  cuenta: "Cuenta remunerada",
  fci: "Fondo money market",
  plazo_fijo: "Plazo fijo a 30 días",
  caucion: "Caución",
  lecap: "Letra del Tesoro",
};

/** La mejor opción comparable de cada tipo, por TEA. Neutral: no lee nada de afiliados. */
function mejorPorTipo(opciones: OpcionPesos[]): OpcionTasa[] {
  const mejor = new Map<TipoOpcionPesos, OpcionPesos>();
  for (const o of opciones) {
    if (o.condicionEspecial) continue;
    if (o.tipo === "plazo_fijo" && o.plazoDias !== 30) continue;
    const actual = mejor.get(o.tipo);
    if (!actual || o.tea > actual.tea) mejor.set(o.tipo, o);
  }
  return [...mejor.values()]
    .sort((a, b) => b.tea - a.tea)
    .map((o) => ({ id: o.id, nombre: o.nombre, tipo: o.tipo, etiquetaTipo: ETIQUETA_TIPO[o.tipo], tea: o.tea, tna: o.tna, plazoDias: o.plazoDias }));
}

function estadoDe<T>(c: Cargado<T>): { estado: EstadoDato | "error"; asOf: string | null } {
  return c.ok ? { estado: c.status, asOf: c.asOf } : { estado: "error", asOf: null };
}

export async function armarHistoria(): Promise<DatosHistoria> {
  const hoy = hoyAR();
  const ids = CARTERA_DEMO.activos.filter((a) => !["billetera", "plazo_fijo", "fci", "efectivo_usd"].includes(a.tipo)).map((a) => a.id);
  const [cotizaciones, pesos, ranking, macro, precios, foto] = await Promise.all([
    obtenerCotizaciones(),
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
  const tasas = pesos.ok ? { opciones: mejorPorTipo(pesos.data.opciones), asOf: pesos.asOf, estado: pesos.status } : null;

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

  // 6 · Macizo o hueco: $ 1.000.000 quieto contra puesto en la mejor tasa sin plazo, 12 meses, con la inflación del REM.
  const mejorLiquida = tasas?.opciones.filter((o) => o.plazoDias === null).sort((a, b) => b.tea - a.tea)[0] ?? null;
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

  // 7 · Confianza: cada fuente con su estado real en este momento.
  const fuentes: FuenteEstado[] = [
    { id: "dolarapi", nombre: "DolarAPI", url: "https://dolarapi.com", usadaPara: "Cotizaciones del dólar", ...estadoDe(cotizaciones) },
    { id: "criptoya", nombre: "CriptoYa", url: "https://criptoya.com", usadaPara: "Precio del dólar en cada app y exchange", ...estadoDe(ranking) },
    { id: "argentinadatos", nombre: "ArgentinaDatos", url: "https://argentinadatos.com", usadaPara: "Plazos fijos, billeteras, inflación y riesgo país", ...estadoDe(pesos) },
    { id: "cnv", nombre: "CNV", url: "https://www.argentina.gob.ar/cnv", usadaPara: "Cuotapartes de los fondos money market", ...estadoDe(pesos) },
    { id: "data912", nombre: "data912", url: "https://data912.com", usadaPara: "LECAPs, bonos, CEDEARs y acciones", ...estadoDe(pesos) },
    { id: "bcra", nombre: "BCRA", url: "https://www.bcra.gob.ar", usadaPara: "Expectativas de inflación (REM) y tasas de referencia", ...estadoDe(macro) },
  ];

  return { piezas: piezas.length ? piezas : null, tasas, dolar, cartera, alertas, macizo, fuentes };
}
