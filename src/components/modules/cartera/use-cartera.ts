"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CARTERA_DEMO } from "@data/samples/cartera-demo";
import { hoyAR } from "@/lib/calculos/fechas";
import type { Activo, Movimiento } from "@/lib/calculos/cartera";
import { aSubir } from "@/lib/cartera/fusion";
import { repositorioLocal, type DatosCartera, type PortfolioRepository } from "@/lib/cartera/repositorio";
import { repositorioNube } from "@/lib/cartera/repositorio-nube";
import { analizarCartera } from "@/lib/cartera/valuacion";
import { supabase } from "@/lib/cuenta/cliente";
import { useSesion } from "@/lib/cuenta/sesion";
import type { PreciosCartera } from "@/lib/data/servicios/cartera";

export type EstadoCartera = "cargando" | "demo" | "propia" | "vacia" | "error";

type Nube = ReturnType<typeof repositorioNube>;
type Lectura = { datos: DatosCartera | null; estado: EstadoCartera; subidos: number };

/** Sin sesión: lee IndexedDB y decide qué mostrar. Sin IndexedDB (algunas navegaciones privadas), la demo. */
async function leerLocal(): Promise<Lectura> {
  try {
    const propios = await repositorioLocal.cargar();
    if (propios.movimientos.length > 0) return { datos: propios, estado: "propia", subidos: 0 };
    if (propios.ajustes?.demoDescartada) return { datos: propios, estado: "vacia", subidos: 0 };
  } catch {
    // sigue a la demo
  }
  return { datos: CARTERA_DEMO, estado: "demo", subidos: 0 };
}

/**
 * Con sesión: primero suma a la cuenta lo que haya en este navegador (y recién entonces lo borra de acá; si la subida
 * falla, queda en el navegador y se reintenta la próxima vez). Después lee la cuenta. Con sesión no hay demo.
 */
async function leerCuenta(nube: Nube): Promise<Lectura> {
  let subidos = 0;
  try {
    const local = await repositorioLocal.cargar();
    if (local.movimientos.length > 0) {
      const nuevos = aSubir(local, await nube.cargar());
      await nube.sumar(nuevos.activos, nuevos.movimientos);
      await repositorioLocal.vaciar();
      subidos = nuevos.movimientos.length;
    }
  } catch {
    // sin IndexedDB o sin conexión: se reintenta la próxima vez
  }
  try {
    const datos = await nube.cargar();
    return { datos, estado: datos.movimientos.length > 0 ? "propia" : "vacia", subidos };
  } catch {
    return { datos: null, estado: "error", subidos };
  }
}

/**
 * Estado de la cartera. Sin sesión, la del navegador (o la de ejemplo, rotulada); con sesión, la de la cuenta. Pide
 * los precios de los instrumentos al servidor (solo los ids, nunca los montos).
 */
export function useCartera(preciosIniciales?: PreciosCartera | null) {
  const sesion = useSesion();
  const nube = useMemo(() => (sesion.estado === "con" ? repositorioNube(supabase()!, sesion.id) : null), [sesion]);
  const repo: PortfolioRepository = nube ?? repositorioLocal;
  const lista = sesion.estado !== "cargando";

  const [datos, setDatos] = useState<DatosCartera | null>(null);
  const [estado, setEstado] = useState<EstadoCartera>("cargando");
  const [subidos, setSubidos] = useState<{ cantidad: number; vez: number } | null>(null);
  const [precios, setPrecios] = useState<PreciosCartera | null>(preciosIniciales ?? null);
  const [errorPrecios, setErrorPrecios] = useState(false);

  const leer = useCallback(() => (nube ? leerCuenta(nube) : leerLocal()), [nube]);

  const aplicar = useCallback((r: Lectura) => {
    setDatos(r.datos);
    setEstado(r.estado);
    if (r.subidos > 0) setSubidos({ cantidad: r.subidos, vez: Date.now() });
  }, []);

  const recargar = useCallback(async () => aplicar(await leer()), [aplicar, leer]);

  useEffect(() => {
    if (!lista) return;
    let vivo = true;
    void leer().then((r) => vivo && aplicar(r));
    return () => {
      vivo = false;
    };
  }, [lista, leer, aplicar]);

  const ids = useMemo(() => (datos ? datos.activos.filter((a) => !["billetera", "plazo_fijo", "fci", "efectivo_usd"].includes(a.tipo)).map((a) => a.id).sort() : []), [datos]);
  const clave = ids.join(",");

  useEffect(() => {
    if (!datos) return;
    let vivo = true;
    fetch(`/api/cartera/precios?ids=${encodeURIComponent(clave)}`)
      .then((r) => (r.ok ? (r.json() as Promise<PreciosCartera>) : Promise.reject(new Error(String(r.status)))))
      .then((p) => {
        if (!vivo) return;
        setPrecios(p);
        setErrorPrecios(false);
      })
      .catch(() => vivo && setErrorPrecios(true));
    return () => {
      vivo = false;
    };
  }, [clave, datos]);

  const analisis = useMemo(() => (datos && precios && datos.movimientos.length ? analizarCartera(datos.activos, datos.movimientos, precios, hoyAR()) : null), [datos, precios]);

  const guardar = useCallback(
    async (activo: Activo, movimiento: Movimiento) => {
      if (estado === "demo") await repo.vaciar();
      await repo.guardarActivo(activo);
      await repo.guardarMovimiento(movimiento);
      await recargar();
    },
    [estado, repo, recargar],
  );

  return { datos, estado, precios, errorPrecios, analisis, recargar, guardar, repo, sesion, subidos };
}
