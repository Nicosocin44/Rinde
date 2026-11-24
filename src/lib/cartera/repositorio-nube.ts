"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activo, Movimiento } from "@/lib/calculos/cartera";
import type { AjustesCartera, DatosCartera, PortfolioRepository } from "./repositorio";

/**
 * La cartera en la cuenta del usuario (Supabase), con la misma interfaz que la del navegador. Cada fila guarda el
 * objeto tal cual (los montos como texto, decimales exactos). Quién ve qué lo decide la base (Row Level Security,
 * supabase/migrations/0001_cartera.sql): acá se pasa el usuario solo para escribir.
 */
const LOTE = 1000;

function revisar(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

/** Todas las filas de una tabla (la API devuelve hasta 1000 por pedido). */
async function todas<T>(sb: SupabaseClient, tabla: string): Promise<T[]> {
  const salida: T[] = [];
  for (let desde = 0; ; desde += LOTE) {
    const { data, error } = await sb.from(tabla).select("datos").order("id").range(desde, desde + LOTE - 1);
    revisar(error);
    salida.push(...(data ?? []).map((r) => r.datos as T));
    if (!data || data.length < LOTE) return salida;
  }
}

export function repositorioNube(sb: SupabaseClient, usuario: string): PortfolioRepository & { sumar(activos: Activo[], movimientos: Movimiento[]): Promise<void> } {
  const ahora = () => new Date().toISOString();
  const filaActivo = (a: Activo) => ({ user_id: usuario, id: a.id, datos: a, actualizado: ahora() });
  const filaMovimiento = (m: Movimiento) => ({ user_id: usuario, id: m.id, activo_id: m.activoId, datos: m, actualizado: ahora() });

  const guardarAjustes = async (a: AjustesCartera) => {
    revisar((await sb.from("cartera_ajustes").upsert({ user_id: usuario, datos: a, actualizado: ahora() })).error);
  };

  return {
    guardarAjustes,
    async cargar(): Promise<DatosCartera> {
      const [activos, movimientos, ajustes] = await Promise.all([
        todas<Activo>(sb, "cartera_activos"),
        todas<Movimiento>(sb, "cartera_movimientos"),
        sb.from("cartera_ajustes").select("datos").maybeSingle(),
      ]);
      revisar(ajustes.error);
      return { version: 1, activos, movimientos, ajustes: (ajustes.data?.datos as AjustesCartera | undefined) ?? undefined };
    },
    async guardarActivo(a) {
      revisar((await sb.from("cartera_activos").upsert(filaActivo(a))).error);
    },
    async guardarMovimiento(m) {
      revisar((await sb.from("cartera_movimientos").upsert(filaMovimiento(m))).error);
    },
    async borrarMovimiento(id) {
      const { data, error } = await sb.from("cartera_movimientos").select("activo_id").eq("id", id).maybeSingle();
      revisar(error);
      revisar((await sb.from("cartera_movimientos").delete().eq("user_id", usuario).eq("id", id)).error);
      if (!data) return;
      // Si el activo quedó sin movimientos, se borra (igual que en el navegador).
      const quedan = await sb.from("cartera_movimientos").select("id", { count: "exact", head: true }).eq("activo_id", data.activo_id);
      revisar(quedan.error);
      if (quedan.count === 0) revisar((await sb.from("cartera_activos").delete().eq("user_id", usuario).eq("id", data.activo_id)).error);
    },
    async reemplazar(datos) {
      // Todo o nada (una función en la base): si algo falla, la cartera queda como estaba.
      revisar((await sb.rpc("reemplazar_cartera", { activos: datos.activos, movimientos: datos.movimientos })).error);
      if (datos.ajustes) await guardarAjustes(datos.ajustes);
    },
    async vaciar() {
      revisar((await sb.from("cartera_movimientos").delete().eq("user_id", usuario)).error);
      revisar((await sb.from("cartera_activos").delete().eq("user_id", usuario)).error);
    },
    /** Suma activos y movimientos de una vez (lo que había en el navegador al iniciar sesión). */
    async sumar(activos, movimientos) {
      for (let i = 0; i < activos.length; i += LOTE) revisar((await sb.from("cartera_activos").upsert(activos.slice(i, i + LOTE).map(filaActivo))).error);
      for (let i = 0; i < movimientos.length; i += LOTE) revisar((await sb.from("cartera_movimientos").upsert(movimientos.slice(i, i + LOTE).map(filaMovimiento))).error);
    },
  };
}
