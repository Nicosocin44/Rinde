"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CARTERA_DEMO } from "@data/samples/cartera-demo";
import { hoyAR } from "@/lib/calculos/fechas";
import type { Activo, Movimiento } from "@/lib/calculos/cartera";
import { repositorioLocal, type DatosCartera } from "@/lib/cartera/repositorio";
import { analizarCartera } from "@/lib/cartera/valuacion";
import type { PreciosCartera } from "@/lib/data/servicios/cartera";

export type EstadoCartera = "cargando" | "demo" | "propia" | "vacia";

/** Lee IndexedDB y decide qué mostrar. Sin IndexedDB (algunas navegaciones privadas), la demo. */
async function leerCartera(): Promise<{ datos: DatosCartera; estado: EstadoCartera }> {
  try {
    const propios = await repositorioLocal.cargar();
    if (propios.movimientos.length > 0) return { datos: propios, estado: "propia" };
    if (propios.ajustes?.demoDescartada) return { datos: propios, estado: "vacia" };
  } catch {
    // sigue a la demo
  }
  return { datos: CARTERA_DEMO, estado: "demo" };
}

/**
 * Estado de la cartera: lee IndexedDB; si está vacía y no se descartó la demo, muestra la cartera de ejemplo
 * (rotulada). Pide los precios de los instrumentos al servidor (solo los ids, nunca los montos).
 */
export function useCartera(preciosIniciales?: PreciosCartera | null) {
  const [datos, setDatos] = useState<DatosCartera | null>(null);
  const [estado, setEstado] = useState<EstadoCartera>("cargando");
  const [precios, setPrecios] = useState<PreciosCartera | null>(preciosIniciales ?? null);
  const [errorPrecios, setErrorPrecios] = useState(false);

  const recargar = useCallback(async () => {
    const r = await leerCartera();
    setDatos(r.datos);
    setEstado(r.estado);
  }, []);

  useEffect(() => {
    let vivo = true;
    void leerCartera().then((r) => {
      if (!vivo) return;
      setDatos(r.datos);
      setEstado(r.estado);
    });
    return () => {
      vivo = false;
    };
  }, []);

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
      if (estado === "demo") await repositorioLocal.vaciar();
      await repositorioLocal.guardarActivo(activo);
      await repositorioLocal.guardarMovimiento(movimiento);
      await recargar();
    },
    [estado, recargar],
  );

  return { datos, estado, precios, errorPrecios, analisis, recargar, guardar };
}
