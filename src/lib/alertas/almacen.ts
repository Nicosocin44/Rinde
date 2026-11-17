"use client";

import Dexie, { type Table } from "dexie";
import type { Alerta } from "./evaluar";

/** Alertas guardadas en el navegador (IndexedDB). v2: en la cuenta del usuario, para evaluarlas en el servidor. */
class BaseAlertas extends Dexie {
  alertas!: Table<Alerta, string>;
  constructor() {
    super("rinde-alertas");
    this.version(1).stores({ alertas: "id, tipo" });
  }
}

let base: BaseAlertas | null = null;
const db = () => (base ??= new BaseAlertas());
const AVISO = "rinde:alertas";

export async function listarAlertas(): Promise<Alerta[]> {
  try {
    return (await db().alertas.toArray()).sort((a, b) => b.creada.localeCompare(a.creada));
  } catch {
    return [];
  }
}

export async function guardarAlerta(a: Alerta): Promise<void> {
  await db().alertas.put(a);
  window.dispatchEvent(new Event(AVISO));
}

export async function borrarAlerta(id: string): Promise<void> {
  await db().alertas.delete(id);
  window.dispatchEvent(new Event(AVISO));
}

export function alCambiarAlertas(fn: () => void): () => void {
  window.addEventListener(AVISO, fn);
  return () => window.removeEventListener(AVISO, fn);
}
