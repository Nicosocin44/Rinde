import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BarrasMensuales } from "@/components/charts/barras-mensuales";
import { Sparkline } from "@/components/charts/sparkline";
import { CifraPorcentaje } from "@/components/ui/cifra";
import { Delta } from "@/components/ui/delta";
import { ErrorState } from "@/components/ui/estados";
import { FreshnessBadge } from "@/components/ui/frescura";
import { ProviderMark } from "@/components/ui/provider-mark";
import type { Cargado, CurvaLecaps, Macro, RankingDolar } from "@/lib/data/types";
import type { Evento } from "@/lib/data/servicios/inicio";
import { diaCercano, fechaCorta, nombreMes, pesos, porcentaje } from "@/lib/format";
import { ordenarProveedores } from "@/lib/rankings/dolar";
import { cn } from "@/lib/cn";
import { CurvaMini } from "./curva-mini";

function Tarjeta({ href, titulo, children, className, pie }: { href: string; titulo: string; children: ReactNode; className?: string; pie?: ReactNode }) {
  return (
    <Link href={href} className={cn("card group presionable flex flex-col gap-5 p-5 transition-colors hover:border-border-strong lg:p-6", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{titulo}</h3>
        <span aria-hidden className="text-text-3 transition-transform duration-(--duration-short) group-hover:translate-x-0.5">
          →
        </span>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
      {pie && <div className="text-micro">{pie}</div>}
    </Link>
  );
}

export function Bento({
  ranking,
  curva,
  macro,
  eventos,
  hoy,
}: {
  ranking: Cargado<RankingDolar>;
  curva: CurvaLecaps | null;
  macro: Cargado<Macro>;
  eventos: Evento[];
  hoy: string;
}) {
  const top = ranking.ok ? ordenarProveedores(ranking.data.proveedores, "comprar").slice(0, 3) : [];
  const enCurva = curva?.letras.filter((l) => l.enCurva) ?? [];
  const m = macro.ok ? macro.data : null;
  const ultimaInfl = m?.inflacionMensual.at(-1) ?? null;
  const proxRem = m?.rem?.mensual.find((r) => ultimaInfl && r.mes > ultimaInfl.fecha.slice(0, 7)) ?? null;
  const barras = [
    ...(m?.inflacionMensual.slice(-12).map((p) => ({ mes: p.fecha.slice(0, 7), valor: p.valor })) ?? []),
    ...(m?.rem?.mensual.filter((r) => ultimaInfl && r.mes > ultimaInfl.fecha.slice(0, 7)).slice(0, 3).map((r) => ({ mes: r.mes, valor: r.valor, proyectado: true })) ?? []),
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12 lg:gap-4">
      <Tarjeta href="/dolar/comprar" titulo="Dónde comprar dólares" className="lg:col-span-5" pie={ranking.ok ? <FreshnessBadge estado={ranking.status} asOf={ranking.asOf} /> : null}>
        {top.length ? (
          <ol className="flex flex-col">
            {top.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-border py-3 first:pt-0 last:border-0 last:pb-0">
                <span className={cn("tabular w-4 text-chico", i === 0 ? "font-semibold text-accent" : "text-text-3")}>{i + 1}</span>
                <ProviderMark proveedorId={p.id} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{p.nombre}</span>
                <span className="text-right">
                  <span className="tabular block text-[15px] font-medium">{pesos(p.compras, 2)}</span>
                  <span className="block text-micro">USD 1.000: {pesos(p.costoMil)}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <ErrorState compacto titulo="No pudimos traer el ranking." />
        )}
      </Tarjeta>

      <Tarjeta href="/pesos/lecaps" titulo="Curva de LECAPs" className="lg:col-span-7" pie={enCurva.length ? `${enCurva.length} letras en la curva · TEA según el plazo` : null}>
        {enCurva.length >= 3 && curva ? (
          <div className="flex flex-1 flex-col gap-3">
            <p className="text-chico text-text-2">
              Rinden entre <span className="tabular font-medium text-text">{porcentaje(Math.min(...enCurva.map((l) => l.tea)), 1)}</span> y{" "}
              <span className="tabular font-medium text-text">{porcentaje(Math.max(...enCurva.map((l) => l.tea)), 1)}</span> TEA. A más plazo, más tasa.
            </p>
            <Suspense fallback={<div className="h-[150px]" />}>
              <CurvaMini letras={enCurva} ajuste={curva.ajuste} />
            </Suspense>
          </div>
        ) : (
          <ErrorState compacto titulo="La curva no está disponible ahora." />
        )}
      </Tarjeta>

      <Tarjeta href="/calculadoras/inflacion" titulo="Inflación" className="lg:col-span-4" pie={m?.rem ? `Fuente: INDEC vía ArgentinaDatos · expectativa: REM del BCRA (${m.rem.informe})` : "Fuente: INDEC vía ArgentinaDatos"}>
        {ultimaInfl ? (
          <div className="flex flex-1 flex-col justify-between gap-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <CifraPorcentaje fraccion={ultimaInfl.valor} decimales={1} className="text-cifra" />
                <p className="mt-1 text-chico text-text-2">en {nombreMes(ultimaInfl.fecha)}</p>
              </div>
              <div className="text-right text-chico text-text-2">
                {m?.inflacionInteranual !== null && m?.inflacionInteranual !== undefined && <p>{porcentaje(m.inflacionInteranual, 1)} interanual</p>}
                {proxRem && (
                  <p>
                    {nombreMes(`${proxRem.mes}-01`)} esperado: {porcentaje(proxRem.valor, 1)}
                  </p>
                )}
              </div>
            </div>
            <BarrasMensuales datos={barras} alto={56} />
          </div>
        ) : (
          <ErrorState compacto titulo="Sin dato de inflación." />
        )}
      </Tarjeta>

      <Tarjeta href="/bonos" titulo="Riesgo país" className="lg:col-span-4" pie={m?.riesgoPais ? `Último dato: ${fechaCorta(m.riesgoPais.fecha)} · Fuente: ArgentinaDatos` : null}>
        {m?.riesgoPais ? (
          <div className="flex flex-1 flex-col justify-between gap-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-cifra">
                  {m.riesgoPais.valor} <span className="text-[0.5em] font-medium text-text-2">puntos</span>
                </p>
                <Delta valor={m.riesgoPais.variacion} className="mt-1 text-chico" />
              </div>
              <p className="max-w-[150px] text-right text-chico text-text-2">Lo que paga Argentina por encima de EE.UU. para endeudarse.</p>
            </div>
            <Sparkline valores={m.riesgoPais.serie.slice(-90).map((p) => p.valor)} ancho={320} alto={48} relleno className="w-full" tono="neutro" />
          </div>
        ) : (
          <ErrorState compacto titulo="Sin dato de riesgo país." />
        )}
      </Tarjeta>

      <Tarjeta href="/metodologia#calendario" titulo="Próximos eventos" className="md:col-span-2 lg:col-span-4">
        {eventos.length ? (
          <ul className="flex flex-col">
            {eventos.map((e) => (
              <li key={`${e.fecha}-${e.titulo}`} className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 first:pt-0 last:border-0 last:pb-0">
                <span className="min-w-0 truncate text-[15px]">{e.titulo}</span>
                <span className="tabular shrink-0 text-chico text-text-2">{diaCercano(e.fecha, hoy)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-2">Sin eventos en los próximos meses.</p>
        )}
      </Tarjeta>
    </div>
  );
}
