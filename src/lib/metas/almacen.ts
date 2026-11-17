"use client";

import Dexie, { type Table } from "dexie";
import type { Meta } from "@/lib/calculos/metas";

/** Metas guardadas en el navegador (IndexedDB), como la cartera y las alertas. v2: en la cuenta del usuario. */
class BaseMetas extends Dexie {
  metas!: Table<Meta, string>;
  constructor() {
    super("rinde-metas");
    this.version(1).stores({ metas: "id, creada" });
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
