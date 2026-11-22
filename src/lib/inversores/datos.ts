import carteras from "@data/inversores/carteras.json";

/**
 * Carteras de grandes inversores (punto 28), de sus informes 13F a la SEC. El archivo lo genera
 * scripts/inversores.py (un workflow lo corre cada semana); acá solo se lee y se ordena.
 */

export type TipoMovimiento = "nueva" | "aumento" | "reduccion" | "salida";

export type Posicion = {
  cusip: string;
  /** Ticker en EE.UU. (el del 13F). null si OpenFIGI no lo encontró. */
  ticker: string | null;
  /** Acciones argentinas: su ticker en BYMA (ficha y logo). */
  byma: string | null;
  nombre: string;
  /** Dólares. */
  valor: number;
  /** Fracción de la cartera informada. */
  peso: number;
  argentino: boolean;
};

export type Movimiento = Posicion & {
  pesoAntes: number;
  pesoAhora: number;
  /** Cuántas acciones más (o menos) tiene que en el informe anterior; el peso también se mueve con el precio. */
  cambioAcciones?: number | null;
};

/** "sumó 12 % más acciones" / "vendió el 30 % de sus acciones". null si no aplica. */
export function textoAcciones(m: Pick<Movimiento, "cambioAcciones">): string | null {
  if (m.cambioAcciones == null) return null;
  const pct = Math.round(Math.abs(m.cambioAcciones) * 100);
  if (pct === 0) return null;
  return m.cambioAcciones > 0 ? `${pct >= 1000 ? "más de 10 veces" : `${pct} % más`} acciones` : `${pct} % menos acciones`;
}

export type Trimestre = {
  /** Cierre del trimestre (la cartera es a esa fecha). */
  periodo: string;
  /** Cuándo lo presentó a la SEC. */
  presentado: string;
  url: string;
  total: number;
  cantidad: number;
  argentina: number;
  posiciones: Posicion[];
  posicionesArgentinas: Posicion[];
  resto: { valor: number; cantidad: number };
  movimientos: Record<TipoMovimiento, Movimiento[]> | null;
};

export type Inversor = {
  slug: string;
  nombre: string;
  persona?: string;
  cik: number;
  grupo: "argentina" | "mundo";
  ciudad?: string | null;
  /** Se sumó solo, por estar entre los que más tienen en Argentina. */
  automatico?: boolean;
  trimestres: Trimestre[];
};

const datos = carteras as unknown as { actualizado: string; inversores: Inversor[] };

export const actualizado = datos.actualizado;

/** Los que tienen al menos un informe. */
export function inversores(): Inversor[] {
  return datos.inversores.filter((i) => i.trimestres.length > 0);
}

export function inversor(slug: string): Inversor | undefined {
  return inversores().find((i) => i.slug === slug);
}

export const ultimo = (i: Inversor): Trimestre => i.trimestres[0]!;

/** "2026-09-30" → "3T 2026". */
export function etiquetaTrimestre(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number);
  return `${Math.ceil((mes ?? 1) / 3)}T ${anio}`;
}

/** Iniciales para el monograma (sin fotos): "Berkshire Hathaway" → "BH". */
export function iniciales(i: Pick<Inversor, "nombre">): string {
  const palabras = i.nombre.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g, " ").split(/\s+/).filter((p) => p.length > 1 && !/^(de|del|the|and|of)$/i.test(p));
  return ((palabras[0]?.[0] ?? "") + (palabras[1]?.[0] ?? palabras[0]?.[1] ?? "")).toUpperCase();
}

/** Los que más tienen en Argentina según su último informe, de mayor a menor. */
export function rankingArgentina(): Inversor[] {
  return inversores()
    .filter((i) => ultimo(i).argentina > 0)
    .sort((a, b) => ultimo(b).argentina - ultimo(a).argentina);
}

/** Lo que suman en acciones argentinas los inversores con foco en Argentina (su último informe). */
export function totalArgentina(): { total: number; inversores: number; hasta: string } {
  const lista = inversores().filter((i) => i.grupo === "argentina");
  return {
    total: lista.reduce((s, i) => s + ultimo(i).argentina, 0),
    inversores: lista.length,
    hasta: lista.map((i) => ultimo(i).periodo).sort().at(-1) ?? "",
  };
}

export type MovimientoDestacado = { inversor: Inversor; tipo: TipoMovimiento; mov: Movimiento; presentado: string };

/**
 * Los movimientos más llamativos de los últimos informes: posiciones nuevas o vendidas del todo que pesan al menos el
 * 1 % de la cartera, y cualquier movimiento en una acción argentina. Los más recientes primero.
 */
export function ultimosMovimientos(cantidad = 10): MovimientoDestacado[] {
  const salida: MovimientoDestacado[] = [];
  for (const i of inversores()) {
    const t = ultimo(i);
    if (!t.movimientos) continue;
    for (const tipo of ["nueva", "salida", "aumento", "reduccion"] as const) {
      for (const mov of t.movimientos[tipo]) {
        const pesa = Math.max(mov.pesoAntes, mov.pesoAhora);
        const llamativo = mov.argentino ? pesa >= 0.005 : (tipo === "nueva" || tipo === "salida") && pesa >= 0.02;
        if (llamativo) salida.push({ inversor: i, tipo, mov, presentado: t.presentado });
      }
    }
  }
  return salida
    .sort((a, b) => b.presentado.localeCompare(a.presentado) || Number(b.mov.argentino) - Number(a.mov.argentino) || Math.max(b.mov.pesoAntes, b.mov.pesoAhora) - Math.max(a.mov.pesoAntes, a.mov.pesoAhora))
    .slice(0, cantidad);
}

/** Ticker con el que se busca el logo (las argentinas, con el de BYMA). */
export const tickerLogo = (p: Pick<Posicion, "ticker" | "byma">) => p.byma ?? p.ticker ?? undefined;

/**
 * A dónde lleva una fila: la ficha si es una acción argentina o un CEDEAR que cotiza hoy; si no, a ningún lado.
 * `cedears` son los tickers de los CEDEARs del panel de hoy.
 */
export function enlaceDe(p: Pick<Posicion, "ticker" | "byma">, cedears: ReadonlySet<string>): string | null {
  if (p.byma) return `/activo/${p.byma}`;
  if (!p.ticker) return null;
  const t = p.ticker.replace(/[./]/g, "");
  return cedears.has(t) ? `/activo/${t}` : null;
}
