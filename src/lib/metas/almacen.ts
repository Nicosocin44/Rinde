"use client";

import Dexie, { type Table } from "dexie";
import type { AjusteMeta, AporteMeta, Meta } from "@/lib/calculos/metas";
import { DOLARES_GUARDADOS, SIN_INVERTIR } from "./instrumentos";

/** Metas guardadas en el navegador (IndexedDB), como la cartera y las alertas. v2: en la cuenta del usuario. */
class BaseMetas extends Dexie {
  metas!: Table<Meta, string>;
  constructor() {
    super("rinde-metas");
    this.version(1).stores({ metas: "id, creada" });
    // v2: de "controles" (el total juntado en cada fecha, sin decir dónde) a movimientos por instrumento. Lo que
    // cambió entre un control y el siguiente fue plata puesta o sacada: pasa a ser un movimiento "sin invertir" (o "dólares guardados").
    this.version(2)
      .stores({ metas: "id, creada" })
      .upgrade((tx) =>
        tx
          .table("metas")
          .toCollection()
          .modify((m: Meta & { controles?: { fecha: string; saldo: number }[] }) => {
            const aportes: AporteMeta[] = [];
            let anterior = 0;
            (m.controles ?? []).forEach((c, i) => {
              const diferencia = c.saldo - anterior;
              if (diferencia !== 0) aportes.push({ id: `${m.id}-control-${i}`, fecha: c.fecha, monto: diferencia, instrumento: m.moneda === "USD" ? DOLARES_GUARDADOS : SIN_INVERTIR });
              anterior = c.saldo;
            });
            m.aportes = m.aportes ?? aportes;
            m.ajustes = m.ajustes ?? ([] as AjusteMeta[]);
            delete m.controles;
          }),
      );
  }
}

let base: BaseMetas | null = null;
const db = () => (base ??= new BaseMetas());
const AVISO = "rinde:metas";

export async function listarMetas(): Promise<Meta[]> {
  try {
    return (await db().metas.toArray()).sort((a, b) => a.creada.localeCompare(b.creada) || a.nombre.localeCompare(b.nombre, "es"));
  } catch {
    return [];
  }
}

export async function guardarMeta(m: Meta): Promise<void> {
  await db().metas.put(m);
  window.dispatchEvent(new Event(AVISO));
}

export async function borrarMeta(id: string): Promise<void> {
  await db().metas.delete(id);
  window.dispatchEvent(new Event(AVISO));
}

export function alCambiarMetas(fn: () => void): () => void {
  window.addEventListener(AVISO, fn);
  return () => window.removeEventListener(AVISO, fn);
}
