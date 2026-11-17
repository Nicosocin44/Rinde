"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { diasEntre, hoyAR } from "@/lib/calculos/fechas";
import { evaluar, type FotoMercado } from "@/lib/alertas/evaluar";
import { guardarAlerta, listarAlertas } from "@/lib/alertas/almacen";
import { repositorioLocal } from "@/lib/cartera/repositorio";

/** Vencimientos de la cartera local, para las alertas de vencimiento. */
export async function vencimientosLocales(): Promise<FotoMercado["vencimientos"]> {
  try {
    const { activos, movimientos } = await repositorioLocal.cargar();
    const conMovs = new Set(movimientos.map((m) => m.activoId));
    const hoy = hoyAR();
    return activos.filter((a) => a.vencimiento && conMovs.has(a.id) && a.vencimiento >= hoy).map((a) => ({ nombre: a.nombre, fecha: a.vencimiento!, dias: diasEntre(hoy, a.vencimiento!) }));
  } catch {
    return [];
  }
}

/**
 * Vigía de alertas: corre en cualquier pantalla. Cada 3 minutos (con la pestaña visible) evalúa las alertas
 * activas y avisa dentro del sitio la primera vez en el día que se cumple cada una.
 */
export function VigiaAlertas() {
  const toast = useToast();
  useEffect(() => {
    let vivo = true;
    const revisar = async () => {
      if (document.hidden) return;
      const alertas = (await listarAlertas()).filter((a) => a.activa);
      if (alertas.length === 0) return;
      try {
        const r = await fetch("/api/alertas/mercado");
        if (!r.ok) return;
        const foto = { ...((await r.json()) as FotoMercado), vencimientos: await vencimientosLocales() };
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
    const primera = setTimeout(revisar, 2500);
    const id = setInterval(revisar, 180_000);
    return () => {
      vivo = false;
      clearTimeout(primera);
      clearInterval(id);
    };
  }, [toast]);
  return null;
}
