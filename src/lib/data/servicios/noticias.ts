import { armarNoticias, type Noticia } from "@/lib/noticias";
import { MEDIOS, noticiasDeFeed } from "../adapters/medios";
import { conRespaldo } from "../cache";
import type { Fuente } from "../types";

export type Noticias = {
  noticias: Noticia[];
  /** Medios que no respondieron en esta carga (el resto se muestra igual). */
  sinRespuesta: string[];
};

const FUENTES_MEDIOS: Fuente[] = MEDIOS.map((m) => ({ id: m.id, name: m.nombre, url: m.sitio }));

/**
 * Noticias de todos los medios, en paralelo. Si un medio falla, se sigue con los demás y se avisa cuál;
 * si fallan todos, queda el último dato válido (o un error diseñado en la página).
 */
export async function cargarNoticias() {
  return conRespaldo<Noticias>("noticias", FUENTES_MEDIOS, async () => {
    const pedidos = MEDIOS.flatMap((m) => m.feeds.map((url) => ({ medio: m, promesa: noticiasDeFeed(m.id, url) })));
    const resultados = await Promise.allSettled(pedidos.map((p) => p.promesa));
    const crudas = resultados.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const okPorMedio = new Set(pedidos.filter((_, i) => resultados[i]!.status === "fulfilled").map((p) => p.medio.id));
    if (!okPorMedio.size) throw new Error("ningún medio respondió");
    const noticias = armarNoticias(crudas);
    return {
      data: { noticias, sinRespuesta: MEDIOS.filter((m) => !okPorMedio.has(m.id)).map((m) => m.nombre) },
      asOf: new Date().toISOString(),
      status: "live",
    };
  });
}
