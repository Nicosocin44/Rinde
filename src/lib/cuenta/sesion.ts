"use client";

import { useEffect, useState } from "react";
import { cuentasDisponibles } from "./config";
import { supabase } from "./cliente";

/**
 * Sesión del usuario. Se entra sin contraseña: se pide un código al mail y se escribe en la misma pantalla (con un
 * link, en el celular, se abriría en el navegador de la app de correo y no donde estaba el usuario).
 */
export type Sesion = { estado: "no-disponible" } | { estado: "cargando" } | { estado: "sin" } | { estado: "con"; id: string; email: string };

type Usuario = { id: string; email?: string } | null | undefined;

export function useSesion(): Sesion {
  const [sesion, setSesion] = useState<Sesion>(cuentasDisponibles ? { estado: "cargando" } : { estado: "no-disponible" });

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    // Mismo usuario → mismo objeto (la sesión se renueva sola cada hora y no tiene que recargar la cartera).
    const aplicar = (u: Usuario) => setSesion((antes) => (u ? (antes.estado === "con" && antes.id === u.id ? antes : { estado: "con", id: u.id, email: u.email ?? "" }) : antes.estado === "sin" ? antes : { estado: "sin" }));
    void sb.auth.getSession().then(({ data }) => aplicar(data.session?.user));
    const { data } = sb.auth.onAuthStateChange((_evento, s) => aplicar(s?.user));
    return () => data.subscription.unsubscribe();
  }, []);

  return sesion;
}

/** Mensaje para humanos a partir de un error de Supabase Auth. */
export function mensajeError(error: { status?: number; code?: string; message?: string }): string {
  if (error.status === 429 || error.code?.includes("rate_limit")) return "Pediste varios códigos seguidos. Esperá unos minutos y probá de nuevo.";
  if (error.code === "email_address_invalid" || /validate email|invalid format/i.test(error.message ?? "")) return "Revisá el mail: parece que tiene un error.";
  if (error.code === "otp_expired" || /expired|invalid|token/i.test(error.message ?? "")) return "El código no es correcto o ya venció. Revisalo o pedí uno nuevo.";
  return "No pudimos conectarnos. Probá de nuevo en un rato.";
}

export async function pedirCodigo(email: string): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "Las cuentas no están disponibles en este momento.";
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  return error ? mensajeError(error) : null;
}

export async function verificarCodigo(email: string, codigo: string): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "Las cuentas no están disponibles en este momento.";
  const { error } = await sb.auth.verifyOtp({ email, token: codigo, type: "email" });
  return error ? mensajeError(error) : null;
}

export async function cerrarSesion(): Promise<void> {
  await supabase()?.auth.signOut();
}
