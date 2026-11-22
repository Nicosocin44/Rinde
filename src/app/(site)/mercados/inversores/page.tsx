import type { Metadata } from "next";
import Link from "next/link";
import { AvisoInversores, CifraMonto, etiquetaTrimestre, fechasInforme, LogosPosiciones, MarcaInversor, montoUsd } from "@/components/modules/inversores/comun";
import { inversores, totalArgentina, ultimo } from "@/lib/inversores/datos";
import { fechaCorta, porcentaje } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Grandes inversores: qué tienen y qué compraron",
  description: "Las carteras de los fondos con más acciones argentinas y de los inversores más conocidos (Buffett, Druckenmiller, Dalio…), con sus últimas compras y ventas, según sus informes a la SEC.",
};

export default function Inversores() {
  const lista = inversores();
  const foco = lista.filter((i) => i.grupo === "argentina").sort((a, b) => ultimo(b).argentina - ultimo(a).argentina);
  const mundo = lista.filter((i) => i.grupo === "mundo").sort((a, b) => ultimo(b).total - ultimo(a).total);
  const { total, inversores: cuantos, hasta } = totalArgentina();

  return (
    <div className="flex flex-col gap-14 lg:gap-20">
      <section className="flex flex-col gap-3">
        <p className="text-label">Fondos con foco en Argentina</p>
        <CifraMonto valor={total} />
        <p className="text-[17px] font-medium">Es lo que tienen en acciones argentinas los {cuantos} fondos con más peso en Argentina.</p>
        <p className="max-w-xl text-text-2">Según el último informe de cada uno a la SEC, con la cartera hasta el {fechaCorta(hasta, true)}. Tocá cada uno para ver su cartera completa y qué compró y vendió.</p>
      </section>

      <section aria-labelledby="foco" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="foco" className="text-h3">
            Con foco en Argentina
          </h2>
          <p className="text-chico text-text-2">Ordenados por cuánto tienen en acciones argentinas. Los nuevos se suman solos cada trimestre.</p>
        </div>
        <ol className="flex flex-col border-t border-border">
          {foco.map((i, k) => {
            const t = ultimo(i);
            return (
              <li key={i.slug} className="border-b border-border">
                <Link href={`/mercados/inversores/${i.slug}`} className="-mx-2 grid grid-cols-[24px_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-[14px] px-2 py-3 hover:bg-surface-2 md:grid-cols-[24px_auto_minmax(0,1fr)_120px_170px_150px]">
                  <span className="tabular text-chico text-text-3">{k + 1}</span>
                  <MarcaInversor inversor={i} />
                  <span className="min-w-0">
                    <span className="block truncate text-[16px] font-semibold">{i.nombre}</span>
                    <span className="block truncate text-chico text-text-2">{[i.persona, i.ciudad, etiquetaTrimestre(t.periodo)].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="tabular text-right text-[16px] font-semibold">{montoUsd(t.argentina)}</span>
                  <span className="tabular col-start-3 text-chico whitespace-nowrap text-text-2 md:col-start-auto md:text-right md:text-[15px]">{porcentaje(t.argentina / t.total, 1)} de su cartera</span>
                  <span className="hidden justify-end md:flex">
                    <LogosPosiciones posiciones={[...t.posicionesArgentinas].sort((a, b) => b.valor - a.valor)} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="mundo" className="flex flex-col gap-4">
        <h2 id="mundo" className="text-h3">
          Los grandes del mundo
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mundo.map((i) => {
            const t = ultimo(i);
            return (
              <li key={i.slug}>
                <Link href={`/mercados/inversores/${i.slug}`} className="presionable flex h-full flex-col gap-4 rounded-(--radius-card) border border-border bg-surface p-4 hover:border-border-strong">
                  <span className="flex items-center gap-3">
                    <MarcaInversor inversor={i} />
                    <span className="min-w-0">
                      <span className="block truncate text-[16px] font-semibold">{i.persona && !i.persona.startsWith("Fundado") ? i.persona : i.nombre}</span>
                      <span className="block truncate text-chico text-text-2">{i.persona && !i.persona.startsWith("Fundado") ? i.nombre : i.persona}</span>
                    </span>
                  </span>
                  <span className="flex items-end justify-between gap-3">
                    <span className="flex flex-col">
                      <span className="tabular text-[22px] leading-tight font-bold tracking-[-0.02em]">{montoUsd(t.total)}</span>
                      <span className="text-micro text-text-2">{fechasInforme(t).split(" · ")[0]}</span>
                    </span>
                    <LogosPosiciones posiciones={t.posiciones} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <AvisoInversores />
    </div>
  );
}
