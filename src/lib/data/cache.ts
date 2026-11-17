import type { Cargado, Envelope, Fuente } from "./types";

/**
 * Último dato válido por clave, en memoria del proceso. Es la red de seguridad:
 * si una fuente falla, devolvemos lo último que funcionó, marcado como "stale" y con su hora.
 * (La caché principal es la Data Cache de Next, vía `fetch` con `revalidate`.)
 */
const globalConCache = globalThis as typeof globalThis & { __ultimoValido?: Map<string, Envelope<unknown>> };
const ultimoValido = (globalConCache.__ultimoValido ??= new Map<string, Envelope<unknown>>());

/**
 * Ejecuta un servicio con fallback. Nunca lanza: devuelve `{ ok: false }` con un mensaje para humanos
 * si no hay dato nuevo ni dato viejo.
 */
export async function conRespaldo<T>(clave: string, fuentes: Fuente[], cargar: () => Promise<Omit<Envelope<T>, "fetchedAt" | "source">>): Promise<Cargado<T>> {
  try {
    const parcial = await cargar();
    const envelope: Envelope<T> = { ...parcial, source: fuentes, fetchedAt: new Date().toISOString() };
    ultimoValido.set(clave, envelope);
    return { ok: true, ...envelope };
  } catch (error) {
    const previo = ultimoValido.get(clave) as Envelope<T> | undefined;
    if (process.env.NODE_ENV !== "test") {
      console.warn(`[datos] ${clave}: ${error instanceof Error ? error.message : String(error)}${previo ? " → se muestra el último dato válido" : ""}`);
    }
    if (previo) return { ok: true, ...previo, status: "stale" };
    return { ok: false, error: mensajeHumano(error), source: fuentes };
  }
}

function mensajeHumano(error: unknown): string {
  const texto = error instanceof Error ? error.message : "";
  if (texto.includes("no respondió a tiempo")) return "La fuente no respondió a tiempo.";
  if (texto.includes("cambió de forma")) return "La fuente cambió el formato de sus datos.";
  if (texto.includes("respondió 4") || texto.includes("respondió 5")) return "La fuente está caída en este momento.";
  return "No pudimos conectarnos con la fuente.";
}

/** Solo para tests. */
export function vaciarRespaldo(): void {
  ultimoValido.clear();
}
