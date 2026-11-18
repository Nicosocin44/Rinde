import Link from "next/link";
import type { ReactNode } from "react";
import { Delta } from "@/components/ui/delta";
import { valuar, type FilaAnual, type ResumenBalances } from "@/lib/calculos";
import { obtenerBalances } from "@/lib/data";
import { dolares, fechaCorta, mesAnio, numero, pesosCompacto, porcentaje } from "@/lib/format";
import { DatosClave, type Dato } from "./partes";

/**
 * Balances y resultados de la empresa, de lo que presenta ante la SEC: ingresos, ganancia, márgenes, crecimiento,
 * flujo de caja, el último balance y, si se puede, los múltiplos con el precio de hoy. Va en su propio <Suspense>: la
 * ficha se muestra sin esperarlo.
 */
export async function BalancesEmpresa({
  ticker,
  tipo,
  sector,
  nombre,
  precioAccionUsd,
}: {
  ticker: string;
  tipo: "cedear" | "accion";
  sector: string | null;
  nombre: string;
  /** Precio de una acción en EE.UU. (CEDEAR), para los múltiplos. */
  precioAccionUsd: number | null;
}) {
  const r = await obtenerBalances(ticker, tipo, sector);
  if (!r.ok || !r.data.resumen) return null;
  const b = r.data.resumen;
  // Múltiplos solo con balances en dólares de una empresa de EE.UU. (10-K) y el precio de una acción: en los ADR un
  // papel puede ser varias acciones, y en pesos el precio de hoy contra un balance de hace meses engaña.
  const v = b.moneda === "USD" && b.formularioAnual.startsWith("10-K") && precioAccionUsd ? valuar(b, precioAccionUsd) : null;
  const m = (x: number | null) => (x === null ? "—" : pesosCompacto(x, simbolo(b.moneda)));
  const ultimoAnual = b.anuales.at(-1)!;
  const anioUltimo = etiquetaEjercicio(ultimoAnual.fin);
  const doce = b.ultimos12;
  const etiquetaDoce = doce?.fuente === "trimestres" ? "últimos 12 meses" : `ejercicio ${anioUltimo}`;

  const tarjetas: { etiqueta: string; valor: ReactNode; detalle: ReactNode }[] = [];
  if (!b.financiera) {
    tarjetas.push({
      etiqueta: `Ingresos · ${etiquetaDoce}`,
      valor: m(doce?.ingresos ?? null),
      detalle:
        b.crecimiento.ingresos !== null ? (
          <>
            <Delta valor={b.crecimiento.ingresos} decimales={1} className="text-micro" /> en el ejercicio {anioUltimo}
          </>
        ) : (
          "Lo que vendió"
        ),
    });
  }
  tarjetas.push({
    etiqueta: `Ganancia neta · ${etiquetaDoce}`,
    valor: <span className={doce?.gananciaNeta !== null && (doce?.gananciaNeta ?? 0) < 0 ? "text-loss" : undefined}>{m(doce?.gananciaNeta ?? null)}</span>,
    detalle:
      b.margenNeto !== null ? (
        b.margenNeto >= 0 ? `Se queda con ${porcentaje(b.margenNeto, 1)} de lo que vende` : `Pierde ${porcentaje(-b.margenNeto, 1)} de lo que vende`
      ) : b.crecimiento.gananciaNeta !== null ? (
        <>
          <Delta valor={b.crecimiento.gananciaNeta} decimales={1} className="text-micro" /> en el ejercicio {anioUltimo}
        </>
      ) : (
        "Lo que ganó después de impuestos"
      ),
  });
  if (v?.per) tarjetas.push({ etiqueta: "PER (precio / ganancia)", valor: `${numero(v.per, 1)} veces`, detalle: `Su precio equivale a ${numero(v.per, 0)} años de la ganancia actual` });
  else if (b.roe !== null) tarjetas.push({ etiqueta: "Rentabilidad sobre el patrimonio", valor: porcentaje(b.roe, 1), detalle: "Ganancia sobre lo que pusieron los accionistas (ROE)" });
  if (v?.rendimientoDividendo) tarjetas.push({ etiqueta: "Dividendo", valor: `${porcentaje(v.rendimientoDividendo, 2)} al año`, detalle: `${dolares(ultimoAnual.dividendoPorAccion!, 2)} por acción en el ejercicio ${anioUltimo}` });
  else if (ultimoAnual.flujoLibre !== null) tarjetas.push({ etiqueta: `Flujo de caja libre · ${anioUltimo}`, valor: m(ultimoAnual.flujoLibre), detalle: "Lo que le queda después de invertir en el negocio" });
  else if (b.endeudamiento !== null) tarjetas.push({ etiqueta: "Pasivos / patrimonio", valor: `${numero(b.endeudamiento, 1)} veces`, detalle: "Cuánto debe por cada peso de los accionistas" });

  const balance: Dato[] = [];
  if (b.balance) {
    const x = b.balance;
    balance.push({ etiqueta: "Activos", valor: m(x.activos), ayuda: "Todo lo que tiene" }, { etiqueta: "Pasivos", valor: m(x.pasivos), ayuda: "Todo lo que debe" }, { etiqueta: "Patrimonio", valor: m(x.patrimonio), ayuda: "Lo que es de los accionistas" });
    if (x.caja !== null) balance.push({ etiqueta: "Caja", valor: m(x.caja), ayuda: "Efectivo y equivalentes" });
    if (x.deuda !== null) balance.push({ etiqueta: "Deuda financiera", valor: m(x.deuda) });
  }
  if (b.endeudamiento !== null) balance.push({ etiqueta: "Pasivos / patrimonio", valor: `${numero(b.endeudamiento, 2)} veces` });
  if (b.margenOperativo !== null) balance.push({ etiqueta: `Margen operativo · ${anioUltimo}`, valor: porcentaje(b.margenOperativo, 1), ayuda: "Ganancia del negocio antes de intereses e impuestos, sobre ventas" });
  if (v) {
    balance.push({ etiqueta: "Capitalización", valor: pesosCompacto(v.capitalizacion, "US$"), ayuda: "Precio de hoy × acciones" });
    if (v.precioVentas !== null) balance.push({ etiqueta: "Precio / ventas", valor: `${numero(v.precioVentas, 1)} veces` });
    if (v.precioValorLibro !== null) balance.push({ etiqueta: "Precio / valor libro", valor: `${numero(v.precioValorLibro, 1)} veces` });
  }

  const periodo = b.ultimo.formulario.startsWith("10-Q") || (b.ultimo.formulario.startsWith("6-K") && b.ultimo.fin !== ultimoAnual.fin) ? "trimestre" : "ejercicio";

  return (
    <section aria-labelledby="balances" className="mt-12 lg:mt-16">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="balances" className="text-h3">
          Balances y resultados
        </h2>
        <p className="text-micro text-text-3">
          Último balance: {periodo} al {fechaCorta(b.ultimo.fin, true)} · presentado el {fechaCorta(b.ultimo.presentado, true)}
        </p>
      </div>

      {b.desactualizado && (
        <p className="mb-4 max-w-3xl rounded-(--radius-card) bg-surface-2 px-4 py-3 text-chico text-text-2">
          <span className="font-semibold text-text">Ojo, es un balance viejo.</span> Es el último que {nombre} cargó en la SEC con sus números en formato de datos.
          {tipo === "accion" ? " Las empresas argentinas presentan sus balances más nuevos en la CNV y en la Bolsa de Buenos Aires." : " Algunas empresas extranjeras los cargan con atraso."}
        </p>
      )}

      <ul className={`grid grid-cols-2 gap-3 ${tarjetas.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {tarjetas.map((t) => (
          <li key={t.etiqueta} className="flex flex-col gap-1 rounded-(--radius-card) border border-border bg-surface px-4 py-3.5">
            <span className="text-micro text-text-2">{t.etiqueta}</span>
            <span className="tabular font-display text-[22px] leading-tight font-bold tracking-[-0.02em] lg:text-[26px]">{t.valor}</span>
            <span className="text-micro text-text-2">{t.detalle}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-label">{b.financiera ? "Ganancia por ejercicio" : "Ingresos y ganancia por ejercicio"}</h3>
            <Leyenda financiera={b.financiera} conPerdidas={b.anuales.some((a) => (a.gananciaNeta ?? 0) < 0)} />
          </div>
          <BarrasResultados anuales={b.anuales} moneda={b.moneda} financiera={b.financiera} />
        </div>
        {balance.length > 0 && <DatosClave titulo={b.balance ? `Balance al ${fechaCorta(b.balance.fecha, true)}` : "Balance"} datos={balance} />}
      </div>

      <div className="solo-pro mt-10">
        <TablaAnual b={b} />
      </div>

      <p className="mt-4 max-w-3xl text-micro text-text-3">
        {b.moneda === "USD" ? "En dólares" : b.moneda === "ARS" ? "En pesos" : `En la moneda del balance (${b.moneda})`}, tal como la empresa los presenta ante la SEC
        {b.ajustadoPorInflacion ? ", ajustados por inflación a la fecha del balance: por eso solo comparamos ejercicios que vienen en el mismo balance" : ""}.
        {doce?.fuente === "trimestres" ? " Últimos 12 meses: la suma de los últimos cuatro trimestres." : ""}
        {v ? ` Los múltiplos usan el precio de hoy de una acción en EE.UU. (${dolares(precioAccionUsd!, 2)}).` : ""} En modo Pro ves la tabla completa.{" "}
        <Link href="/metodologia#balances" className="underline decoration-dotted underline-offset-4 hover:text-text-2">
          Cómo lo calculamos
        </Link>
        .
      </p>
    </section>
  );
}

const simbolo = (moneda: string) => (moneda === "USD" ? "US$" : moneda === "ARS" ? "$" : moneda === "EUR" ? "€" : moneda);

/** `2025` si el ejercicio cierra en diciembre; si no, `sep 2026`. */
function etiquetaEjercicio(fin: string): string {
  return fin.slice(5, 7) === "12" ? fin.slice(0, 4) : mesAnio(fin);
}

function Leyenda({ financiera, conPerdidas }: { financiera: boolean; conPerdidas: boolean }) {
  return (
    <p className="flex items-center gap-4 text-micro text-text-2" aria-hidden>
      {!financiera && (
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-text-3/50" /> Ingresos
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] bg-gain" /> Ganancia
      </span>
      {conPerdidas && (
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-loss" /> Pérdida
        </span>
      )}
    </p>
  );
}

/**
 * Barras por ejercicio: ingresos (gris) y ganancia neta (verde, o roja si es pérdida, por debajo de la línea del cero).
 * HTML y CSS, sin JS: cada barra lleva su valor escrito para quien no ve el gráfico.
 */
function BarrasResultados({ anuales, moneda, financiera }: { anuales: FilaAnual[]; moneda: string; financiera: boolean }) {
  const valores = anuales.flatMap((a) => [financiera ? null : a.ingresos, a.gananciaNeta]).filter((x): x is number => x !== null);
  if (valores.length === 0) return null;
  const maxPos = Math.max(0, ...valores);
  const maxNeg = Math.max(0, ...valores.map((x) => -x));
  const total = maxPos + maxNeg || 1;
  const cero = (maxNeg / total) * 100;
  const alto = (x: number) => `${Math.max(0.8, (Math.abs(x) / total) * 100)}%`;
  const fmt = (x: number | null) => (x === null ? "sin dato" : pesosCompacto(x, simbolo(moneda)));
  return (
    <div>
      <div className="relative h-44 border-b border-border lg:h-52">
        {maxNeg > 0 && <div aria-hidden className="absolute inset-x-0 border-t border-border-strong" style={{ bottom: `${cero}%` }} />}
        <ul className="absolute inset-0 flex items-stretch justify-around gap-2">
          {anuales.map((a) => (
            <li key={a.fin} className="relative flex flex-1 items-stretch justify-center gap-1" aria-label={`${etiquetaEjercicio(a.fin)}: ${financiera ? "" : `ingresos ${fmt(a.ingresos)}, `}ganancia neta ${fmt(a.gananciaNeta)}`}>
              {!financiera && (
                <span className="relative w-full max-w-7">
                  {a.ingresos !== null && <span className="absolute inset-x-0 rounded-t-[4px] bg-text-3/50" style={{ bottom: `${cero}%`, height: alto(a.ingresos) }} />}
                </span>
              )}
              <span className="relative w-full max-w-7">
                {a.gananciaNeta !== null &&
                  (a.gananciaNeta >= 0 ? (
                    <span className="absolute inset-x-0 rounded-t-[4px] bg-gain" style={{ bottom: `${cero}%`, height: alto(a.gananciaNeta) }} />
                  ) : (
                    <span className="absolute inset-x-0 rounded-b-[4px] bg-loss" style={{ top: `${100 - cero}%`, height: alto(a.gananciaNeta) }} />
                  ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <ul aria-hidden className="mt-2 flex justify-around gap-2">
        {anuales.map((a) => (
          <li key={a.fin} className="flex flex-1 flex-col items-center text-center">
            <span className="text-micro font-semibold text-text">{etiquetaEjercicio(a.fin)}</span>
            {!financiera && <span className="tabular text-[11px] text-text-3">{a.ingresos !== null ? pesosCompacto(a.ingresos, "").trim() : "—"}</span>}
            <span className={`tabular text-[11px] ${a.gananciaNeta !== null && a.gananciaNeta < 0 ? "text-loss" : "text-text-2"}`}>{a.gananciaNeta !== null ? pesosCompacto(a.gananciaNeta, "").trim() : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Modo Pro: todo, ejercicio por ejercicio. */
function TablaAnual({ b }: { b: ResumenBalances }) {
  const m = (x: number | null) => (x === null ? <span className="text-text-3">—</span> : pesosCompacto(x, simbolo(b.moneda)));
  const filas: [string, (a: FilaAnual) => ReactNode][] = [
    ["Ingresos", (a) => m(a.ingresos)],
    ["Ganancia operativa", (a) => m(a.gananciaOperativa)],
    ["Ganancia neta", (a) => m(a.gananciaNeta)],
    ["Margen neto", (a) => (a.margenNeto === null ? <span className="text-text-3">—</span> : porcentaje(a.margenNeto, 1))],
    ["Ganancia por acción", (a) => (a.bpa === null ? <span className="text-text-3">—</span> : `${simbolo(b.moneda)} ${numero(a.bpa, 2)}`)],
    ["Dividendo por acción", (a) => (a.dividendoPorAccion === null ? <span className="text-text-3">—</span> : `${simbolo(b.moneda)} ${numero(a.dividendoPorAccion, 2)}`)],
    ["Flujo de caja operativo", (a) => m(a.flujoOperativo)],
    ["Inversión en bienes de uso", (a) => m(a.inversion)],
    ["Flujo de caja libre", (a) => m(a.flujoLibre)],
  ];
  const visibles = filas.filter(([, f]) => b.anuales.some((a) => {
    const x = f(a);
    return typeof x === "string";
  }));
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[560px] text-[15px]">
        <caption className="sr-only">Resultados por ejercicio</caption>
        <thead>
          <tr className="text-left text-micro text-text-3">
            <th className="pb-2 font-normal">Ejercicio</th>
            {b.anuales.map((a) => (
              <th key={a.fin} className="pb-2 text-right font-normal">
                {etiquetaEjercicio(a.fin)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibles.map(([nombre, f]) => (
            <tr key={nombre} className="border-t border-border">
              <th scope="row" className="py-3 pr-3 text-left text-chico font-normal text-text-2">
                {nombre}
              </th>
              {b.anuales.map((a) => (
                <td key={a.fin} className="tabular py-3 text-right">
                  {f(a)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
