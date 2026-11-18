import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { GraficoActivo } from "@/components/modules/activo/grafico";
import { PageHeader } from "@/components/shell/page-header";
import { Delta } from "@/components/ui/delta";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { ProviderMark } from "@/components/ui/provider-mark";
import { enDolares, hoyAR, maximaCaida, primaContraMep, rango, rendimientos, sumarDias, volatilidadAnual, type Rendimientos } from "@/lib/calculos";
import { obtenerActivo, obtenerCotizaciones } from "@/lib/data";
import { MEDIOS } from "@/lib/data/adapters/medios";
import { normalizarTicker, type FichaActivo } from "@/lib/data/servicios/activo";
import { FUENTES } from "@/lib/data/types";
import { dolares, fechaCorta, hora, numero, pesos, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";

export const revalidate = 120;

type Props = { params: Promise<{ ticker: string }> };

async function cargar(params: Props["params"]) {
  const ticker = normalizarTicker((await params).ticker);
  if (!ticker) return null;
  return obtenerActivo(ticker);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await cargar(params);
  // Un ticker que no existe corta acá: así responde 404 antes de empezar a mandar la página.
  if (!r) notFound();
  if (!r.ok) return { title: "Activo" };
  const { ticker, nombre, tipo } = r.data;
  const titulo = nombre ? `${nombre} (${ticker})` : ticker;
  return {
    title: `${titulo}: precio, gráfico y noticias`,
    description: `${tipo === "cedear" ? "CEDEAR" : "Acción"} ${titulo}: precio en pesos y en dólares, gráfico histórico, rendimiento, datos clave y las últimas noticias.`,
  };
}

/** "En 2026" (desde el último cierre de 2025): no "en el año", que el gráfico usa para los últimos 12 meses. */
const etiquetasRendimiento = (anio: string): [keyof Rendimientos, string][] => [
  ["semana", "1 semana"],
  ["mes", "1 mes"],
  ["tresMeses", "3 meses"],
  ["enElAnio", `En ${anio}`],
  ["unAnio", "1 año"],
  ["cincoAnios", "5 años"],
];

export default async function FichaPage({ params }: Props) {
  const r = await cargar(params);
  if (!r) notFound();
  if (!r.ok) return <ErrorState titulo="No pudimos traer los datos de este activo." detalle={r.error} />;
  const a = r.data;
  const c = await obtenerCotizaciones();
  const mepHoy = c.ok ? (c.data.find((x) => x.id === "mep")?.venta ?? null) : null;

  const hoy = hoyAR();
  const ultima = a.velas.at(-1) ?? null;
  // ¿Hay una rueda de hoy que todavía no está en la historia? (el precio en vivo es distinto del último cierre).
  const ruedaNueva = !!(a.precio && (!ultima || (ultima.fecha < hoy && Math.abs(a.precio / ultima.cierre - 1) > 0.0005)));
  // La última rueda con máximo, mínimo y volumen es la última vela; si hay una rueda nueva, todavía no la tenemos.
  const rueda = ruedaNueva ? null : ultima;
  const anterior = ruedaNueva ? ultima : (a.velas.at(-2) ?? null);

  // Series del gráfico: los cierres, y el precio de hoy si es una rueda que todavía no está en la serie.
  const cierres = a.velas.map((v) => ({ fecha: v.fecha, cierre: v.cierre }));
  if (ruedaNueva && a.precio) cierres.push({ fecha: hoy, cierre: a.precio });
  const cierresUsd = enDolares(cierres, a.mep.map((p) => ({ fecha: p.fecha.slice(0, 10), valor: p.valor })));

  const rend = rendimientos(cierres, hoy);
  const rendUsd = rendimientos(cierresUsd, hoy);
  const unAnioAtras = sumarDias(hoy, -365);
  const rango52 = rango(a.velas, unAnioAtras);
  const vol = volatilidadAnual(a.velas);
  const caida = maximaCaida(cierres, unAnioAtras);
  const prima = a.mepImplicito && mepHoy ? primaContraMep(a.mepImplicito, mepHoy) : null;
  const nombre = a.nombre ?? a.ticker;
  const fuenteLogo = a.ticker.slice(0, 2);

  const datos: { etiqueta: string; valor: ReactNode; ayuda?: string }[] = [
    { etiqueta: "Cierre anterior", valor: anterior ? pesos(anterior.cierre, 2) : "—" },
    { etiqueta: rueda && rueda.fecha !== hoy ? `Rango de la rueda (${fechaCorta(rueda.fecha)})` : "Rango del día", valor: rueda ? `${pesos(rueda.minimo, 2)} – ${pesos(rueda.maximo, 2)}` : "—" },
    { etiqueta: "Rango de 52 semanas", valor: rango52 ? `${pesos(rango52.minimo, 2)} – ${pesos(rango52.maximo, 2)}` : "—" },
    { etiqueta: rueda && rueda.fecha !== hoy ? `Volumen (${fechaCorta(rueda.fecha)})` : "Volumen del día", valor: rueda?.volumen ? `${numero(rueda.volumen, 0)} nominales` : "—" },
    { etiqueta: "Volatilidad anual", valor: vol !== null ? porcentaje(vol, 1) : "—", ayuda: "Cuánto se mueve el precio: el desvío de las variaciones diarias del último año, anualizado." },
    { etiqueta: "Máxima caída (1 año)", valor: caida ? <span className="text-loss">{porcentaje(caida.caida, 1)}</span> : "—", ayuda: caida ? `Del ${fechaCorta(caida.pico, true)} al ${fechaCorta(caida.piso, true)}.` : undefined },
  ];
  if (a.tipo === "cedear") {
    datos.push(
      { etiqueta: "Un CEDEAR, en dólares", valor: a.precioUsd ? dolares(a.precioUsd, 2) : "—", ayuda: "Su precio en la especie en dólares (D). Un CEDEAR puede ser una fracción de la acción, por eso no coincide con el precio en EE.UU." },
      { etiqueta: "Una acción en EE.UU.", valor: a.subyacente ? <>{dolares(a.subyacente.precio, 2)} <Delta valor={a.subyacente.variacion} className="text-micro" /></> : "—", ayuda: "La acción de origen, en su mercado, con demora." },
      { etiqueta: "Dólar implícito (MEP)", valor: a.mepImplicito ? pesos(a.mepImplicito, 2) : "—", ayuda: "Lo que pagás por cada dólar al comprar este CEDEAR en pesos." },
      { etiqueta: "Dólar implícito (CCL)", valor: a.cclImplicito ? pesos(a.cclImplicito, 2) : "—" },
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={a.tipo === "cedear" ? "/mercados" : "/mercados/acciones"} className="underline decoration-border-strong decoration-dotted underline-offset-4 hover:text-text">
              {a.tipo === "cedear" ? "CEDEARs" : "Acciones"}
            </Link>
            <span aria-hidden>›</span>
            <span className="font-mono">{a.ticker}</span>
          </span>
        }
        titulo={nombre}
        bajada={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <ProviderMark activo={a.ticker} sigla={fuenteLogo} tamano={32} />
            <span>
              {a.tipo === "cedear" ? "CEDEAR" : `Acción del panel ${a.panel}`}
              {a.sector && ` · ${a.sector}`} · cotiza en BYMA
            </span>
          </span>
        }
        className="mb-8 lg:mb-12"
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <section aria-label="Precio" className="flex min-w-0 flex-col gap-4">
          {cierres.length > 1 ? (
            <GraficoActivo ticker={a.ticker} enPesos={cierres.map((p) => [p.fecha, p.cierre])} enDolares={cierresUsd.map((p) => [p.fecha, p.cierre])} />
          ) : (
            <ErrorState compacto titulo="Todavía no tenemos la historia de precios de este activo." detalle="Nuestra fuente de precios históricos (data912) no la publica. Mostramos el precio de hoy y el resto de los datos." />
          )}
          <p className="text-chico text-text-2">
            Hoy: <span className="tabular font-medium text-text">{a.precio ? pesos(a.precio, 2) : "—"}</span> <Delta valor={a.variacion} className="text-chico" />
            {a.tipo === "cedear" && prima !== null && (
              <>
                {" · "}Su dólar implícito sale{" "}
                <span className="font-medium text-text">
                  {porcentaje(Math.abs(prima), 1)} {prima >= 0 ? "más caro" : "más barato"}
                </span>{" "}
                que el MEP ({pesos(mepHoy!, 2)}).
              </>
            )}
          </p>
          {a.serieCortada && <p className="text-micro text-text-3">La serie arranca en el último cambio de ratio: antes de esa fecha los precios no son comparables con los de hoy.</p>}
        </section>

        <section aria-labelledby="datos-clave" className="flex flex-col">
          <h2 id="datos-clave" className="mb-2 text-label">
            Datos clave
          </h2>
          <dl className="border-t border-border">
            {datos.map((d) => (
              <div key={d.etiqueta} className="flex items-baseline justify-between gap-4 border-b border-border py-3">
                <dt className="text-chico text-text-2">
                  {d.etiqueta}
                  {d.ayuda && <span className="block text-micro text-text-3">{d.ayuda}</span>}
                </dt>
                <dd className="tabular shrink-0 text-right text-[15px] font-medium">{d.valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section aria-labelledby="rendimiento" className="mt-12 lg:mt-16">
        <h2 id="rendimiento" className="mb-4 text-h3">
          Rendimiento
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[15px]">
            <thead>
              <tr className="text-left text-micro text-text-3">
                <th className="pb-2 font-normal" />
                {etiquetasRendimiento(hoy.slice(0, 4)).map(([, e]) => (
                  <th key={e} className="pb-2 text-right font-normal">
                    {e}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["En pesos", rend],
                  ["En dólares MEP", rendUsd],
                ] as const
              ).map(([fila, valores]) => (
                <tr key={fila} className="border-t border-border">
                  <th scope="row" className="py-3 pr-3 text-left text-chico font-normal text-text-2">
                    {fila}
                  </th>
                  {etiquetasRendimiento(hoy.slice(0, 4)).map(([k]) => (
                    <td key={k} className="tabular py-3 text-right">
                      {valores[k] === null ? <span className="text-text-3">—</span> : <Delta valor={valores[k]} en="tabla" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 max-w-2xl text-micro text-text-3">
          En dólares, cada precio se divide por el dólar MEP de ese día: muestra si el activo le ganó a la devaluación. Rendimientos pasados, sin dividendos.
        </p>
      </section>

      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <Noticias activo={a} />
        <Acerca activo={a} />
      </div>

      {a.parecidos.length > 0 && (
        <section aria-labelledby="parecidos" className="mt-12 lg:mt-16">
          <h2 id="parecidos" className="mb-4 text-h3">
            {a.tipo === "cedear" ? `Otros CEDEARs de ${a.sector?.toLowerCase() ?? "su sector"}` : `Otras acciones del panel ${a.panel}`}
          </h2>
          <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {a.parecidos.map((p) => (
              <li key={p.ticker} className="border-t border-border">
                <Link href={`/activo/${encodeURIComponent(p.ticker)}`} className="presionable flex items-center gap-3 py-3 hover:bg-surface-2/60">
                  <ProviderMark activo={p.ticker} sigla={p.ticker.slice(0, 2)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{p.nombre ?? p.ticker}</span>
                    <span className="block font-mono text-[12px] text-text-3">{p.ticker}</span>
                  </span>
                  <span className="text-right">
                    <span className="tabular block text-[15px]">{pesos(p.precio, 2)}</span>
                    <Delta valor={p.variacion} className="text-micro" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SourceNote
        className="mt-12"
        fuentes={[FUENTES.data912, FUENTES.dolarapi, FUENTES.argentinadatos, ...(a.acerca?.fuente === "wikipedia" ? [FUENTES.wikipedia] : [])]}
        actualizado={r.asOf}
        estado={r.status}
        metodologia="/metodologia#activo"
      >
        <span aria-hidden>·</span>
        <span>Precios de BYMA con demora{a.tipo === "cedear" ? "; Estados Unidos, con demora" : ""}</span>
      </SourceNote>
      <p className="mt-4 max-w-2xl text-micro">Es información, no una recomendación de compra o venta. Los rendimientos pasados no garantizan los futuros.</p>
    </>
  );
}

function Noticias({ activo: a }: { activo: FichaActivo }) {
  const nombreMedio = (id: string) => MEDIOS.find((m) => m.id === id)?.nombre ?? id;
  return (
    <section aria-labelledby="noticias-activo" className="flex min-w-0 flex-col">
      <h2 id="noticias-activo" className="mb-4 text-h3">
        Noticias de {a.nombre ?? a.ticker}
      </h2>
      {a.noticias.length === 0 ? (
        <p className="border-t border-border py-5 text-chico text-text-2">
          No encontramos noticias de {a.nombre ?? a.ticker} en los últimos tres días en los medios que seguimos.{" "}
          <Link href="/noticias" className="underline decoration-border-strong decoration-dotted underline-offset-4 hover:text-text">
            Ver todas las noticias
          </Link>
        </p>
      ) : (
        <ol>
          {a.noticias.map((n) => (
            <li key={n.id} className="flex flex-col gap-1.5 border-t border-border py-4">
              <p className="flex items-center gap-2 text-[13px] text-text-2">
                <ProviderMark medio={n.medioId} sigla={nombreMedio(n.medioId).slice(0, 2)} tamano={20} className="rounded-[6px]" />
                <span className="font-semibold text-text">{nombreMedio(n.medioId)}</span>
                <span className="tabular">
                  {fechaCorta(n.fecha)}, {hora(n.fecha)}
                </span>
                {n.tambienEn.length > 0 && <span>· también en {n.tambienEn.length === 1 ? "otro medio" : `${n.tambienEn.length} medios`}</span>}
              </p>
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="font-display text-[18px] leading-[1.25] font-bold tracking-[-0.015em] text-pretty hover:underline hover:underline-offset-4">
                {n.titulo}
              </a>
              {n.resumen && <p className="line-clamp-2 text-chico text-text-2">{n.resumen}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Acerca({ activo: a }: { activo: FichaActivo }) {
  return (
    <section aria-labelledby="acerca" className="flex flex-col">
      <h2 id="acerca" className="mb-4 text-h3">
        {a.sector === "ETF" ? "Qué es" : "Acerca de la empresa"}
      </h2>
      <div className={cn("border-t border-border pt-4")}>
        {a.acerca ? (
          <>
            <p className="text-[15px] leading-[24px] text-text-2 text-pretty">{a.acerca.texto}</p>
            {a.acerca.fuente === "wikipedia" && a.acerca.url && (
              <p className="mt-3 text-micro text-text-3">
                Fuente:{" "}
                <a href={a.acerca.url} target="_blank" rel="noopener noreferrer" className="underline decoration-border-strong decoration-dotted underline-offset-4 hover:text-text">
                  Wikipedia
                </a>{" "}
                (CC BY-SA 4.0).
              </p>
            )}
          </>
        ) : (
          <p className="text-chico text-text-3">Todavía no tenemos una descripción de este activo.</p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-4 text-chico">
          <div>
            <dt className="text-text-3">Tipo</dt>
            <dd className="font-medium">{a.tipo === "cedear" ? "CEDEAR" : "Acción argentina"}</dd>
          </div>
          {a.sector && (
            <div>
              <dt className="text-text-3">Sector</dt>
              <dd className="font-medium">{a.sector}</dd>
            </div>
          )}
          {a.panel && (
            <div>
              <dt className="text-text-3">Panel</dt>
              <dd className="font-medium">{a.panel === "líder" ? "Líder (S&P Merval)" : "General"}</dd>
            </div>
          )}
          <div>
            <dt className="text-text-3">Ticker en BYMA</dt>
            <dd className="font-mono font-medium">{a.ticker}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

