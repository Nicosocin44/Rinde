import type { MetadataRoute } from "next";
import { site } from "@/config/site";

const RUTAS = [
  "/",
  "/dolar",
  "/dolar/comprar",
  "/dolar/historico",
  "/dolar/conversor",
  "/pesos",
  "/pesos/plazo-fijo",
  "/pesos/billeteras",
  "/pesos/fci",
  "/pesos/caucion",
  "/pesos/lecaps",
  "/pesos/simulador",
  "/bonos",
  "/mercados",
  "/mercados/acciones",
  "/mercados/cripto",
  "/mercados/opciones",
  "/calculadoras",
  "/calculadoras/interes-compuesto",
  "/calculadoras/que-hubiera-pasado",
  "/calculadoras/jubilacion",
  "/calculadoras/plazo-fijo",
  "/calculadoras/tasas",
  "/calculadoras/inflacion",
  "/metas",
  "/noticias",
  "/cartera",
  "/alertas",
  "/aprender",
  "/metodologia",
  "/legal",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return RUTAS.map((r) => ({ url: `${site.url}${r}`, changeFrequency: r.startsWith("/dolar") || r === "/" ? "hourly" : "daily", priority: r === "/" ? 1 : 0.7 }));
}
