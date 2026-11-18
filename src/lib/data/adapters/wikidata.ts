import { z } from "zod";
import { traerJson } from "../http";

/**
 * Wikidata: el perfil de una empresa a partir de su ticker (país, sede, fundación, empleados, sitio web, industria,
 * bolsa y sus artículos de Wikipedia). Datos CC0: se pueden usar libremente. Sirve para cualquier CEDEAR o acción,
 * aunque no esté en nuestra lista curada (por ejemplo NBIS, Nebius Group).
 *
 * Verificado el 18/11/2026 contra query.wikidata.org: responde sin clave pero exige un User-Agent (si no, 403).
 * El ticker está como calificador (P249) de la cotización en bolsa (P414). Un mismo ticker puede figurar en varias
 * empresas ("C": Citigroup y tickers viejos de otras): se buscan solo cotizaciones vigentes (sin fecha de fin, no
 * desaprobadas) en NYSE, Nasdaq o la Bolsa de Comercio de Buenos Aires, y entre varias gana la más conocida
 * (más artículos en Wikipedia).
 */

const ENDPOINT = "https://query.wikidata.org/sparql";
const UNA_SEMANA = 7 * 24 * 3600;
const USER_AGENT = "Mozilla/5.0 (compatible; RindeFichas/1.0)";

/** NYSE, Nasdaq y Bolsa de Comercio de Buenos Aires. */
export const BOLSAS = { Q13677: "NYSE", Q82059: "Nasdaq", Q891560: "Bolsa de Buenos Aires" } as const;

const valor = z.object({ type: z.string(), value: z.string() });
export const sparqlSchema = z.object({ results: z.object({ bindings: z.array(z.record(z.string(), valor)) }) });
type Fila = z.infer<typeof sparqlSchema>["results"]["bindings"][number];

export type PerfilEmpresa = {
  id: string;
  nombre: string;
  descripcion: string | null;
  pais: string | null;
  sede: string | null;
  fundacion: number | null;
  empleados: { cantidad: number; fecha: string | null } | null;
  web: string | null;
  industrias: string[];
  bolsa: string | null;
  wikipediaEs: string | null;
  wikipediaEn: string | null;
};

function consulta(ticker: string): string {
  const bolsas = Object.keys(BOLSAS)
    .map((q) => `wd:${q}`)
    .join(" ");
  return `SELECT ?empresa ?empresaLabel ?empresaDescription ?bolsa ?n ?paisLabel ?sedeLabel ?fundacion ?empleados ?fechaEmpleados ?web ?industriaLabel ?es ?en WHERE {
  ?empresa p:P414 ?cot . ?cot pq:P249 "${ticker}" ; ps:P414 ?bolsa ; wikibase:rank ?rango .
  VALUES ?bolsa { ${bolsas} }
  FILTER(?rango != wikibase:DeprecatedRank)
  FILTER NOT EXISTS { ?cot pq:P582 ?fin }
  ?empresa wikibase:sitelinks ?n .
  OPTIONAL { ?empresa wdt:P17 ?pais }
  OPTIONAL { ?empresa wdt:P159 ?sede }
  OPTIONAL { ?empresa wdt:P571 ?fundacion }
  OPTIONAL { ?empresa p:P1128 ?e . ?e ps:P1128 ?empleados . OPTIONAL { ?e pq:P585 ?fechaEmpleados } }
  OPTIONAL { ?empresa wdt:P856 ?web }
  OPTIONAL { ?empresa wdt:P452 ?industria }
  OPTIONAL { ?es schema:about ?empresa ; schema:isPartOf <https://es.wikipedia.org/> }
  OPTIONAL { ?en schema:about ?empresa ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
} LIMIT 400`;
}

const primero = <T,>(xs: (T | undefined)[]): T | null => xs.find((x): x is T => x !== undefined) ?? null;

/**
 * Arma el perfil con las filas de la consulta (una fila por combinación de valores). Pura: se testea con una respuesta real.
 * null si no hay ninguna empresa.
 */
export function armarPerfil(filas: Fila[]): PerfilEmpresa | null {
  if (filas.length === 0) return null;
  // La más conocida: más artículos en Wikipedia.
  const porEmpresa = new Map<string, Fila[]>();
  for (const f of filas) {
    const id = f.empresa?.value;
    if (id) porEmpresa.set(id, [...(porEmpresa.get(id) ?? []), f]);
  }
  const [id, propias] = [...porEmpresa.entries()].sort((a, b) => Number(b[1][0]?.n?.value ?? 0) - Number(a[1][0]?.n?.value ?? 0))[0]!;
  const v = (k: string) => propias.map((f) => f[k]?.value);
  // El nombre que devuelve el servicio de etiquetas es el id ("Q12306354") si no hay etiqueta: se descarta.
  const nombre = primero(v("empresaLabel").filter((x) => x && !/^Q\d+$/.test(x)));
  if (!nombre) return null;
  const empleados = propias
    .filter((f) => f.empleados && Number.isFinite(Number(f.empleados.value)))
    .map((f) => ({ cantidad: Math.round(Number(f.empleados!.value)), fecha: f.fechaEmpleados?.value.slice(0, 10) ?? null }))
    .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""))[0];
  const anios = v("fundacion")
    .map((x) => (x ? Number(x.slice(0, 4)) : NaN))
    .filter((x) => Number.isFinite(x) && x > 1600);
  const bolsa = primero(v("bolsa").map((x) => (x ? BOLSAS[x.split("/").pop() as keyof typeof BOLSAS] : undefined)));
  return {
    id: id.split("/").pop()!,
    nombre,
    descripcion: primero(v("empresaDescription")),
    pais: primero(v("paisLabel")),
    sede: primero(v("sedeLabel").filter((x) => x && !/^Q\d+$/.test(x))),
    fundacion: anios.length ? Math.min(...anios) : null,
    empleados: empleados ?? null,
    web: primero(v("web")),
    industrias: [...new Set(v("industriaLabel").filter((x): x is string => !!x && !/^Q\d+$/.test(x)))].slice(0, 3),
    bolsa,
    wikipediaEs: primero(v("es")),
    wikipediaEn: primero(v("en")),
  };
}

export async function perfil(ticker: string): Promise<PerfilEmpresa | null> {
  // El ticker ya viene normalizado (letras, números y punto): no puede romper la consulta.
  if (!/^[A-Z0-9.]{1,10}$/.test(ticker)) return null;
  const r = await traerJson(`${ENDPOINT}?format=json&query=${encodeURIComponent(consulta(ticker))}`, sparqlSchema, {
    fuente: "wikidata",
    revalidate: UNA_SEMANA,
    timeoutMs: 10000,
    reintentos: 0,
    headers: { accept: "application/sparql-results+json", "user-agent": USER_AGENT },
  });
  return armarPerfil(r.results.bindings);
}

// ───────── Nombres en tanda (para las tablas) ─────────

/** De a cuántos tickers se consulta (la consulta va en la URL: así no se pasa de largo). */
const POR_TANDA = 80;

/**
 * El nombre de cada ticker, a partir de las filas de una consulta en tanda (columnas ?t, ?empresaLabel y ?n).
 * Si un ticker tiene varias empresas vigentes, gana la más conocida. Sin etiqueta (solo el id "Q…"), no se usa.
 */
export function armarNombres(filas: Fila[]): Record<string, string> {
  const mejor = new Map<string, { nombre: string; n: number }>();
  for (const f of filas) {
    const t = f.t?.value;
    const nombre = f.empresaLabel?.value;
    if (!t || !nombre || /^Q\d+$/.test(nombre)) continue;
    const n = Number(f.n?.value ?? 0);
    const actual = mejor.get(t);
    if (!actual || n > actual.n) mejor.set(t, { nombre, n });
  }
  return Object.fromEntries([...mejor.entries()].map(([t, v]) => [t, v.nombre]));
}

function consultaNombres(tickers: string[], bolsas: (keyof typeof BOLSAS)[]): string {
  return `SELECT ?t ?empresaLabel ?n WHERE {
  VALUES ?t { ${tickers.map((t) => `"${t}"`).join(" ")} }
  VALUES ?bolsa { ${bolsas.map((b) => `wd:${b}`).join(" ")} }
  ?empresa p:P414 ?cot . ?cot pq:P249 ?t ; ps:P414 ?bolsa ; wikibase:rank ?rango .
  FILTER(?rango != wikibase:DeprecatedRank)
  FILTER NOT EXISTS { ?cot pq:P582 ?fin }
  ?empresa wikibase:sitelinks ?n .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}`;
}

/**
 * Nombres de muchos tickers de una vez (por ejemplo, los CEDEARs que no están en nuestra lista curada).
 * Tandas de 80, cacheadas una semana. Si una tanda falla, sus tickers quedan sin nombre (se muestra el ticker).
 */
export async function nombres(tickers: string[], bolsas: (keyof typeof BOLSAS)[]): Promise<Record<string, string>> {
  const validos = [...new Set(tickers.filter((t) => /^[A-Z0-9.]{1,10}$/.test(t)))].sort();
  const tandas: string[][] = [];
  for (let i = 0; i < validos.length; i += POR_TANDA) tandas.push(validos.slice(i, i + POR_TANDA));
  const resultados = await Promise.allSettled(
    tandas.map((t) =>
      traerJson(`${ENDPOINT}?format=json&query=${encodeURIComponent(consultaNombres(t, bolsas))}`, sparqlSchema, {
        fuente: "wikidata",
        revalidate: UNA_SEMANA,
        timeoutMs: 8000,
        reintentos: 0,
        headers: { accept: "application/sparql-results+json", "user-agent": USER_AGENT },
      }),
    ),
  );
  return Object.assign({}, ...resultados.map((r) => (r.status === "fulfilled" ? armarNombres(r.value.results.bindings) : {})));
}
