import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * El service worker (public/sw.js) corriendo con un caché y una red de mentira: que un ícono nuevo llegue aunque haya uno
 * viejo guardado (pasó con las tres barras → la "r"), y que sin conexión siga andando.
 */
const ORIGEN = "https://rinde.test";
const CODIGO = readFileSync(join(__dirname, "..", "public", "sw.js"), "utf8");

type Pedido = { method: string; url: string; mode?: string };
type Manejador = (e: Record<string, unknown>) => void;

function montar({ guardado = {}, red }: { guardado?: Record<string, Record<string, string>>; red: (url: string) => Response | null }) {
  const almacen = new Map(Object.entries(guardado).map(([k, v]) => [k, new Map(Object.entries(v).map(([u, t]) => [ORIGEN + u, new Response(t)]))]));
  const abrir = (k: string) => {
    if (!almacen.has(k)) almacen.set(k, new Map());
    const m = almacen.get(k)!;
    return {
      put: async (req: Pedido, res: Response) => void m.set(req.url, res),
      match: async (req: Pedido | string) => m.get(typeof req === "string" ? ORIGEN + req : req.url)?.clone(),
      addAll: async (urls: string[]) => urls.forEach((u) => m.set(ORIGEN + u, new Response("sin conexión"))),
    };
  };
  const caches = {
    keys: async () => [...almacen.keys()],
    delete: async (k: string) => almacen.delete(k),
    open: async (k: string) => abrir(k),
    match: async (req: Pedido | string) => {
      for (const k of almacen.keys()) {
        const hit = await abrir(k).match(req);
        if (hit) return hit;
      }
      return undefined;
    },
  };
  const fetch = async (req: Pedido) => {
    const res = red(req.url);
    if (!res) throw new TypeError("sin conexión");
    return res;
  };
  const manejadores: Record<string, Manejador> = {};
  const self = { addEventListener: (tipo: string, f: Manejador) => (manejadores[tipo] = f), skipWaiting: () => {}, clients: { claim: async () => {} }, location: { origin: ORIGEN } };
  new Function("self", "caches", "fetch", CODIGO)(self, caches, fetch);

  /** Dispara un evento y espera lo que el service worker deja en `waitUntil` o `respondWith` (y las copias al caché). */
  const disparar = async (tipo: string, extra: Record<string, unknown> = {}) => {
    let promesa: Promise<unknown> | undefined;
    manejadores[tipo]!({ ...extra, waitUntil: (p: Promise<unknown>) => (promesa = p), respondWith: (p: Promise<unknown>) => (promesa = p) });
    const r = await promesa;
    await new Promise((ok) => setTimeout(ok, 0));
    return r as Response | undefined;
  };
  const pedir = (ruta: string, mode?: string) => disparar("fetch", { request: { method: "GET", url: ORIGEN + ruta, mode } });
  return { almacen, disparar, pedir };
}

describe("service worker", () => {
  it("al activarse borra lo guardado con la versión anterior (los íconos viejos de las tres barras)", async () => {
    const sw = montar({ guardado: { "rinde-v1": { "/iconos/192": "barras" } }, red: () => null });
    await sw.disparar("install");
    await sw.disparar("activate");
    expect([...sw.almacen.keys()]).toEqual(["rinde-v2"]);
  });

  it("un ícono de la app se pide a la red aunque haya uno guardado, y se guarda el nuevo", async () => {
    const sw = montar({ guardado: { "rinde-v2": { "/iconos/192": "barras" } }, red: () => new Response("la r") });
    expect(await (await sw.pedir("/iconos/192"))!.text()).toBe("la r");
    expect(await sw.almacen.get("rinde-v2")!.get(ORIGEN + "/iconos/192")!.clone().text()).toBe("la r");
  });

  it("sin conexión, el ícono guardado; y una página sin guardar, la de 'sin conexión'", async () => {
    const sw = montar({ guardado: { "rinde-v2": { "/iconos/192": "la r", "/offline.html": "sin conexión" } }, red: () => null });
    expect(await (await sw.pedir("/iconos/192"))!.text()).toBe("la r");
    expect(await (await sw.pedir("/dolar", "navigate"))!.text()).toBe("sin conexión");
  });

  it("un error de la red (404, 500) no pisa lo guardado", async () => {
    const sw = montar({ guardado: { "rinde-v2": { "/iconos/192": "la r" } }, red: () => new Response("no está", { status: 404 }) });
    expect((await sw.pedir("/iconos/192"))!.status).toBe(404);
    expect(await sw.almacen.get("rinde-v2")!.get(ORIGEN + "/iconos/192")!.clone().text()).toBe("la r");
  });

  it("los datos (/api/) nunca pasan por el caché", async () => {
    const sw = montar({ red: () => new Response("{}") });
    expect(await sw.pedir("/api/dolar")).toBeUndefined();
  });
});
