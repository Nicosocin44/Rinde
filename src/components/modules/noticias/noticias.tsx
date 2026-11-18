"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ProviderMark } from "@/components/ui/provider-mark";
import { SegmentedControl } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/estados";
import { MERCADOS, type Mercado, type Noticia } from "@/lib/noticias";
import { cn } from "@/lib/cn";

type Medio = { id: string; nombre: string };

/** Color de cada mercado: el mismo tema que en el resto del sitio (DISENO.md §3). */
const PUNTO: Record<Mercado, string> = {
  dolar: "bg-verde",
  tasas: "bg-celeste",
  bonos: "bg-text-3",
  acciones: "bg-text-3",
  cripto: "bg-text-3",
  economia: "bg-coral",
};

function Mercados({ mercados, tickers }: { mercados: Mercado[]; tickers: string[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {mercados.map((m) => (
        <li key={m} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-2">
          <span aria-hidden className={cn("size-1.5 rounded-full", PUNTO[m])} />
          {MERCADOS.find((x) => x.id === m)?.nombre}
        </li>
      ))}
      {tickers.map((t) => (
        <li key={t}>
          <Link href={`/activo/${encodeURIComponent(t)}`} className="inline-block rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-text-2 hover:border-text-3 hover:text-text">
            {t}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Firma({ n, medios, horaTexto, horaSoloMobile = false }: { n: Noticia; medios: Medio[]; horaTexto: string; horaSoloMobile?: boolean }) {
  const nombre = (id: string) => medios.find((m) => m.id === id)?.nombre ?? id;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-text-2">
      <ProviderMark medio={n.medioId} sigla={nombre(n.medioId).slice(0, 2)} tamano={20} className="rounded-[6px]" />
      <span className="font-semibold text-text">{nombre(n.medioId)}</span>
      <span className={cn("tabular-nums", horaSoloMobile && "md:hidden")}>{horaTexto}</span>
      {n.tambienEn.length > 0 && (
        <span>
          · También en{" "}
          {n.tambienEn.map((t, i) => (
            <span key={t.medioId}>
              {i > 0 && ", "}
              <a href={t.url} target="_blank" rel="noopener noreferrer" className="underline decoration-border-strong underline-offset-2 hover:text-text">
                {nombre(t.medioId)}
              </a>
            </span>
          ))}
        </span>
      )}
    </p>
  );
}

/**
 * Lista de noticias con filtro por mercado (en la URL: /noticias?mercado=dolar). Arriba, la más importante
 * del momento (la que más medios cubren entre las últimas); abajo, todo por día y hora.
 */
export function ListaNoticias({ noticias, medios, horas, dias }: { noticias: Noticia[]; medios: Medio[]; horas: Record<string, string>; dias: Record<string, string> }) {
  const params = useSearchParams();
  const router = useRouter();
  const ruta = usePathname();
  const filtro = (params.get("mercado") as Mercado | null) ?? "todas";
  const visibles = useMemo(() => (filtro === "todas" ? noticias : noticias.filter((n) => n.mercados.includes(filtro as Mercado))), [noticias, filtro]);

  // La destacada: entre las de las últimas 12 horas (o las 12 más nuevas), la de mayor relevancia
  // (más medios que la cubren y título que habla de un mercado). Empate: la más nueva.
  const principal = useMemo(() => {
    const tope = visibles[0] ? new Date(visibles[0].fecha).getTime() - 12 * 3_600_000 : 0;
    const recientes = visibles.filter((n, i) => i < 12 || new Date(n.fecha).getTime() >= tope);
    // Con un filtro activo, la destacada tiene que hablar de ese mercado en el título.
    const puntaje = (n: Noticia) => n.relevancia + (filtro !== "todas" && n.mercadosEnTitulo.includes(filtro as Mercado) ? 6 : 0);
    return [...recientes].sort((a, b) => puntaje(b) - puntaje(a))[0] ?? null;
  }, [visibles, filtro]);
  const resto = visibles.filter((n) => n !== principal);
  const porDia = resto.reduce<{ dia: string; items: Noticia[] }[]>((acc, n) => {
    const d = dias[n.id] ?? "";
    const g = acc.at(-1);
    if (g && g.dia === d) g.items.push(n);
    else acc.push({ dia: d, items: [n] });
    return acc;
  }, []);

  const elegir = (v: string) => {
    const q = new URLSearchParams(params);
    if (v === "todas") q.delete("mercado");
    else q.set("mercado", v);
    router.replace(`${ruta}${q.size ? `?${q}` : ""}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-8 lg:gap-12">
      <div className="sin-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <SegmentedControl
          etiqueta="Filtrar por mercado"
          tamano="sm"
          valor={filtro}
          onChange={elegir}
          opciones={[{ valor: "todas", etiqueta: "Todas" }, ...MERCADOS.map((m) => ({ valor: m.id, etiqueta: m.nombre }))]}
        />
      </div>

      {!principal ? (
        <EmptyState titulo="No hay noticias de este mercado en los últimos tres días." ayuda="Probá con otro filtro o volvé más tarde." />
      ) : (
        <>
          <article className="grid gap-4 border-y border-border py-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14 lg:py-10">
            <div className="flex flex-col gap-4">
              <Firma n={principal} medios={medios} horaTexto={`${dias[principal.id] === "Hoy" ? "" : `${dias[principal.id]}, `}${horas[principal.id]}`} />
              <h2 className="font-display text-[30px] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance md:text-[44px] lg:text-[52px]">
                <a href={principal.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:decoration-2 hover:underline-offset-[6px]">
                  {principal.titulo}
                </a>
              </h2>
            </div>
            <div className="flex flex-col justify-end gap-4">
              {principal.resumen && <p className="text-[16px] leading-[25px] text-text-2 lg:text-[17px] lg:leading-[27px]">{principal.resumen}</p>}
              <Mercados mercados={principal.mercados} tickers={principal.tickers} />
            </div>
          </article>

          <div className="flex flex-col gap-10">
            {porDia.map((g) => (
              <section key={g.dia} aria-label={g.dia} className="flex flex-col">
                <h2 className="sticky top-[60px] z-10 bg-bg/90 py-2 font-display text-[19px] font-bold tracking-[-0.02em] backdrop-blur-sm lg:top-[92px]">{g.dia}</h2>
                <ol>
                  {g.items.map((n) => (
                    <li key={n.id} className="grid grid-cols-[minmax(0,1fr)] gap-2 border-t border-border py-5 md:grid-cols-[64px_minmax(0,1fr)] md:gap-6">
                      <span className="hidden pt-1 font-display text-[15px] font-bold tabular-nums text-text-2 md:block">{horas[n.id]}</span>
                      <div className="flex min-w-0 flex-col gap-2">
                        <Firma n={n} medios={medios} horaTexto={horas[n.id] ?? ""} horaSoloMobile />
                        <h3 className="max-w-[68ch] text-[18px] leading-[24px] font-semibold tracking-[-0.01em] text-pretty md:text-[19px] md:leading-[26px]">
                          <a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:underline-offset-4">
                            {n.titulo}
                          </a>
                        </h3>
                        {n.resumen && <p className="max-w-[72ch] text-[15px] leading-[22px] text-text-2">{n.resumen}</p>}
                        <Mercados mercados={n.mercados} tickers={n.tickers} />
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
