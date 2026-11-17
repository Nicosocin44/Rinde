import type { Metadata } from "next";
import Link from "next/link";
import { Revelar } from "@/components/ui/revelar";

export const metadata: Metadata = { title: "Calculadoras financieras", description: "Interés compuesto, jubilación y metas, plazo fijo, conversor de tasas e inflación." };

const CALCULADORAS = [
  { href: "/calculadoras/interes-compuesto", titulo: "Interés compuesto", pregunta: "¿Cuánto junto si ahorro todos los meses?", ejemplo: "$ 100.000 por mes durante 10 años" },
  { href: "/calculadoras/jubilacion", titulo: "Jubilación y metas", pregunta: "¿Cuánto tengo que ahorrar por mes para llegar?", ejemplo: "Gastar US$ 1.500 por mes al jubilarte" },
  { href: "/calculadoras/plazo-fijo", titulo: "Plazo fijo", pregunta: "¿Cuánto cobro y le gano a la inflación?", ejemplo: "$ 1.000.000 a 30 días" },
  { href: "/calculadoras/tasas", titulo: "Conversor de tasas", pregunta: "¿Cuánto es esta TNA en TEA y TEM?", ejemplo: "24 % TNA a 30 días" },
  { href: "/calculadoras/inflacion", titulo: "Inflación", pregunta: "¿Cuánto valen hoy mis pesos de antes?", ejemplo: "$ 100.000 de hace 3 años" },
  { href: "/dolar/conversor", titulo: "Pesos a dólares", pregunta: "¿Cuántos dólares compro con mis pesos?", ejemplo: "En cada tipo de cambio" },
  { href: "/pesos/simulador", titulo: "Simulador de inversiones", pregunta: "Pongo $ X a N días: ¿qué me conviene?", ejemplo: "Todas las alternativas lado a lado" },
];

export default function Calculadoras() {
  return (
    <ul className="border-t border-border">
      {CALCULADORAS.map((c, i) => (
        <Revelar key={c.href} como="li" indice={i} className="border-b border-border">
          <Link href={c.href} className="group presionable grid gap-1 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-8 lg:py-8">
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
  );
}
