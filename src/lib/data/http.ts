import type { z } from "zod";

export class ErrorDeFuente extends Error {
  constructor(
    public readonly fuente: string,
    public readonly url: string,
    mensaje: string,
  ) {
    super(`[${fuente}] ${mensaje}`);
    this.name = "ErrorDeFuente";
  }
}

type Opciones = {
  /** Id de la fuente, para los mensajes de error. */
  fuente: string;
  /** Segundos de caché (Next Data Cache). */
  revalidate: number;
  timeoutMs?: number;
  reintentos?: number;
};

/**
 * Único punto de salida a Internet: fetch con timeout, un reintento, caché y validación Zod.
 * Si la respuesta no cumple el schema, falla: preferimos no mostrar nada a mostrar algo mal.
 */
export async function traerJson<S extends z.ZodType>(url: string, schema: S, opciones: Opciones): Promise<z.infer<S>> {
  const { fuente, revalidate, timeoutMs = 9000, reintentos = 1 } = opciones;
  let ultimoError: unknown;
  for (let intento = 0; intento <= reintentos; intento++) {
    try {
      const respuesta = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        next: { revalidate },
      });
      if (!respuesta.ok) throw new ErrorDeFuente(fuente, url, `respondió ${respuesta.status}`);
      const json: unknown = await respuesta.json();
      const resultado = schema.safeParse(json);
      if (!resultado.success) {
        const detalle = resultado.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new ErrorDeFuente(fuente, url, `la respuesta cambió de forma (${detalle})`);
      }
      return resultado.data;
    } catch (error) {
      ultimoError = error;
      if (error instanceof ErrorDeFuente && error.message.includes("cambió de forma")) break; // reintentar no ayuda
    }
  }
  if (ultimoError instanceof ErrorDeFuente) throw ultimoError;
  const motivo = ultimoError instanceof Error ? (ultimoError.name === "TimeoutError" ? "no respondió a tiempo" : ultimoError.message) : "error desconocido";
  throw new ErrorDeFuente(fuente, url, motivo);
}

/**
 * Igual que `traerJson`, pero devuelve el texto crudo (RSS/XML). La validación la hace quien lo parsea.
 */
export async function traerTexto(url: string, opciones: Opciones): Promise<string> {
  const { fuente, revalidate, timeoutMs = 9000, reintentos = 1 } = opciones;
  let ultimoError: unknown;
  for (let intento = 0; intento <= reintentos; intento++) {
    try {
      const respuesta = await fetch(url, {
        headers: { accept: "application/rss+xml, application/xml, text/xml", "user-agent": "Mozilla/5.0 (compatible; RindeNoticias/1.0)" },
        signal: AbortSignal.timeout(timeoutMs),
        next: { revalidate },
      });
      if (!respuesta.ok) throw new ErrorDeFuente(fuente, url, `respondió ${respuesta.status}`);
      return await respuesta.text();
    } catch (error) {
      ultimoError = error;
    }
  }
  if (ultimoError instanceof ErrorDeFuente) throw ultimoError;
  const motivo = ultimoError instanceof Error ? (ultimoError.name === "TimeoutError" ? "no respondió a tiempo" : ultimoError.message) : "error desconocido";
  throw new ErrorDeFuente(fuente, url, motivo);
}
