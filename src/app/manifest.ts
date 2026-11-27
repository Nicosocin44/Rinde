import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} · el dólar, las tasas y tu plata`,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0c0e",
    theme_color: "#0b0c0e",
    lang: "es-AR",
    categories: ["finance"],
    icons: [
      { src: "/iconos/192", sizes: "192x192", type: "image/png" },
      { src: "/iconos/512", sizes: "512x512", type: "image/png" },
      { src: "/iconos/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Dólar hoy", url: "/dolar" },
      { name: "¿Dónde rinde más?", url: "/pesos" },
      { name: "Mi cartera", url: "/cartera" },
      { name: "Mis metas", url: "/calculadoras/metas" },
    ],
  };
}
