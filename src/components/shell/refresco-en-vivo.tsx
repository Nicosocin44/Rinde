"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

/**
 * Trae las cotizaciones nuevas sin recargar: cada `cadaSegundos` vuelve a pedir la página al servidor (router.refresh)
 * y React cambia solo lo que se movió. Lo que el usuario está haciendo (filtros, orden, lo que escribió) queda igual.
 * Con la pestaña oculta no pide nada; al volver a la pestaña, actualiza enseguida.
 */
export function RefrescoEnVivo({ cadaSegundos = 15 }: { cadaSegundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    let ultimo = Date.now();
    const refrescar = () => {
      if (document.hidden) return;
      ultimo = Date.now();
      startTransition(() => router.refresh());
    };
    const id = window.setInterval(refrescar, cadaSegundos * 1000);
    const alVolver = () => {
      if (!document.hidden && Date.now() - ultimo > cadaSegundos * 1000) refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [router, cadaSegundos]);
  return null;
}
