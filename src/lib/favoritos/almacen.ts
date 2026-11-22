"use client";

import Dexie, { type Table } from "dexie";

/**
 * Los activos que la persona sigue (punto 18): se marcan con "★ Seguir" en su ficha y se ven en Mercados, en
 * "★ Siguiendo". Se guardan en el navegador, como la cartera y las alertas. Es la misma base que se usó hasta el
 * 19/11/2026: quien había seguido algo, lo vuelve a ver.
 */
export type Favorito = {
  ticker: string;
  nombre: string;
  agregado: string;
  /** En qué moneda se sigue: la que la persona estaba mirando en la ficha al tocar "Seguir". Los de antes no la tienen: van en la del activo. */
  moneda?: "ARS" | "USD";
};

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

/** En el orden en que se siguieron. */
export async function listarFavoritos(): Promise<Favorito[]> {
  try {
    return (await db().favoritos.toArray()).sort((a, b) => a.agregado.localeCompare(b.agregado));
  } catch {
    return [];
  }
}

export async function seguir(f: Omit<Favorito, "agregado">): Promise<void> {
  await db().favoritos.put({ ticker: f.ticker, nombre: f.nombre, agregado: new Date().toISOString(), ...(f.moneda ? { moneda: f.moneda } : {}) });
  window.dispatchEvent(new Event(AVISO));
}

export async function dejarDeSeguir(ticker: string): Promise<void> {
  await db().favoritos.delete(ticker);
  window.dispatchEvent(new Event(AVISO));
}

/** Avisa cuando cambia la lista (en esta pestaña), para que el botón de la ficha y el de Mercados se actualicen solos. */
export function alCambiarFavoritos(fn: () => void): () => void {
  window.addEventListener(AVISO, fn);
  return () => window.removeEventListener(AVISO, fn);
}
