/**
 * Lo mínimo de las cuentas, sin cargar Supabase: si están disponibles y si hay una sesión guardada en el navegador.
 * Lo usa el vigía de alertas, que corre en todas las pantallas (así el resto del sitio no baja el SDK).
 */
export const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Dónde guarda Supabase la sesión en el navegador. */
export const CLAVE_SESION = "rinde-sesion";

/** Sin las variables de Supabase (una copia local sin `vercel env pull`), las cuentas se apagan y todo sigue en el navegador. */
export const cuentasDisponibles = Boolean(URL_SUPABASE && CLAVE_PUBLICA);

export function haySesionGuardada(): boolean {
  try {
    return cuentasDisponibles && window.localStorage.getItem(CLAVE_SESION) !== null;
  } catch {
    return false;
  }
}
