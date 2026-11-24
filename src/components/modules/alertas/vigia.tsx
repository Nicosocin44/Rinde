"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { diasEntre, hoyAR } from "@/lib/calculos/fechas";
import { evaluar, type FotoMercado } from "@/lib/alertas/evaluar";

/** La cartera del usuario: la de su cuenta si inició sesión; si no, la del navegador. Carga Dexie y Supabase bajo demanda. */
async function cargarCartera() {
  const { haySesionGuardada } = await import("@/lib/cuenta/config");
  if (haySesionGuardada()) {
    const { supabase } = await import("@/lib/cuenta/cliente");
    const sb = supabase();
    const usuario = sb ? (await sb.auth.getSession()).data.session?.user : undefined;
    if (sb && usuario) {
      const { repositorioNube } = await import("@/lib/cartera/repositorio-nube");
      return repositorioNube(sb, usuario.id).cargar();
    }
  }
  const { repositorioLocal } = await import("@/lib/cartera/repositorio");
  return repositorioLocal.cargar();
}

/** Vencimientos de la cartera, para las alertas de vencimiento. */
export async function vencimientosLocales(): Promise<FotoMercado["vencimientos"]> {
  try {
    const { activos, movimientos } = await cargarCartera();
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
