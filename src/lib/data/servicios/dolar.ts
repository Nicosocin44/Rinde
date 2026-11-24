import { pais } from "@/config/countries/ar";
import { resolverProveedor } from "@data/ar/proveedores";
import { brecha, spread } from "@/lib/calculos";
import * as ad from "../adapters/argentinadatos";
import * as criptoya from "../adapters/criptoya";
import * as dolarapi from "../adapters/dolarapi";
import { conRespaldo } from "../cache";
import { estadoEnVivo, peorEstado } from "../freshness";
import { FUENTES, type ActivoDolar, type CotizacionDolar, type Excluido, type ProveedorDolar, type PuntoSerie, type RankingDolar, type TipoDolar } from "../types";
import { mediana } from "../validacion";
import type { z } from "zod";
import type { criptoyaExchangesSchema, dolarApiSchema } from "../schemas";

const CASAS: Record<string, { id: TipoDolar; nombre: string; descripcion: string; historico: string }> = {
  oficial: { id: "oficial", nombre: "Oficial", descripcion: "En el banco, para cualquier persona", historico: "oficial" },
  bolsa: { id: "mep", nombre: "MEP", descripcion: "Comprando y vendiendo un bono en un broker", historico: "bolsa" },
  contadoconliqui: { id: "ccl", nombre: "CCL", descripcion: "Contado con liquidación: dólares afuera del país", historico: "contadoconliqui" },
  blue: { id: "blue", nombre: "Blue", descripcion: "Mercado informal", historico: "blue" },
  cripto: { id: "cripto", nombre: "Cripto", descripcion: "Comprando USDT o USDC en un exchange", historico: "cripto" },
  tarjeta: { id: "tarjeta", nombre: "Tarjeta", descripcion: "Consumos en el exterior con tarjeta (con percepciones)", historico: "tarjeta" },
  mayorista: { id: "mayorista", nombre: "Mayorista", descripcion: "Entre bancos y empresas; referencia del BCRA", historico: "mayorista" },
};

export const ORDEN_DOLARES: TipoDolar[] = ["oficial", "mep", "ccl", "blue", "cripto", "tarjeta", "mayorista"];

type HistoricoDolar = Awaited<ReturnType<typeof ad.historicoDolar>>;

/** Variación contra el último cierre de un día anterior al dato actual. */
function variacionContraCierre(actual: number, historico: HistoricoDolar, fechaActual: string): number | null {
  const anterior = [...historico].reverse().find((p) => p.fecha < fechaActual.slice(0, 10));
  if (!anterior || anterior.venta <= 0) return null;
  return actual / anterior.venta - 1;
}

/** Normaliza DolarAPI + histórico de ArgentinaDatos en cotizaciones con variación, brecha y sparkline. */
export function normalizarCotizaciones(actuales: z.infer<typeof dolarApiSchema>, historicos: Map<string, HistoricoDolar>): CotizacionDolar[] {
  const oficial = actuales.find((c) => c.casa === "oficial");
  const salida: CotizacionDolar[] = [];
  for (const c of actuales) {
    const meta = CASAS[c.casa];
    if (!meta || !(c.venta > 0)) continue;
    const hist = historicos.get(meta.historico) ?? [];
    const fechaLocal = new Date(new Date(c.fechaActualizacion).getTime() + pais.utcOffset * 3_600_000).toISOString();
    const serie = hist.slice(-30).map((p) => p.venta);
    // El último punto de la sparkline es el valor actual.
    if (serie.length > 0 && hist[hist.length - 1]?.fecha === fechaLocal.slice(0, 10)) serie[serie.length - 1] = c.venta;
    else serie.push(c.venta);
    salida.push({
      id: meta.id,
      nombre: meta.nombre,
      descripcion: meta.descripcion,
      venta: c.venta,
      compra: c.compra && c.compra > 0 && c.casa !== "tarjeta" ? c.compra : null,
      variacion: variacionContraCierre(c.venta, hist, fechaLocal),
      brecha: oficial && meta.id !== "oficial" ? brecha(c.venta, oficial.venta).toNumber() : null,
      serie,
      asOf: c.fechaActualizacion,
    });
  }
  return salida.sort((a, b) => ORDEN_DOLARES.indexOf(a.id) - ORDEN_DOLARES.indexOf(b.id));
}

export async function cargarCotizaciones() {
  return conRespaldo<CotizacionDolar[]>("dolar:cotizaciones", [FUENTES.dolarapi, FUENTES.argentinadatos], async () => {
    const [actuales, ...hist] = await Promise.all([
      dolarapi.dolaresActuales(),
      ...Object.values(CASAS).map((c) => ad.historicoDolar(c.historico).catch(() => [] as HistoricoDolar)),
    ]);
    const historicos = new Map(Object.values(CASAS).map((c, i) => [c.historico, hist[i] ?? []]));
    const data = normalizarCotizaciones(actuales, historicos);
    if (data.length === 0) throw new Error("DolarAPI no devolvió cotizaciones válidas");
    const asOf = data.map((c) => c.asOf).sort().at(-1)!;
    // El dólar oficial y el mayorista no se mueven fuera del horario bancario; usamos el estado del MEP como referencia.
    const mep = data.find((c) => c.id === "mep");
    return { data, asOf, status: estadoEnVivo(mep?.asOf ?? asOf) };
  });
}

/** Serie histórica larga (para el gráfico de /dolar): MEP, oficial, blue y la brecha MEP/oficial. */
export async function cargarHistorico() {
  return conRespaldo<{ mep: PuntoSerie[]; oficial: PuntoSerie[]; blue: PuntoSerie[]; brecha: PuntoSerie[] }>(
    "dolar:historico",
    [FUENTES.argentinadatos],
    async () => {
      const [mep, oficial, blue] = await Promise.all([ad.historicoDolar("bolsa"), ad.historicoDolar("oficial"), ad.historicoDolar("blue")]);
      const aSerie = (h: HistoricoDolar) => h.filter((p) => p.venta > 0).map((p) => ({ fecha: p.fecha, valor: p.venta }));
      const oficialPorFecha = new Map(oficial.map((p) => [p.fecha, p.venta]));
      const brechaSerie = mep
        .filter((p) => oficialPorFecha.has(p.fecha) && oficialPorFecha.get(p.fecha)! > 0)
        .map((p) => ({ fecha: p.fecha, valor: p.venta / oficialPorFecha.get(p.fecha)! - 1 }));
      const ultima = mep.at(-1)?.fecha ?? new Date().toISOString();
      return { data: { mep: aSerie(mep), oficial: aSerie(oficial), blue: aSerie(blue), brecha: brechaSerie }, asOf: ultima, status: "close" };
    },
  );
}

// ───────────────────────── Ranking por proveedor ─────────────────────────

type Exchanges = z.infer<typeof criptoyaExchangesSchema>;

const TIPOS_BANCARIOS = new Set(["banco", "casa_de_cambio", "billetera"]);

/**
 * Proveedores que CriptoYa publica pero donde la gente no puede ir a comprar: no tienen web ni app propia.
 * Bytelime S.A.S. es una casa de cambio registrada en el BCRA, pero bytelime.com es un dominio a la venta y no tiene app
 * con su nombre (operaba las compras de dólares de otras apps, como Manteca). En un ranking para decidir dónde comprar,
 * una opción a la que no se puede ir confunde. (24/11/2026)
 */
const SIN_DONDE_COMPRAR = new Set(["bytelime"]);

/**
 * Normaliza las cotizaciones de CriptoYa en un ranking comparable:
 *  - excluye los que no tienen dónde comprar (SIN_DONDE_COMPRAR);
 *  - excluye cotizaciones viejas, puntas en cero, puntas cruzadas y precios atípicos (> 25 % de la mediana);
 *  - separa los P2P (precio de un aviso, depende de la contraparte) como "condiciones especiales".
 */
export function normalizarRanking(activo: ActivoDolar, cotizaciones: Exchanges, ahora: Date, extrasEspeciales: RankingDolar["especiales"] = []): { ranking: RankingDolar; excluidos: Excluido[] } {
  const excluidos: Excluido[] = [];
  const maxEdadSeg = activo === "USD" ? pais.frescura.proveedorMaxHoras * 3600 : pais.frescura.criptoMaxMin * 60;
  const ahoraSeg = ahora.getTime() / 1000;
  const candidatos: ProveedorDolar[] = [];
  for (const [id, c] of Object.entries(cotizaciones)) {
    const proveedor = resolverProveedor(id, activo === "USD" ? "banco" : "exchange");
    if (SIN_DONDE_COMPRAR.has(proveedor.id)) {
      excluidos.push({ id: proveedor.nombre, reason: "No tiene web ni app propia donde comprar" });
      continue;
    }
    if (!(c.totalAsk > 0) || !(c.totalBid > 0)) {
      excluidos.push({ id: proveedor.nombre, reason: "No publica precio de compra o de venta" });
      continue;
    }
    if (ahoraSeg - c.time > maxEdadSeg) {
      excluidos.push({ id: proveedor.nombre, reason: `Cotización desactualizada (${Math.round((ahoraSeg - c.time) / 3600)} h)` });
      continue;
    }
    if (c.totalBid > c.totalAsk * 1.001) {
      excluidos.push({ id: proveedor.nombre, reason: "Puntas cruzadas: paga más de lo que cobra" });
      continue;
    }
    const s = spread(c.totalAsk, c.totalBid).toNumber();
    if (s > pais.bandas.spreadDolarMax) {
      excluidos.push({ id: proveedor.nombre, reason: "Spread fuera de rango" });
      continue;
    }
    candidatos.push({
      id: proveedor.id,
      nombre: proveedor.nombre,
      tipo: TIPOS_BANCARIOS.has(proveedor.tipo) || proveedor.tipo === "p2p" || proveedor.tipo === "exchange" ? (proveedor.tipo as ProveedorDolar["tipo"]) : "exchange",
      compras: c.totalAsk,
      vendes: c.totalBid,
      pizarraCompra: c.ask,
      pizarraVenta: c.bid,
      spread: s,
      costoMil: c.totalAsk * 1000,
      recibisMil: c.totalBid * 1000,
      opera247: proveedor.opera247 ?? false,
      asOf: new Date(c.time * 1000).toISOString(),
    });
  }
  const med = mediana(candidatos.map((c) => c.compras));
  const comparables: ProveedorDolar[] = [];
  const especiales: RankingDolar["especiales"] = [...extrasEspeciales];
  const vistos = new Set<string>();
  for (const c of candidatos) {
    if (Math.abs(c.compras / med - 1) > pais.bandas.desvioDolar || Math.abs(c.vendes / med - 1) > pais.bandas.desvioDolar) {
      excluidos.push({ id: c.nombre, reason: "Precio atípico: se aleja más de 25 % de la mediana" });
      continue;
    }
    if (vistos.has(c.id)) {
      excluidos.push({ id: c.nombre, reason: "Duplicado" });
      continue;
    }
    vistos.add(c.id);
    if (c.tipo === "p2p") especiales.push({ ...c, condicion: "Precio del mejor aviso P2P: depende de la contraparte y del medio de pago" });
    else comparables.push(c);
  }
  const promedioCostoMil = comparables.length ? comparables.reduce((acc, p) => acc + p.costoMil, 0) / comparables.length : 0;
  return { ranking: { activo, proveedores: comparables, especiales, promedioCostoMil }, excluidos };
}

export async function cargarRanking(activo: ActivoDolar) {
  const fuentes = [FUENTES.criptoya, ...(activo === "USD" ? [FUENTES.dolarapi] : [])];
  return conRespaldo<RankingDolar>(`dolar:ranking:${activo}`, fuentes, async () => {
    const ahora = new Date();
    let extras: RankingDolar["especiales"] = [];
    let cotizaciones: Exchanges;
    if (activo === "USD") {
      const [bancos, dolares] = await Promise.all([criptoya.bancos(), dolarapi.dolaresActuales().catch(() => [])]);
      cotizaciones = bancos;
      const mep = dolares.find((d) => d.casa === "bolsa");
      if (mep && mep.compra) {
        extras = [
          {
            id: "mep-broker",
            nombre: "Dólar MEP en un broker",
            tipo: "exchange",
            compras: mep.venta,
            vendes: mep.compra,
            pizarraCompra: mep.venta,
            pizarraVenta: mep.compra,
            spread: spread(mep.venta, mep.compra).toNumber(),
            costoMil: mep.venta * 1000,
            recibisMil: mep.compra * 1000,
            opera247: false,
            asOf: mep.fechaActualizacion,
            condicion: "Necesitás una cuenta en un broker. Se compra un bono en pesos y se vende en dólares; la comisión del broker va aparte.",
          },
        ];
      }
    } else {
      cotizaciones = await criptoya.exchanges(activo === "USDT" ? "usdt" : "usdc", "ars", 1);
    }
    const { ranking, excluidos } = normalizarRanking(activo, cotizaciones, ahora, extras);
    if (ranking.proveedores.length === 0) throw new Error("Ningún proveedor pasó la validación");
    const asOf = ranking.proveedores.map((p) => p.asOf).sort().at(-1)!;
    const status = activo === "USD" ? peorEstado([estadoEnVivo(asOf)]) : estadoEnVivo(asOf, ahora, true);
    return { data: ranking, asOf, status, excluded: excluidos };
  });
}
