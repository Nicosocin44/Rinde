import { pais } from "@/config/countries/ar";
import { LECAPS, PATRON_LECAP, tipoPorTicker } from "@data/ar/lecaps";
import { resolverProveedor, type Proveedor } from "@data/ar/proveedores";
import {
  diasEntre,
  fechaLiquidacion,
  habilesEntre,
  hoyAR,
  rendimientoLecap,
  teaCapitalizacionDiaria,
  teaDesdeTna,
  temDesdeTea,
  valorFinalImplicito,
} from "@/lib/calculos";
import * as ad from "../adapters/argentinadatos";
import * as d912 from "../adapters/data912";
import { conRespaldo } from "../cache";
import { estadoPeriodico, mercadoAbierto, peorEstado } from "../freshness";
import { FUENTES, type Caucion, type CurvaLecaps, type Excluido, type FondoMM, type Lecap, type OpcionPesos, type PlazoFijoBanco } from "../types";
import { ajusteCuadratico, ajusteNelsonSiegel, deduplicar, enBanda } from "../validacion";
import { cargarFeriados } from "./feriados";
import type { z } from "zod";
import type { adCaucionesSchema, adCuentasSchema, adLetrasSchema, adPlazoFijoSchema, d912PanelSchema } from "../schemas";

const banda = pais.bandas.teaPesos;

function tasas(tna: number, dias: number | null) {
  const tea = dias === null ? teaCapitalizacionDiaria(tna) : teaDesdeTna(tna, dias);
  return { tna, tea: tea.toNumber(), tem: temDesdeTea(tea).toNumber() };
}

// ───────────────────────── Billeteras y cuentas remuneradas ─────────────────────────

const PATRON_CONDICION = /clientes|solo |plan sueldo|acumul|sumá|suma |personas jur|cartera consumo|operaciones/i;

/** "BICA CUENTA POSITIVA 3" → "BICA CUENTA POSITIVA"; "UALA PLUS 2" → "UALA PLUS"; "NARANJA X FRASCOS 7-13" → "NARANJA X FRASCOS". */
function nombreBase(fondo: string): string {
  return fondo.replace(/\s+\d+(-\d+)?$/, "").trim();
}

function tituloCuenta(fondo: string, proveedor: Proveedor): string {
  const base = nombreBase(fondo).toLowerCase();
  if (base.includes("frascos")) return `${proveedor.nombre} · Frascos`;
  if (base.includes("plus")) return `${proveedor.nombre} Plus`;
  if (base.includes("cuenta positiva")) return `${proveedor.nombre} · Cuenta Positiva`;
  if (base.includes("hit iol")) return `${proveedor.nombre} · Hit IOL`;
  return proveedor.nombre;
}

export function normalizarCuentas(filas: z.infer<typeof adCuentasSchema>, hoy: string): { opciones: OpcionPesos[]; excluidas: Excluido[] } {
  const excluidas: Excluido[] = [];
  const candidatas: OpcionPesos[] = [];
  for (const f of filas) {
    const proveedor = resolverProveedor(f.fondo, "billetera");
    const nombre = tituloCuenta(f.fondo, proveedor);
    if (!(f.tna > 0)) {
      excluidas.push({ id: nombre, reason: "Sin tasa informada para este tramo" });
      continue;
    }
    const edad = diasEntre(f.fecha.slice(0, 10), hoy);
    if (edad > pais.frescura.tasaMaxDias) {
      excluidas.push({ id: nombre, reason: `Tasa sin actualizar desde el ${f.fecha.slice(0, 10)}` });
      continue;
    }
    const esFrasco = /frascos/i.test(f.fondo);
    const plazoFrasco = esFrasco ? Number(f.fondo.match(/(\d+)(?:-\d+)?$/)?.[1] ?? 7) : null;
    const t = tasas(f.tna, plazoFrasco);
    if (!enBanda(t.tea, banda)) {
      excluidas.push({ id: nombre, reason: "Tasa fuera del rango plausible" });
      continue;
    }
    const condicion = (f.condicionesCorto || f.condiciones || "").trim() || undefined;
    const esTramo = /\bde \$|\bdesde \$|hasta \$/i.test(condicion ?? "");
    candidatas.push({
      id: `cuenta:${nombreBase(f.fondo).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      nombre,
      detalle: esFrasco ? `Plazo de 7 a 28 días` : esTramo ? condicion : undefined,
      proveedorId: proveedor.id,
      tipo: proveedor.tipo === "banco" ? "cuenta" : "billetera",
      ...t,
      plazoDias: plazoFrasco,
      liquidez: esFrasco ? "al_vencimiento" : "inmediata",
      tope: f.tope && f.tope > 0 ? f.tope : null,
      condicion: esTramo ? undefined : condicion,
      condicionEspecial: !esTramo && PATRON_CONDICION.test(condicion ?? ""),
      garantia: proveedor.tipo === "banco" ? "SEDESA" : "Sin garantía",
      riesgo: proveedor.tipo === "banco" ? "muy bajo" : "bajo",
      asOf: f.fecha,
      fuenteId: "argentinadatos",
    });
  }
  // Tramos y frascos del mismo producto: queda uno solo (el de mejor tasa).
  const { unicas, excluidas: dup } = deduplicar(candidatas, (o) => o.id, (a, b) => a.tna > b.tna, (o) => `${o.nombre} (${o.detalle ?? "otro tramo"})`);
  return { opciones: unicas, excluidas: [...excluidas, ...dup] };
}

// ───────────────────────── FCI money market ─────────────────────────

/** Administradoras conocidas → proveedor y app por la que se accede. */
const FAMILIAS: { patron: RegExp; proveedorId: string; accesoPor?: string }[] = [
  { patron: /mercado pago/i, proveedorId: "mercadopago", accesoPor: "Mercado Pago" },
  { patron: /ual[aá] fondos/i, proveedorId: "uala", accesoPor: "Ualá" },
  { patron: /cocos/i, proveedorId: "cocos", accesoPor: "Cocos" },
  { patron: /balanz/i, proveedorId: "balanz", accesoPor: "Balanz" },
  { patron: /galicia/i, proveedorId: "galicia" },
  { patron: /santander/i, proveedorId: "santander" },
  { patron: /icbc/i, proveedorId: "icbc" },
  { patron: /supervielle/i, proveedorId: "supervielle" },
  { patron: /macro/i, proveedorId: "macro" },
  { patron: /allaria/i, proveedorId: "allaria" },
  { patron: /adcap/i, proveedorId: "adcap" },
  { patron: /sbs/i, proveedorId: "sbs" },
];

type FondoComparaTasas = {
  nombre: string;
  administradora: string;
  tipoRenta: string;
  moneda: string;
  fecha: string;
  patrimonio: number | null;
  plazoLiquidacionDias: number | null;
  rendimientos: { valorCuotaparte: number | null; ultimos7Dias: number | null; diasUltimos7Dias: number | null };
};

export function normalizarFondos(fondos: FondoComparaTasas[], hoy: string): { fondos: FondoMM[]; opciones: OpcionPesos[]; excluidas: Excluido[] } {
  const excluidas: Excluido[] = [];
  const validos: (FondoMM & { liquidacion: number; administradora: string })[] = [];
  for (const f of fondos) {
    if (f.tipoRenta !== "Mercado de Dinero" || !f.moneda.startsWith("Peso")) continue;
    const r = f.rendimientos;
    const [fondo = f.nombre, clase = ""] = f.nombre.split(/\s+-\s+/);
    if (!r.valorCuotaparte || !r.ultimos7Dias || !r.diasUltimos7Dias || !f.patrimonio) {
      excluidas.push({ id: f.nombre, reason: "Sin cuotaparte o sin patrimonio informado" });
      continue;
    }
    if (diasEntre(f.fecha, hoy) > pais.frescura.fciMaxDias) {
      excluidas.push({ id: f.nombre, reason: `Cuotaparte sin actualizar desde el ${f.fecha}` });
      continue;
    }
    // ComparaTasas informa la variación de la cuotaparte en %; la pasamos a TNA y TEA con nuestra fórmula.
    const directo = r.ultimos7Dias / 100;
    const dias = r.diasUltimos7Dias;
    const tna = (directo * 365) / dias;
    const tea = Math.pow(1 + directo, 365 / dias) - 1;
    if (!enBanda(tea, banda)) {
      excluidas.push({ id: f.nombre, reason: "Rendimiento fuera del rango plausible" });
      continue;
    }
    const familia = FAMILIAS.find((x) => x.patron.test(f.administradora));
    const proveedorId = familia?.proveedorId ?? resolverProveedor(fondo.split(" ")[0] ?? fondo, "fondo").id;
    validos.push({
      id: `fci:${fondo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      fondo,
      clase: clase.replace(/^Clase\s+/i, ""),
      proveedorId,
      accesoPor: familia?.accesoPor,
      tna,
      tea,
      vcp: r.valorCuotaparte,
      fechaVcp: f.fecha,
      fechaVcpAnterior: new Date(Date.parse(f.fecha) - dias * 86_400_000).toISOString().slice(0, 10),
      dias,
      patrimonio: f.patrimonio,
      liquidacion: f.plazoLiquidacionDias ?? 0,
      administradora: f.administradora,
    });
  }
  // Una clase por fondo: la de acceso minorista (Clase A); si no hay, la de mayor patrimonio.
  const { unicas, excluidas: dup } = deduplicar(
    validos,
    (f) => f.id,
    (a, b) => (a.clase === "A") !== (b.clase === "A") ? a.clase === "A" : a.patrimonio > b.patrimonio,
    (f) => `${f.fondo} - Clase ${f.clase}`,
  );
  const opciones: OpcionPesos[] = unicas.map((f) => ({
    id: f.id,
    nombre: f.accesoPor && !f.fondo.toLowerCase().includes(f.accesoPor.toLowerCase()) ? `${f.fondo} (${f.accesoPor})` : f.fondo,
    detalle: `Fondo money market · Clase ${f.clase}`,
    proveedorId: f.proveedorId,
    tipo: "fci",
    tna: f.tna,
    tea: f.tea,
    tem: temDesdeTea(f.tea).toNumber(),
    plazoDias: null,
    liquidez: f.liquidacion === 0 ? "inmediata" : "24hs",
    tope: null,
    condicionEspecial: false,
    garantia: "Cartera del fondo",
    riesgo: "bajo",
    asOf: f.fechaVcp,
    fuenteId: "cnv",
  }));
  return { fondos: unicas.sort((a, b) => b.tea - a.tea), opciones, excluidas: [...excluidas, ...dup] };
}

// ───────────────────────── Plazo fijo ─────────────────────────

const PLAZOS_PF = [30, 60, 90, 180, 365] as const;

export function normalizarPlazosFijos(filas: z.infer<typeof adPlazoFijoSchema>): { bancos: PlazoFijoBanco[]; opciones: OpcionPesos[]; excluidas: Excluido[] } {
  const excluidas: Excluido[] = [];
  const bancos: PlazoFijoBanco[] = [];
  const opciones: OpcionPesos[] = [];
  const vistos = new Set<string>();
  for (const f of filas) {
    const proveedor = resolverProveedor(f.entidad, "banco");
    if (vistos.has(proveedor.id)) {
      excluidas.push({ id: proveedor.nombre, reason: "Duplicado" });
      continue;
    }
    vistos.add(proveedor.id);
    const tnaClientes = f.tnaClientes && f.tnaClientes > 0 ? f.tnaClientes : null;
    const tnaNoClientes = f.tnaNoClientes && f.tnaNoClientes > 0 ? f.tnaNoClientes : null;
    const porPlazo: PlazoFijoBanco["porPlazo"] = {};
    if (tnaClientes) porPlazo[30] = tnaClientes;
    for (const t of f.tasas ?? []) {
      if (!t.tna || t.tna <= 0 || t.plazoMinDias === null || t.plazoMinDias !== t.plazoMaxDias) continue;
      const plazo = PLAZOS_PF.find((p) => p === t.plazoMinDias);
      if (plazo && porPlazo[plazo] === undefined) porPlazo[plazo] = t.tna;
    }
    if (Object.keys(porPlazo).length === 0) {
      excluidas.push({ id: proveedor.nombre, reason: "Sin tasa informada" });
      continue;
    }
    bancos.push({ id: proveedor.id, banco: proveedor.nombre, proveedorId: proveedor.id, tnaClientes, tnaNoClientes, porPlazo, enlace: f.enlace ?? null });
    for (const [plazoTexto, tna] of Object.entries(porPlazo)) {
      const dias = Number(plazoTexto);
      const t = tasas(tna, dias);
      if (!enBanda(t.tea, banda)) {
        excluidas.push({ id: `${proveedor.nombre} ${dias} días`, reason: "Tasa fuera del rango plausible" });
        continue;
      }
      opciones.push({
        id: `pf:${proveedor.id}:${dias}`,
        nombre: proveedor.nombre,
        detalle: `Plazo fijo a ${dias} días`,
        proveedorId: proveedor.id,
        tipo: "plazo_fijo",
        ...t,
        plazoDias: dias,
        liquidez: "al_vencimiento",
        tope: null,
        condicion: dias === 30 && !tnaNoClientes ? "Tasa para clientes del banco" : undefined,
        condicionEspecial: false,
        garantia: "SEDESA",
        riesgo: "muy bajo",
        asOf: new Date().toISOString(),
        fuenteId: "argentinadatos",
      });
    }
  }
  return { bancos: bancos.sort((a, b) => (b.porPlazo[30] ?? 0) - (a.porPlazo[30] ?? 0)), opciones, excluidas };
}

// ───────────────────────── Caución ─────────────────────────

export function normalizarCauciones(filas: z.infer<typeof adCaucionesSchema>, hoy: string, feriados: ReadonlySet<string>): { cauciones: Caucion[]; vigente: boolean; ultimaRueda: string | null } {
  const cauciones = filas
    .filter((f) => f.tasaActual && f.tasaActual > 0)
    .map((f) => {
      const tna = (f.tasaActual ?? 0) / 100;
      const t = tasas(tna, f.plazo);
      return { plazoDias: f.plazo, tna, tea: t.tea, monto: f.montoContado ?? 0, fecha: f.fechaOperacion };
    })
    .filter((c) => enBanda(c.tea, banda))
    .sort((a, b) => a.plazoDias - b.plazoDias);
  const ultimaRueda = cauciones.map((c) => c.fecha).sort().at(-1) ?? null;
  const vigente = ultimaRueda !== null && habilesEntre(ultimaRueda, hoy, feriados) <= pais.frescura.caucionMaxHabiles;
  return { cauciones, vigente, ultimaRueda };
}

function opcionesCaucion(cauciones: Caucion[]): OpcionPesos[] {
  // Una opción por plazo representativo: la más cercana a 7 y a 30 días.
  const elegir = (objetivo: number) => cauciones.reduce<Caucion | null>((m, c) => (!m || Math.abs(c.plazoDias - objetivo) < Math.abs(m.plazoDias - objetivo) ? c : m), null);
  const elegidas = [...new Set([elegir(7), elegir(30)].filter((c): c is Caucion => c !== null))];
  return elegidas.map((c) => ({
    id: `caucion:${c.plazoDias}`,
    nombre: `Caución a ${c.plazoDias} días`,
    detalle: "Colocadora, en un broker",
    proveedorId: "byma",
    tipo: "caucion",
    tna: c.tna,
    tea: c.tea,
    tem: temDesdeTea(c.tea).toNumber(),
    plazoDias: c.plazoDias,
    liquidez: "al_vencimiento",
    tope: null,
    condicion: "Necesitás cuenta en un broker",
    condicionEspecial: false,
    garantia: "Garantía de mercado",
    riesgo: "muy bajo",
    asOf: c.fecha,
    fuenteId: "argentinadatos",
  }));
}

// ───────────────────────── LECAPs y BONCAPs ─────────────────────────

type Panel = z.infer<typeof d912PanelSchema>;

/**
 * Arma la curva de letras capitalizables con validación de sanidad:
 *  - vencidas (días ≤ 0) → excluidas;
 *  - ≤ 5 días hábiles al vencimiento → en la tabla con "Vence en X días", fuera de la curva;
 *  - sin operaciones hoy → fuera de la curva;
 *  - TEA fuera de banda → excluida;
 *  - a más de 3 desvíos del ajuste → "Atípica", fuera del ajuste.
 */
export function normalizarLecaps(
  precios: Panel,
  letrasAd: z.infer<typeof adLetrasSchema> | null,
  hoy: string,
  feriados: ReadonlySet<string>,
): { curva: CurvaLecaps; excluidas: Excluido[] } {
  const excluidas: Excluido[] = [];
  const liquidacion = fechaLiquidacion(hoy, "24hs", feriados);
  const estatica = new Map(LECAPS.map((l) => [l.ticker, l]));
  const deAd = new Map((letrasAd?.letras ?? []).map((l) => [l.ticker, l]));
  const vistas = new Set<string>();
  const letras: Lecap[] = [];

  for (const p of precios) {
    if (!PATRON_LECAP.test(p.symbol) || vistas.has(p.symbol)) continue;
    vistas.add(p.symbol);
    const conocida = estatica.get(p.symbol);
    const ad = deAd.get(p.symbol);
    const vencimiento = conocida?.vencimiento ?? ad?.fechaVencimiento;
    if (!vencimiento) {
      excluidas.push({ id: p.symbol, reason: "Sin fecha de vencimiento conocida" });
      continue;
    }
    const dias = diasEntre(liquidacion, vencimiento);
    if (dias <= 0) {
      excluidas.push({ id: p.symbol, reason: "Vencida" });
      continue;
    }
    const precio = p.c && p.c > 0 ? p.c : p.px_bid && p.px_ask ? (p.px_bid + p.px_ask) / 2 : null;
    if (!precio) {
      excluidas.push({ id: p.symbol, reason: "Sin precio" });
      continue;
    }
    // Valor final: de la tabla; si es una letra nueva, implícito en el precio y la TEA que publica ArgentinaDatos.
    let vf = conocida?.vf ?? null;
    let vfEstimado = conocida?.vfEstimado ?? true;
    if (vf === null && ad?.precioArs && ad.teaPorcentaje !== null && ad.diasAlVencimiento) {
      vf = valorFinalImplicito(ad.precioArs, ad.teaPorcentaje / 100, ad.diasAlVencimiento).toNumber();
      vfEstimado = true;
    }
    if (vf === null) {
      excluidas.push({ id: p.symbol, reason: "Sin valor final conocido" });
      continue;
    }
    const r = rendimientoLecap(vf, precio, dias);
    if (!r || !enBanda(r.tea.toNumber(), banda)) {
      excluidas.push({ id: p.symbol, reason: "Tasa fuera del rango plausible" });
      continue;
    }
    const habiles = habilesEntre(hoy, vencimiento, feriados);
    const sinOperar = !p.v || p.v <= 0;
    const porVencer = habiles <= pais.lecaps.minHabilesCurva;
    letras.push({
      ticker: p.symbol,
      tipo: conocida?.tipo ?? tipoPorTicker(p.symbol),
      vencimiento,
      dias,
      precio,
      vf,
      vfEstimado,
      directo: r.directo.toNumber(),
      tna: r.tna.toNumber(),
      tea: r.tea.toNumber(),
      tem: r.tem.toNumber(),
      variacion: p.pct_change !== null ? p.pct_change / 100 : null,
      volumen: p.v ?? 0,
      enCurva: !sinOperar && !porVencer,
      etiqueta: porVencer ? `Vence en ${habiles} ${habiles === 1 ? "día hábil" : "días hábiles"}` : sinOperar ? "Sin operaciones hoy" : undefined,
    });
  }

  // Curva ajustada con Nelson-Siegel (t en años). Con 3 puntos, cuadrática sobre ln(días) como respaldo.
  // Los puntos a más de 3 desvíos del ajuste se marcan "Atípica" y se reajusta sin ellos.
  const ajustar = (ls: Lecap[]) => {
    const ns = ajusteNelsonSiegel(ls.map((l) => ({ x: l.dias / 365, y: l.tea })));
    if (ns) return { f: (dias: number) => ns.f(dias / 365), desvio: ns.desvio };
    const q = ajusteCuadratico(ls.map((l) => ({ x: Math.log(l.dias), y: l.tea })));
    return q ? { f: (dias: number) => q.f(Math.log(dias)), desvio: q.desvio } : null;
  };
  let enCurva = letras.filter((l) => l.enCurva);
  let ajuste = ajustar(enCurva);
  if (ajuste && ajuste.desvio > 0 && enCurva.length >= 6) {
    for (const l of enCurva) {
      if (Math.abs(l.tea - ajuste.f(l.dias)) > pais.lecaps.desviosAtipico * Math.max(ajuste.desvio, 0.004)) {
        l.enCurva = false;
        l.etiqueta = "Atípica: se aleja de la curva";
      }
    }
    enCurva = letras.filter((l) => l.enCurva);
    ajuste = ajustar(enCurva) ?? ajuste;
  }
  const puntosAjuste: CurvaLecaps["ajuste"] = [];
  if (ajuste && enCurva.length >= 3) {
    const min = Math.min(...enCurva.map((l) => l.dias));
    const max = Math.max(...enCurva.map((l) => l.dias));
    for (let i = 0; i <= 48; i++) {
      const dias = min + ((max - min) * i) / 48;
      const tea = ajuste.f(dias);
      if (Number.isFinite(tea)) puntosAjuste.push({ dias, tea });
    }
  }
  return { curva: { letras: letras.sort((a, b) => a.dias - b.dias), ajuste: puntosAjuste, liquidacion }, excluidas };
}

function opcionesLecap(curva: CurvaLecaps): OpcionPesos[] {
  return curva.letras
    .filter((l) => l.enCurva)
    .map((l) => ({
      id: `lecap:${l.ticker}`,
      nombre: `${l.tipo === "LECAP" ? "LECAP" : "BONCAP"} ${l.ticker}`,
      detalle: `Vence el ${l.vencimiento.split("-").reverse().join("/")}`,
      proveedorId: "tesoro",
      tipo: "lecap",
      tna: l.tna,
      tea: l.tea,
      tem: l.tem,
      plazoDias: l.dias,
      liquidez: "mercado",
      tope: null,
      condicion: "Necesitás cuenta en un broker. Si la vendés antes, cobrás el precio de ese día.",
      condicionEspecial: false,
      garantia: "Tesoro nacional",
      riesgo: "bajo",
      asOf: new Date().toISOString(),
      fuenteId: "data912",
    }));
}

// ───────────────────────── Carga ─────────────────────────

export type DatosPesos = {
  opciones: OpcionPesos[];
  plazosFijos: PlazoFijoBanco[];
  fondos: FondoMM[];
  cauciones: { lista: Caucion[]; vigente: boolean; ultimaRueda: string | null };
  curva: CurvaLecaps;
  /** Estado por bloque, para mostrar la frescura de cada tabla. */
  estados: Record<"cuentas" | "fondos" | "plazosFijos" | "cauciones" | "lecaps", { ok: boolean; asOf: string | null }>;
};

export async function cargarPesos() {
  return conRespaldo<DatosPesos>("pesos", [FUENTES.argentinadatos, FUENTES.cnv, FUENTES.data912], async () => {
    const hoy = hoyAR();
    const feriados = await cargarFeriados();
    const [cuentasR, fondosR, pfR, caucionesR, notasR, bonosR, letrasR] = await Promise.allSettled([
      ad.cuentasRemuneradas(),
      cargarComparaTasas(),
      ad.plazosFijos(),
      ad.caucionesArs(),
      d912.panel("arg_notes"),
      d912.panel("arg_bonds"),
      ad.letras(),
    ]);
    const excluidas: Excluido[] = [];
    const ok = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === "fulfilled" ? r.value : null);

    const cuentas = ok(cuentasR) ? normalizarCuentas(ok(cuentasR)!, hoy) : null;
    const fondos = ok(fondosR) ? normalizarFondos(ok(fondosR)!, hoy) : null;
    const pf = ok(pfR) ? normalizarPlazosFijos(ok(pfR)!) : null;
    const cau = ok(caucionesR) ? normalizarCauciones(ok(caucionesR)!, hoy, feriados) : null;

    // Precios de letras: data912 (en vivo). Si falla, el precio de cierre de ArgentinaDatos.
    const letrasAd = ok(letrasR);
    let panelLetras: Panel | null = null;
    if (ok(notasR) || ok(bonosR)) panelLetras = [...(ok(notasR) ?? []), ...(ok(bonosR) ?? [])];
    else if (letrasAd) panelLetras = letrasAd.letras.map((l) => ({ symbol: l.ticker, px_bid: null, px_ask: null, v: 1, q_op: 1, c: l.precioArs, pct_change: null }));
    const lecaps = panelLetras ? normalizarLecaps(panelLetras, letrasAd, hoy, feriados) : null;

    for (const parte of [cuentas, fondos, pf, lecaps]) if (parte) excluidas.push(...parte.excluidas);
    if (!cuentas && !fondos && !pf && !lecaps) throw new Error("Ninguna fuente de tasas respondió");

    const opciones: OpcionPesos[] = [
      ...(cuentas?.opciones ?? []),
      ...(fondos?.opciones ?? []),
      ...(pf?.opciones ?? []),
      ...(cau?.vigente ? opcionesCaucion(cau.cauciones) : []),
      ...(lecaps ? opcionesLecap(lecaps.curva) : []),
    ];
    const ultima = (fechas: (string | undefined)[]) => fechas.filter(Boolean).sort().at(-1) ?? null;
    const estados: DatosPesos["estados"] = {
      cuentas: { ok: !!cuentas, asOf: ultima(cuentas?.opciones.map((o) => o.asOf) ?? []) },
      fondos: { ok: !!fondos, asOf: ultima(fondos?.fondos.map((f) => f.fechaVcp) ?? []) },
      plazosFijos: { ok: !!pf, asOf: pf ? new Date().toISOString() : null },
      cauciones: { ok: !!cau, asOf: cau?.ultimaRueda ?? null },
      lecaps: { ok: !!lecaps, asOf: lecaps ? new Date().toISOString() : null },
    };
    // data912 publica con demora; fuera de horario vale como cierre.
    const estadoLetras = !lecaps ? "stale" : mercadoAbierto() ? "delayed" : "close";
    const status = peorEstado([estadoLetras, estadoPeriodico(estados.cuentas.asOf ?? "1970-01-01", 3)]);
    return {
      data: {
        opciones,
        plazosFijos: pf?.bancos ?? [],
        fondos: fondos?.fondos ?? [],
        cauciones: { lista: cau?.cauciones ?? [], vigente: cau?.vigente ?? false, ultimaRueda: cau?.ultimaRueda ?? null },
        curva: lecaps?.curva ?? { letras: [], ajuste: [], liquidacion: hoy },
        estados,
      },
      asOf: new Date().toISOString(),
      status,
      excluded: excluidas,
    };
  });
}

async function cargarComparaTasas(): Promise<FondoComparaTasas[]> {
  return (await ad.fciComparaTasas()).fondos;
}
