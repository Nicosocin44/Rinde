import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvisoInversores, CifraMonto, etiquetaTrimestre, fechasInforme, MarcaInversor, montoUsd } from "@/components/modules/inversores/comun";
import { DonaConLogos, type Porcion } from "@/components/modules/inversores/dona-logos";
import { MovimientosInversor, type TrimestreMovimientos } from "@/components/modules/inversores/movimientos";
import { ProviderMark } from "@/components/ui/provider-mark";
import { obtenerTickersCedear } from "@/lib/data";
import { enlaceDe, inversor, inversores, textoAcciones, tickerLogo, ultimo, type Posicion } from "@/lib/inversores/datos";
import { porcentaje } from "@/lib/format";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return inversores().map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const i = inversor((await params).slug);
  if (!i) return { title: "Inversor" };
  const quien = i.persona && !i.persona.startsWith("Fundado") ? `${i.persona} (${i.nombre})` : i.nombre;
  return { title: `Cartera de ${quien}`, description: `Qué acciones tiene ${quien} y qué compró y vendió en su último informe a la SEC.` };
}

/** Cuántas porciones lleva la dona: las más grandes, y el resto junto. */
const PORCIONES = 10;

export default async function FichaInversor({ params }: Props) {
  const i = inversor((await params).slug);
  if (!i) notFound();
  const t = ultimo(i);
  const cedears = await obtenerTickersCedear().catch(() => new Set<string>());
  const href = (p: Pick<Posicion, "ticker" | "byma">) => enlaceDe(p, cedears);

  const principales = t.posiciones.slice(0, PORCIONES);
  const restoValor = t.total - principales.reduce((s, p) => s + p.valor, 0);
  const porciones: Porcion[] = [
    ...principales.map((p) => ({ clave: p.cusip, nombre: p.nombre, ticker: p.ticker, logo: tickerLogo(p), valor: p.valor, peso: p.peso })),
    ...(restoValor > 0 ? [{ clave: "resto", nombre: `Otras ${t.cantidad - principales.length} posiciones`, ticker: null, valor: restoValor, peso: restoValor / t.total }] : []),
  ];
  const argentinasFuera = t.posicionesArgentinas.filter((p) => !t.posiciones.some((q) => q.cusip === p.cusip));
  const titulo = i.persona && !i.persona.startsWith("Fundado") ? i.persona : i.nombre;
  const subtitulo = [i.persona && !i.persona.startsWith("Fundado") ? i.nombre : i.persona, i.ciudad].filter(Boolean).join(" · ");

  const trimestres: TrimestreMovimientos[] = i.trimestres
    .filter((x) => x.movimientos)
    .map((x) => ({
      periodo: x.periodo,
      etiqueta: etiquetaTrimestre(x.periodo),
      presentado: x.presentado,
      grupos: Object.fromEntries(
        Object.entries(x.movimientos!).map(([tipo, filas]) => [
          tipo,
          filas
            // Las posiciones mínimas (menos del 0,1 % antes y después) no dicen nada, salvo las argentinas.
            .filter((f) => f.argentino || Math.max(f.pesoAntes, f.pesoAhora) >= 0.001)
            .map((f) => ({ clave: f.cusip, ticker: f.ticker, logo: tickerLogo(f), nombre: f.nombre, pesoAntes: f.pesoAntes, pesoAhora: f.pesoAhora, acciones: textoAcciones(f), href: href(f), argentino: f.argentino })),
        ]),
      ) as TrimestreMovimientos["grupos"],
    }));

  return (
    <div className="flex flex-col gap-12 lg:gap-16">
      <div className="flex flex-col gap-6">
        <Link href="/mercados/inversores" className="inline-flex items-center gap-1.5 self-start text-chico font-medium text-text-2 hover:text-text">
          <ArrowLeft className="size-4" /> Todos los inversores
        </Link>
        <div className="flex items-center gap-4">
          <MarcaInversor inversor={i} tamano={56} />
          <div className="min-w-0">
            <h2 className="text-h2">{titulo}</h2>
            {subtitulo && <p className="text-text-2">{subtitulo}</p>}
          </div>
        </div>
      </div>

      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
        <div className="flex flex-col gap-3">
          <p className="text-label">Su cartera en acciones de EE.UU.</p>
          <CifraMonto valor={t.total} />
          {t.argentina > 0 ? (
            <p className="text-[17px] font-medium">
              {montoUsd(t.argentina)} en acciones argentinas: el {porcentaje(t.argentina / t.total, 1)} de su cartera.
            </p>
          ) : (
            <p className="text-[17px] font-medium">En {t.cantidad} acciones y ETF. No tiene acciones argentinas en este informe.</p>
          )}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-chico text-text-2">
            <span>{fechasInforme(t)}</span>
            <a href={t.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
              Ver el informe en la SEC <ArrowUpRight className="size-3.5" />
            </a>
          </p>
        </div>
        <DonaConLogos porciones={porciones} total={t.total} />
      </section>

      <section aria-labelledby="posiciones" className="flex flex-col gap-4">
        <h2 id="posiciones" className="text-h3">
          Sus posiciones más grandes
        </h2>
        <ListaPosiciones posiciones={t.posiciones} href={href} />
        {t.resto.cantidad > 0 && (
          <p className="text-chico text-text-2">
            Y {t.resto.cantidad} posiciones más, que suman {montoUsd(t.resto.valor)} ({porcentaje(t.resto.valor / t.total, 1)}).
          </p>
        )}
      </section>

      {argentinasFuera.length > 0 && (
        <section aria-labelledby="argentinas" className="flex flex-col gap-4">
          <h2 id="argentinas" className="text-h3">
            Sus otras acciones argentinas
          </h2>
          <ListaPosiciones posiciones={argentinasFuera} href={href} />
        </section>
      )}

      {trimestres.length > 0 && (
        <section aria-labelledby="movimientos" className="flex flex-col gap-4">
          <h2 id="movimientos" className="text-h3">
            Últimos movimientos
          </h2>
          <MovimientosInversor trimestres={trimestres} />
        </section>
      )}

      <AvisoInversores />
    </div>
  );
}

function ListaPosiciones({ posiciones, href }: { posiciones: Posicion[]; href: (p: Posicion) => string | null }) {
  return (
    <ul className="grid border-t border-border md:grid-cols-2 md:gap-x-12">
      {posiciones.map((p) => {
        const destino = href(p);
        const contenido = (
          <>
            <ProviderMark activo={tickerLogo(p)} sigla={(p.ticker ?? p.nombre).slice(0, 2)} tamano={32} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                {p.ticker && <span className="font-mono text-[13px] font-semibold">{p.ticker}</span>}
                {p.argentino && <span className="rounded-full bg-accent/10 px-1.5 py-px text-[11px] font-medium text-accent">Argentina</span>}
                {!destino && <span className="text-[11px] text-text-3">No cotiza en Argentina</span>}
              </span>
              <span className="block truncate text-chico text-text-2">{p.nombre}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="tabular block text-[15px] font-semibold">{porcentaje(p.peso, 1)}</span>
              <span className="tabular block text-chico text-text-2">{montoUsd(p.valor)}</span>
            </span>
          </>
        );
        return (
          <li key={p.cusip} className="border-b border-border">
            {destino ? (
              <Link href={destino} className="-mx-2 flex items-center gap-3 rounded-[14px] px-2 py-2.5 hover:bg-surface-2">
                {contenido}
              </Link>
            ) : (
              <div className="flex items-center gap-3 py-2.5">{contenido}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
