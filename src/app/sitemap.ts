import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { inversores } from "@/lib/inversores/datos";

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
  "/mercados/bonos",
  "/mercados",
  "/mercados/acciones",
  "/mercados/cripto",
  "/mercados/opciones",
  "/mercados/opciones/tasas",
  "/mercados/opciones/estrategias",
  "/mercados/comparar",
  "/mercados/brokers",
  "/mercados/inversores",
  "/calculadoras",
  "/calculadoras/interes-compuesto",
  "/calculadoras/que-hubiera-pasado",
  "/calculadoras/jubilacion",
  "/calculadoras/plazo-fijo",
  "/calculadoras/tasas",
  "/calculadoras/inflacion",
  "/calculadoras/metas",
  "/noticias",
  "/cartera",
  "/alertas",
  "/aprender",
  "/metodologia",
  "/legal",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [...RUTAS, ...inversores().map((i) => `/mercados/inversores/${i.slug}`)].map((r) => ({ url: `${site.url}${r}`, changeFrequency: r.startsWith("/dolar") || r === "/" ? "hourly" : "daily", priority: r === "/" ? 1 : 0.7 }));
}
