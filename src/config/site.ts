/**
 * El nombre del producto vive SOLO acá. "Rinde" es provisorio: para cambiarlo, editá `name`
 * (y, si cambia el dominio, `NEXT_PUBLIC_SITE_URL` en las variables de entorno).
 */
export const site = {
  name: "Rinde",
  tagline: "Tu plata, clara.",
  description:
    "El dólar hoy y dónde conviene comprarlo, las tasas en pesos, LECAPs, bonos y CEDEARs, con tu cartera real contra la inflación.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "es-AR",
  contacto: "info@donderinde.com.ar",
  redes: {
    x: "",
    instagram: "",
  },
} as const;

export type NavItem = { href: string; label: string };

export const navPrincipal: NavItem[] = [
  { href: "/", label: "Inicio" },
  { href: "/dolar", label: "Dólar" },
  { href: "/pesos", label: "Pesos" },
  { href: "/mercados", label: "Mercados" },
  { href: "/calculadoras", label: "Calculadoras" },
];

export const navSecundaria: NavItem[] = [
  { href: "/cartera", label: "Mi cartera" },
  { href: "/alertas", label: "Alertas" },
  { href: "/aprender", label: "Aprender" },
  { href: "/metodologia", label: "Metodología" },
  { href: "/legal", label: "Legal" },
];
