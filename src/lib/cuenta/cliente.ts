"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CLAVE_PUBLICA, CLAVE_SESION, URL_SUPABASE, cuentasDisponibles } from "./config";

/** Cuentas de usuario (Supabase Auth). Son opcionales: sin sesión, todo sigue guardándose en el navegador. */
let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!cuentasDisponibles) return null;
  return (cliente ??= createClient(URL_SUPABASE!, CLAVE_PUBLICA!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: CLAVE_SESION },
  }));
}
