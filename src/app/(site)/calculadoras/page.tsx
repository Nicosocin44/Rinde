import type { Metadata } from "next";
import Link from "next/link";
import { Revelar } from "@/components/ui/revelar";

export const metadata: Metadata = {
  title: "Calculadoras financieras",
  description: "Metas de ahorro, interés compuesto, jubilación, ¿qué hubiera pasado?, plazo fijo, conversor de tasas e inflación.",
};

type Calculadora = { href: string; titulo: string; pregunta: string; ejemplo: string };

/**
 * Tres grupos de a tres (punto 30). Pesos a dólares y el Simulador viven en Dólar y en Pesos: acá son solo links, sin
 * solapa propia.
 */
const GRUPOS: { titulo: string; calculadoras: Calculadora[] }[] = [
  {
    titulo: "Para ahorrar",
    calculadoras: [
      { href: "/calculadoras/metas", titulo: "Metas de ahorro", pregunta: "¿Cuánto tengo que juntar por mes para mi meta?", ejemplo: "Un viaje de US$ 800 en 8 meses" },
      { href: "/calculadoras/interes-compuesto", titulo: "Interés compuesto", pregunta: "¿Cuánto junto si ahorro todos los meses?", ejemplo: "$ 100.000 por mes durante 10 años" },
      { href: "/calculadoras/jubilacion", titulo: "Jubilación", pregunta: "¿Cuánto tengo que ahorrar para jubilarme?", ejemplo: "Gastar US$ 1.500 por mes al jubilarte" },
    ],
  },
  {
    titulo: "Para invertir",
    calculadoras: [
      { href: "/calculadoras/que-hubiera-pasado", titulo: "¿Qué hubiera pasado si…?", pregunta: "Si hace un año ponía mi plata en algo, ¿cuánto tendría hoy?", ejemplo: "$ 1.000.000 en dólar, plazo fijo, una acción o bitcoin" },
      { href: "/calculadoras/plazo-fijo", titulo: "Plazo fijo", pregunta: "¿Cuánto cobro y le gano a la inflación?", ejemplo: "$ 1.000.000 a 30 días" },
      { href: "/pesos/simulador", titulo: "Simulador de inversiones", pregunta: "Pongo $ X a N días: ¿qué me conviene?", ejemplo: "Todas las alternativas lado a lado" },
    ],
  },
  {
    titulo: "Cuentas rápidas",
    calculadoras: [
      { href: "/calculadoras/tasas", titulo: "Conversor de tasas", pregunta: "¿Cuánto es esta TNA en TEA y TEM?", ejemplo: "24 % TNA a 30 días" },
      { href: "/calculadoras/inflacion", titulo: "Inflación", pregunta: "¿Cuánto valen hoy mis pesos de antes?", ejemplo: "$ 100.000 de hace 3 años" },
      { href: "/dolar/conversor", titulo: "Pesos a dólares", pregunta: "¿Cuántos dólares compro con mis pesos?", ejemplo: "En cada tipo de cambio" },
    ],
  },
];

export default function Calculadoras() {
  return (
    <div className="flex flex-col gap-12 lg:gap-16">
      {GRUPOS.map((g, n) => (
        <section key={g.titulo} aria-labelledby={`grupo-${n}`}>
          <h2 id={`grupo-${n}`} className="mb-4 text-[15px] leading-5 font-semibold text-text">
            {g.titulo}
          </h2>
          <ul className="border-t border-border">
            {g.calculadoras.map((c, i) => (
              <Revelar key={c.href} como="li" indice={n * 3 + i} className="border-b border-border">
                <Link href={c.href} className="group presionable grid gap-1 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-8 lg:py-7">
                  <span className="text-h3">{c.titulo}</span>
                  <span className="text-text-2">
                    {c.pregunta}
                    <span className="block text-chico text-text-3">Ej.: {c.ejemplo}</span>
                  </span>
                  <span aria-hidden className="hidden text-[20px] text-text-3 transition-transform duration-(--duration-short) group-hover:translate-x-1 md:block">
                    →
                  </span>
                </Link>
              </Revelar>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
