"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { diasEntre, hoyAR } from "@/lib/calculos/fechas";
import { evaluar, type FotoMercado } from "@/lib/alertas/evaluar";

/** Vencimientos de la cartera local, para las alertas de vencimiento. Carga Dexie bajo demanda. */
export async function vencimientosLocales(): Promise<FotoMercado["vencimientos"]> {
  try {
    const { repositorioLocal } = await import("@/lib/cartera/repositorio");
    const { activos, movimientos } = await repositorioLocal.cargar();
    const conMovs = new Set(movimientos.map((m) => m.activoId));
    const hoy = hoyAR();
    return activos.filter((a) => a.vencimiento && conMovs.has(a.id) && a.vencimiento >= hoy).map((a) => ({ nombre: a.nombre, fecha: a.vencimiento!, dias: diasEntre(hoy, a.vencimiento!) }));
  } catch {
    return [];
  }
}

/**
 * Vigía de alertas: corre en cualquier pantalla. Arranca cuando el navegador está libre (no compite con la
 * carga inicial) y cada 3 minutos, con la pestaña visible, evalúa las alertas activas. Avisa dentro del sitio
 * la primera vez en el día que se cumple cada una.
 */
export function VigiaAlertas() {
  const toast = useToast();
  useEffect(() => {
    let vivo = true;
    const revisar = async () => {
      if (document.hidden || !vivo) return;
      const { listarAlertas, guardarAlerta } = await import("@/lib/alertas/almacen");
      const alertas = (await listarAlertas()).filter((a) => a.activa);
      if (alertas.length === 0) return;
      try {
        const { fotoConActivos, tickersDeAlertas } = await import("@/lib/alertas/foto");
        const foto = await fotoConActivos(tickersDeAlertas(alertas), await vencimientosLocales());
        if (!foto) return;
        const hoy = hoyAR();
        for (const a of alertas) {
          const res = evaluar(a, foto);
          if (res.cumplida && a.ultimaVez?.slice(0, 10) !== hoy && vivo) {
            await guardarAlerta({ ...a, ultimaVez: new Date().toISOString() });
            toast(`Alerta: ${res.mensaje}`);
          }
        }
      } catch {
        // Sin conexión: se reintenta en la próxima vuelta.
      }
    };
    const ocioso = (cb: () => void) => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 6000 }) : setTimeout(cb, 4000));
    const inicial = window.setTimeout(() => ocioso(() => void revisar()), 3000);
    const id = setInterval(revisar, 180_000);
    return () => {
      vivo = false;
      clearTimeout(inicial);
      clearInterval(id);
    };
  }, [toast]);
  return null;
}
