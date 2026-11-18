import Link from "next/link";
import type { ReactNode } from "react";
import { Delta } from "@/components/ui/delta";
import { ProviderMark } from "@/components/ui/provider-mark";
import type { Rendimientos } from "@/lib/calculos";
import { MEDIOS } from "@/lib/data/adapters/medios";
import { fechaCorta, hora } from "@/lib/format";
import type { Noticia } from "@/lib/noticias";

/**
 * Piezas compartidas por todas las fichas (CEDEAR, acción, bono, letra, cripto): datos clave, tabla de rendimiento,
 * noticias, descripción y la lista de parecidos. Sin estado: se dibujan en el servidor.
 */

export type Dato = { etiqueta: string; valor: ReactNode; ayuda?: string };

/** Lista de datos clave: etiqueta a la izquierda (con una línea de ayuda), cifra a la derecha. */
export function DatosClave({ datos, titulo = "Datos clave" }: { datos: Dato[]; titulo?: string }) {
  return (
    <section aria-labelledby="datos-clave" className="flex flex-col">
      <h2 id="datos-clave" className="mb-2 text-label">
        {titulo}
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
  );
}

/** "En 2026" (desde el último cierre de 2025): no "en el año", que el gráfico usa para los últimos 12 meses. */
const etiquetas = (anio: string): [keyof Rendimientos, string][] => [
  ["semana", "1 semana"],
  ["mes", "1 mes"],
  ["tresMeses", "3 meses"],
  ["enElAnio", `En ${anio}`],
  ["unAnio", "1 año"],
  ["cincoAnios", "5 años"],
];

/** Rendimiento por período, una fila por moneda. */
export function TablaRendimiento({ filas, anio, nota }: { filas: [string, Rendimientos][]; anio: string; nota: ReactNode }) {
  const columnas = etiquetas(anio);
  return (
    <section aria-labelledby="rendimiento" className="mt-12 lg:mt-16">
      <h2 id="rendimiento" className="mb-4 text-h3">
        Rendimiento
      </h2>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[560px] text-[15px]">
          <thead>
            <tr className="text-left text-micro text-text-3">
              <th className="pb-2 font-normal" />
              {columnas.map(([, e]) => (
                <th key={e} className="pb-2 text-right font-normal">
                  {e}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(([fila, valores]) => (
              <tr key={fila} className="border-t border-border">
                <th scope="row" className="py-3 pr-3 text-left text-chico font-normal text-text-2">
                  {fila}
                </th>
                {columnas.map(([k]) => (
                  <td key={k} className="tabular py-3 text-right">
                    {valores[k] === null ? <span className="text-text-3">—</span> : <Delta valor={valores[k]} en="tabla" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 max-w-2xl text-micro text-text-3">{nota}</p>
    </section>
  );
}

/** Noticias del activo (o de su mercado), con el medio, la hora y el link a la nota. */
export function NoticiasActivo({ titulo, noticias, vacio }: { titulo: string; noticias: Noticia[]; vacio: string }) {
  const nombreMedio = (id: string) => MEDIOS.find((m) => m.id === id)?.nombre ?? id;
  return (
    <section aria-labelledby="noticias-activo" className="flex min-w-0 flex-col">
      <h2 id="noticias-activo" className="mb-4 text-h3">
        {titulo}
      </h2>
      {noticias.length === 0 ? (
        <p className="border-t border-border py-5 text-chico text-text-2">
          {vacio}{" "}
          <Link href="/noticias" className="underline decoration-border-strong decoration-dotted underline-offset-4 hover:text-text">
            Ver todas las noticias
          </Link>
        </p>
      ) : (
        <ol>
          {noticias.map((n) => (
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

/** Descripción del activo: texto (de Wikipedia, con su fuente, o propio) y una grilla de datos fijos. */
export function AcercaDe({ titulo, texto, wikipedia, fuente, datos }: { titulo: string; texto: ReactNode | null; wikipedia?: string | null; fuente?: ReactNode; datos: [string, ReactNode][] }) {
  return (
    <section aria-labelledby="acerca" className="flex flex-col">
      <h2 id="acerca" className="mb-4 text-h3">
        {titulo}
      </h2>
      <div className="border-t border-border pt-4">
        {texto ? <div className="flex flex-col gap-3 text-[15px] leading-[24px] text-text-2 text-pretty">{texto}</div> : <p className="text-chico text-text-3">Todavía no tenemos una descripción de este activo.</p>}
        {wikipedia && (
          <p className="mt-3 text-micro text-text-3">
            Fuente:{" "}
            <a href={wikipedia} target="_blank" rel="noopener noreferrer" className="underline decoration-border-strong decoration-dotted underline-offset-4 hover:text-text">
              Wikipedia
            </a>{" "}
            (CC BY-SA 4.0).
          </p>
        )}
        {fuente && <p className="mt-3 text-micro text-text-3">{fuente}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-4 text-chico">
          {datos.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-text-3">{k}</dt>
              <dd className="font-medium break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export type Parecido = { ticker: string; nombre: string | null; valor: ReactNode; detalle?: ReactNode; logo?: boolean };

/** Otros activos para comparar, cada uno con link a su ficha. */
export function Parecidos({ titulo, items }: { titulo: string; items: Parecido[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="parecidos" className="mt-12 lg:mt-16">
      <h2 id="parecidos" className="mb-4 text-h3">
        {titulo}
      </h2>
      <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <li key={p.ticker} className="border-t border-border">
            <Link href={`/activo/${encodeURIComponent(p.ticker)}`} className="presionable flex items-center gap-3 py-3 hover:bg-surface-2/60">
              {p.logo !== false && <ProviderMark activo={p.ticker} sigla={p.ticker.slice(0, 2)} />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{p.nombre ?? p.ticker}</span>
                <span className="block font-mono text-[12px] text-text-3">{p.ticker}</span>
              </span>
              <span className="text-right">
                <span className="tabular block text-[15px]">{p.valor}</span>
                {p.detalle && <span className="block text-micro">{p.detalle}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Ruta corta arriba del título: "Bonos › AL30". */
export function Ruta({ seccion, href, ticker }: { seccion: string; href: string; ticker: string }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Link href={href} className="underline decoration-border-strong decoration-dotted underline-offset-4 hover:text-text">
        {seccion}
      </Link>
      <span aria-hidden>›</span>
      <span className="font-mono">{ticker}</span>
    </span>
  );
}

export function Aviso() {
  return <p className="mt-4 max-w-2xl text-micro">Es información, no una recomendación de compra o venta. Los rendimientos pasados no garantizan los futuros.</p>;
}
