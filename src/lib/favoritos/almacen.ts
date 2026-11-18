"use client";

import Dexie, { type Table } from "dexie";

/** Un activo que la persona sigue. Se guarda en el navegador, como la cartera y las alertas. v2: en su cuenta. */
export type Favorito = { ticker: string; nombre: string; agregado: string };

class BaseFavoritos extends Dexie {
  favoritos!: Table<Favorito, string>;
  constructor() {
    super("rinde-favoritos");
    this.version(1).stores({ favoritos: "ticker, agregado" });
  }
}

let base: BaseFavoritos | null = null;
const db = () => (base ??= new BaseFavoritos());
const AVISO = "rinde:favoritos";

export async function listarFavoritos(): Promise<Favorito[]> {
  try {
    return (await db().favoritos.toArray()).sort((a, b) => a.agregado.localeCompare(b.agregado));
  } catch {
    return [];
  }
}

export async function esFavorito(ticker: string): Promise<boolean> {
  try {
    return (await db().favoritos.get(ticker)) !== undefined;
  } catch {
    return false;
  }
}

export async function seguir(f: Omit<Favorito, "agregado">): Promise<void> {
  await db().favoritos.put({ ...f, agregado: new Date().toISOString() });
  window.dispatchEvent(new Event(AVISO));
}

export async function dejarDeSeguir(ticker: string): Promise<void> {
  await db().favoritos.delete(ticker);
  window.dispatchEvent(new Event(AVISO));
}

export function alCambiarFavoritos(fn: () => void): () => void {
  window.addEventListener(AVISO, fn);
  return () => window.removeEventListener(AVISO, fn);
}
