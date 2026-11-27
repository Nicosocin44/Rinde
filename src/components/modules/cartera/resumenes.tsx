"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { proveedorPorId } from "@data/ar/proveedores";
import { ProviderMark } from "@/components/ui/provider-mark";
import type { Activo, PosicionValuada } from "@/lib/calculos/cartera";
import type { ResumenCobros, ResumenComisiones } from "@/lib/cartera/resumenes";
import type { NoticiaDeCartera } from "@/lib/data/servicios/noticias-activo";
import { dinero, dolares, fechaCorta, hora, pesos, porcentaje } from "@/lib/format";

/** Bloques de la columna de Mi cartera: comisiones, cobros y noticias. */

const Logo = ({ activo }: { activo: Activo }) => <ProviderMark proveedorId={activo.proveedorId ?? activo.ticker ?? activo.id} activo={activo.ticker} sigla={activo.ticker ? activo.ticker.slice(0, 2) : undefined} />;

function Titulo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-h3">
      {children}
    </h2>
  );
}

// ───────────────────────── Comisiones ─────────────────────────

export function ComisionesCartera({ resumen }: { resumen: ResumenComisiones | null }) {
  if (!resumen) return null;
  const broker = resumen.masBarato ? proveedorPorId(resumen.masBarato.proveedorId) : undefined;
  return (
    <section aria-labelledby="titulo-comisiones" className="flex flex-col gap-5" data-testid="comisiones-cartera">
      <Titulo id="titulo-comisiones">Comisiones</Titulo>
      {resumen.operaciones === 0 ? (
        <p className="border-t border-border pt-4 text-chico text-text-2">
          Tus operaciones no tienen la comisión cargada. Si importás los movimientos de tu broker (o cargás la comisión de cada una), te mostramos cuánto pagás y cuánto pagarías en el más barato.
        </p>
      ) : (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <div>
            <p className="tabular text-cifra">{pesos(resumen.total)}</p>
            <p className="mt-1 text-chico text-text-2">
              en comisiones y derechos, en {resumen.operaciones === 1 ? "1 operación" : `${resumen.operaciones} operaciones`}: el <span className="tabular font-medium text-text">{porcentaje(resumen.total / resumen.operado, 2)}</span> de lo que operaste.
              {resumen.esteAnio > 0 && resumen.esteAnio < resumen.total && (
                <>
                  {" "}
                  Este año, <span className="tabular font-medium text-text">{pesos(resumen.esteAnio)}</span>.
                </>
              )}
            </p>
          </div>
          {resumen.masBarato && broker && (
            <div className="flex items-start gap-3 rounded-(--radius-card) bg-accent-soft px-3.5 py-3">
              <ProviderMark proveedorId={broker.id} tamano={28} />
              <p className="text-chico text-text-2">
                En <span className="font-medium text-text">{broker.nombre}</span> habrías pagado unos <span className="tabular font-medium text-text">{pesos(resumen.masBarato.total)}</span>:{" "}
                <span className="tabular font-medium text-gain">{pesos(resumen.total - resumen.masBarato.total)} menos</span>. Con su tarifa para quien recién empieza, el IVA y los mismos derechos de mercado.
              </p>
            </div>
          )}
          {resumen.sinComision > 0 && <p className="text-micro">{resumen.sinComision === 1 ? "1 operación no tiene" : `${resumen.sinComision} operaciones no tienen`} la comisión cargada: no se cuenta.</p>}
        </div>
      )}
      <Link href="/mercados/brokers" className="inline-flex items-center gap-1 self-start text-chico font-medium text-accent hover:underline">
        Comparar las comisiones de los brokers
        <ArrowUpRight aria-hidden className="size-3.5" />
      </Link>
    </section>
  );
}

// ───────────────────────── Dividendos y cupones ─────────────────────────

export function CobrosCartera({ resumen }: { resumen: ResumenCobros | null }) {
  const montos = (m: { ARS: number; USD: number }) => [m.ARS > 0 && pesos(m.ARS), m.USD > 0 && dolares(m.USD)].filter(Boolean).join(" y ");
  return (
    <section aria-labelledby="titulo-cobros" className="flex flex-col gap-5" data-testid="cobros-cartera">
      <Titulo id="titulo-cobros">Dividendos y cupones</Titulo>
      {!resumen ? (
        <p className="border-t border-border pt-4 text-chico text-text-2">Todavía no cargaste cobros. Cuando cobres un dividendo o un cupón, cargalo (o importalo de tu broker) y lo ves acá.</p>
      ) : (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <p className="text-chico text-text-2">
            Este año cobraste <span className="tabular font-medium text-text">{montos(resumen.esteAnio) || pesos(0)}</span>
            {montos(resumen.total) !== montos(resumen.esteAnio) && (
              <>
                ; desde que empezaste, <span className="tabular font-medium text-text">{montos(resumen.total)}</span>
              </>
            )}
            .
          </p>
          <ul className="border-t border-border">
            {resumen.porActivo.slice(0, 5).map((g) => (
              <li key={g.activoId} className="flex items-center gap-3 border-b border-border py-3">
                <Logo activo={g.activo} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{g.activo.nombre}</span>
                  <span className="block text-chico text-text-3">
                    {g.cobros === 1 ? "1 cobro" : `${g.cobros} cobros`} · el último, el {fechaCorta(g.ultimo, true)}
                  </span>
                </span>
                <span className="tabular text-[15px] font-medium">{dinero(g.monto, g.activo.moneda)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ───────────────────────── Noticias de lo que tenés ─────────────────────────

/** Los instrumentos más grandes de la cartera (hasta 4), como "cedear:NVDA": lo único que se manda para buscar noticias. */
export function idsParaNoticias(posiciones: PosicionValuada[]): string[] {
  return [...posiciones]
    .filter((p) => p.activo.ticker && ["cedear", "accion", "bono", "lecap", "cripto"].includes(p.activo.tipo))
    .sort((a, b) => b.valorArs.toNumber() - a.valorArs.toNumber())
    .slice(0, 4)
    .map((p) => `${p.activo.tipo}:${p.activo.ticker}`);
}

export function NoticiasCartera({ ids }: { ids: string[] }) {
  const clave = ids.join(",");
  const [estado, setEstado] = useState<{ clave: string; noticias: NoticiaDeCartera[] | null; error: boolean }>({ clave: "", noticias: null, error: false });

  useEffect(() => {
    if (!clave) return;
    let vigente = true;
    fetch(`/api/cartera/noticias?ids=${encodeURIComponent(clave)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { noticias: NoticiaDeCartera[] }) => vigente && setEstado({ clave, noticias: j.noticias, error: false }))
      .catch(() => vigente && setEstado({ clave, noticias: [], error: true }));
    return () => {
      vigente = false;
    };
  }, [clave]);

  if (!clave) return null;
  const cargando = estado.clave !== clave;
  const noticias = cargando ? null : estado.noticias;

  return (
    <section aria-labelledby="titulo-noticias-cartera" className="flex min-w-0 flex-col gap-5" data-testid="noticias-cartera">
      <Titulo id="titulo-noticias-cartera">Noticias de lo que tenés</Titulo>
      {noticias === null ? (
        <ul className="border-t border-border" aria-busy="true" aria-label="Buscando noticias">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex flex-col gap-2 border-b border-border py-4">
              <span className="h-3 w-32 animate-pulse rounded bg-surface-2" />
              <span className="h-4 w-full animate-pulse rounded bg-surface-2" />
            </li>
          ))}
        </ul>
      ) : noticias.length === 0 ? (
        <p className="border-t border-border pt-4 text-chico text-text-2">
          {estado.error ? "No pudimos traer las noticias ahora. Probá en un rato." : "No hay noticias de tus activos en estos días."}{" "}
          <Link href="/noticias" className="underline decoration-border-strong decoration-dotted underline-offset-4 hover:text-text">
            Ver todas las noticias
          </Link>
        </p>
      ) : (
        <ol className="border-t border-border lg:grid lg:grid-cols-2 lg:gap-x-16">
          {/* Como en la sección Noticias: el medio y la hora arriba, el título grande y el ticker con borde, que lleva a su ficha. */}
          {noticias.map((n) => (
            <li key={n.id} className="flex flex-col gap-2 border-b border-border py-5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-text-2">
                <ProviderMark medio={n.medioId} sigla={n.medio.slice(0, 2)} tamano={20} className="rounded-[6px]" />
                <span className="font-semibold text-text">{n.medio}</span>
                <span className="tabular-nums">
                  {fechaCorta(n.fecha)}, {hora(n.fecha)}
                </span>
              </p>
              <h3 className="text-[18px] leading-[24px] font-semibold tracking-[-0.01em] text-pretty">
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:underline-offset-4">
                  {n.titulo}
                </a>
              </h3>
              <Link
                href={`/activo/${encodeURIComponent(n.ticker)}`}
                className="self-start rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-text-2 hover:border-text-3 hover:text-text"
              >
                {n.ticker}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
