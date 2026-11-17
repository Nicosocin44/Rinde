"use client";

import Dexie, { type Table } from "dexie";
import type { Activo, Movimiento } from "@/lib/calculos/cartera";

/**
 * Persistencia de la cartera detrás de una interfaz. v1: local-first (IndexedDB con Dexie), la plata del
 * usuario nunca sale de su navegador. v2: Supabase con la misma interfaz (ver docs/ROADMAP.md, fase 2).
 */
export type AjustesCartera = { id: "ajustes"; objetivoPesos?: number | null; demoDescartada?: boolean };

export type DatosCartera = { version: 1; activos: Activo[]; movimientos: Movimiento[]; ajustes?: AjustesCartera; exportado?: string };

export interface PortfolioRepository {
  cargar(): Promise<DatosCartera>;
  guardarActivo(a: Activo): Promise<void>;
  guardarMovimiento(m: Movimiento): Promise<void>;
  borrarMovimiento(id: string): Promise<void>;
  guardarAjustes(a: AjustesCartera): Promise<void>;
  reemplazar(datos: DatosCartera): Promise<void>;
  vaciar(): Promise<void>;
}

class BaseCartera extends Dexie {
  activos!: Table<Activo, string>;
  movimientos!: Table<Movimiento, string>;
  ajustes!: Table<AjustesCartera, string>;
  constructor() {
    super("rinde-cartera");
    this.version(1).stores({ activos: "id, tipo", movimientos: "id, activoId, fecha", ajustes: "id" });
  }
}

let base: BaseCartera | null = null;
const db = () => (base ??= new BaseCartera());

export const repositorioLocal: PortfolioRepository = {
  async cargar() {
    const [activos, movimientos, ajustes] = await Promise.all([db().activos.toArray(), db().movimientos.toArray(), db().ajustes.get("ajustes")]);
    return { version: 1, activos, movimientos, ajustes };
  },
  async guardarActivo(a) {
    await db().activos.put(a);
  },
  async guardarMovimiento(m) {
    await db().movimientos.put(m);
  },
  async borrarMovimiento(id) {
    const m = await db().movimientos.get(id);
    await db().movimientos.delete(id);
    // Si el activo quedó sin movimientos, se borra.
    if (m && (await db().movimientos.where("activoId").equals(m.activoId).count()) === 0) await db().activos.delete(m.activoId);
  },
  async guardarAjustes(a) {
    await db().ajustes.put(a);
  },
  async reemplazar(datos) {
    await db().transaction("rw", db().activos, db().movimientos, db().ajustes, async () => {
      await db().activos.clear();
      await db().movimientos.clear();
      await db().activos.bulkPut(datos.activos);
      await db().movimientos.bulkPut(datos.movimientos);
      if (datos.ajustes) await db().ajustes.put(datos.ajustes);
    });
  },
  async vaciar() {
    await Promise.all([db().activos.clear(), db().movimientos.clear()]);
  },
};

/** Valida un archivo importado. Devuelve un mensaje para humanos si algo no cierra. */
export function validarImportacion(json: unknown): { ok: true; datos: DatosCartera } | { ok: false; error: string } {
  const d = json as Partial<DatosCartera>;
  if (!d || typeof d !== "object" || !Array.isArray(d.activos) || !Array.isArray(d.movimientos)) return { ok: false, error: "El archivo no es una cartera exportada desde acá." };
  const ids = new Set(d.activos.map((a) => a?.id));
  for (const m of d.movimientos) {
    if (!m || typeof m.id !== "string" || !ids.has(m.activoId) || !/^\d{4}-\d{2}-\d{2}$/.test(m.fecha ?? "") || !Number.isFinite(Number(m.cantidad)) || !Number.isFinite(Number(m.precio))) {
      return { ok: false, error: "Hay un movimiento con datos incompletos o inválidos." };
    }
  }
  return { ok: true, datos: { version: 1, activos: d.activos as Activo[], movimientos: d.movimientos as Movimiento[], ajustes: d.ajustes } };
}

/** CSV de movimientos (para planillas). */
export function movimientosACsv(datos: DatosCartera): string {
  const activos = new Map(datos.activos.map((a) => [a.id, a]));
  const filas = [["fecha", "tipo_movimiento", "activo", "ticker", "tipo_activo", "moneda", "cantidad", "precio", "comision", "nota"]];
  for (const m of [...datos.movimientos].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const a = activos.get(m.activoId);
    filas.push([m.fecha, m.tipo, a?.nombre ?? "", a?.ticker ?? "", a?.tipo ?? "", a?.moneda ?? "", m.cantidad, m.precio, m.comision ?? "", m.nota ?? ""]);
  }
  return filas.map((f) => f.map((c) => (/[",;\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
}
