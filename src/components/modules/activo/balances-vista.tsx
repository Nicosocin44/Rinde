"use client";

import { useState } from "react";
import { Delta } from "@/components/ui/delta";
import { SegmentedControl } from "@/components/ui/segmented";
import type { Clave, Estados } from "@/lib/calculos/balances";
import { cn } from "@/lib/cn";
import { mesAnio, numero, pesosCompacto, porcentaje } from "@/lib/format";

/**
 * La parte interactiva de "Balances y resultados": trimestral o anual, el gráfico de ingresos y ganancia, y los tres
 * estados contables completos (resultados, balance y flujo de efectivo) con la variación interanual.
 */

type Fila = { clave: Clave | "margenNeto"; etiqueta: string; ayuda?: string; tipo?: "monto" | "porAccion" | "acciones" | "porcentaje"; destacada?: boolean };

const RESULTADOS: Fila[] = [
  { clave: "ingresos", etiqueta: "Ingresos", ayuda: "Lo que vendió", destacada: true },
  { clave: "costoVentas", etiqueta: "Costo de ventas" },
  { clave: "gananciaBruta", etiqueta: "Ganancia bruta", ayuda: "Ingresos − costo de ventas" },
  { clave: "investigacion", etiqueta: "Investigación y desarrollo" },
  { clave: "gastosComerciales", etiqueta: "Gastos comerciales y de administración" },
  { clave: "gananciaOperativa", etiqueta: "Ganancia operativa", ayuda: "Lo que deja el negocio, antes de intereses e impuestos", destacada: true },
  { clave: "ebitda", etiqueta: "EBITDA", ayuda: "Ganancia operativa + amortizaciones" },
  { clave: "intereses", etiqueta: "Intereses de la deuda" },
  { clave: "gananciaAntesImpuestos", etiqueta: "Ganancia antes de impuestos" },
  { clave: "impuestos", etiqueta: "Impuesto a las ganancias" },
  { clave: "gananciaNeta", etiqueta: "Ganancia neta", ayuda: "Lo que queda para los accionistas", destacada: true },
  { clave: "margenNeto", etiqueta: "Margen neto", tipo: "porcentaje", ayuda: "Ganancia neta / ingresos" },
  { clave: "bpa", etiqueta: "Ganancia por acción", tipo: "porAccion", ayuda: "Diluida, si la informa" },
  { clave: "dividendoPorAccion", etiqueta: "Dividendo por acción", tipo: "porAccion" },
  { clave: "acciones", etiqueta: "Acciones", tipo: "acciones", ayuda: "Promedio diluido, en millones" },
];

const BALANCE: Fila[] = [
  { clave: "caja", etiqueta: "Caja y equivalentes" },
  { clave: "inversionesCortoPlazo", etiqueta: "Inversiones de corto plazo" },
  { clave: "cuentasPorCobrar", etiqueta: "Cuentas por cobrar" },
  { clave: "inventarios", etiqueta: "Inventarios" },
  { clave: "activoCorriente", etiqueta: "Activo corriente", ayuda: "Lo que se convierte en plata en menos de un año", destacada: true },
  { clave: "bienesDeUso", etiqueta: "Bienes de uso", ayuda: "Plantas, oficinas, equipos" },
  { clave: "llaveDeNegocio", etiqueta: "Llave de negocio", ayuda: "Lo que pagó de más al comprar otras empresas" },
  { clave: "intangibles", etiqueta: "Intangibles" },
  { clave: "activos", etiqueta: "Activo total", ayuda: "Todo lo que tiene", destacada: true },
  { clave: "cuentasPorPagar", etiqueta: "Cuentas por pagar" },
  { clave: "deudaCorriente", etiqueta: "Deuda de corto plazo" },
  { clave: "pasivoCorriente", etiqueta: "Pasivo corriente", ayuda: "Lo que tiene que pagar en menos de un año", destacada: true },
  { clave: "deudaNoCorriente", etiqueta: "Deuda de largo plazo" },
  { clave: "pasivos", etiqueta: "Pasivo total", ayuda: "Todo lo que debe", destacada: true },
  { clave: "deudaTotal", etiqueta: "Deuda financiera total" },
  { clave: "patrimonio", etiqueta: "Patrimonio", ayuda: "Activo − pasivo: lo que es de los accionistas", destacada: true },
];

const FLUJO: Fila[] = [
  { clave: "flujoOperativo", etiqueta: "Flujo de las operaciones", ayuda: "La plata que generó el negocio", destacada: true },
  { clave: "depreciacion", etiqueta: "Amortizaciones" },
  { clave: "inversion", etiqueta: "Inversión en bienes de uso", ayuda: "Compra de plantas y equipos" },
  { clave: "flujoLibre", etiqueta: "Flujo de caja libre", ayuda: "Operaciones − inversión en bienes de uso", destacada: true },
  { clave: "flujoInversion", etiqueta: "Flujo de inversión" },
  { clave: "flujoFinanciacion", etiqueta: "Flujo de financiación" },
  { clave: "dividendosPagados", etiqueta: "Dividendos pagados" },
  { clave: "recompras", etiqueta: "Recompra de acciones" },
];

const ESTADOS = { resultados: RESULTADOS, balance: BALANCE, flujo: FLUJO } as const;
type QueEstado = keyof typeof ESTADOS;

const simbolo = (moneda: string) => (moneda === "USD" ? "US$" : moneda === "ARS" ? "$" : moneda === "EUR" ? "€" : moneda);

/** `2025` si el ejercicio cierra en diciembre; si no, `sep 2026`. Trimestres: el mes de cierre, `sep 2026`. */
const etiquetaPeriodo = (fin: string, anual: boolean) => (anual && fin.slice(5, 7) === "12" ? fin.slice(0, 4) : mesAnio(fin));

/** El período comparable: el anterior en anual, el de un año antes en trimestral (cuatro antes). */
function comparable(e: Estados, anual: boolean): number | null {
  const n = e.periodos.length - 1;
  if (n < 1) return null;
  if (anual) return n - 1;
  const fin = Date.parse(e.periodos[n]!.fin);
  const k = e.periodos.findIndex((p) => {
    const dias = (fin - Date.parse(p.fin)) / 86_400_000;
    return dias >= 350 && dias <= 380;
  });
  return k < 0 ? null : k;
}

function valoresDe(e: Estados, clave: Fila["clave"]): (number | null)[] {
  if (clave === "margenNeto") return e.valores.gananciaNeta.map((g, k) => (g === null || !e.valores.ingresos[k] ? null : g / e.valores.ingresos[k]!));
  return e.valores[clave];
}

export function ResultadosEmpresa({ moneda, anual, trimestral, financiera }: { moneda: string; anual: Estados; trimestral: Estados | null; financiera: boolean }) {
  const [periodicidad, setPeriodicidad] = useState<"trimestral" | "anual">(trimestral ? "trimestral" : "anual");
  const [estado, setEstado] = useState<QueEstado>("resultados");
  const esAnual = periodicidad === "anual" || !trimestral;
  const e = esAnual ? anual : trimestral!;
  const ultimo = e.periodos.length - 1;
  const comp = comparable(e, esAnual);
  const m = (x: number | null) => (x === null ? "—" : pesosCompacto(x, simbolo(moneda)));

  return (
    <div className="mt-10 flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-h3">{financiera ? "Ganancia" : "Ingresos y ganancia"}</h3>
          {trimestral && (
            <SegmentedControl
              etiqueta="Por trimestre o por ejercicio"
              tamano="sm"
              valor={periodicidad}
              onChange={setPeriodicidad}
              opciones={[
                { valor: "trimestral", etiqueta: "Trimestral" },
                { valor: "anual", etiqueta: "Anual" },
              ]}
            />
          )}
        </div>
        <p className="max-w-3xl text-chico text-text-2">
          {esAnual ? `Ejercicio ${etiquetaPeriodo(e.periodos[ultimo]!.fin, true)}` : `Trimestre cerrado en ${mesAnio(e.periodos[ultimo]!.fin)}`}:{" "}
          {!financiera && (
            <>
              ingresos <span className="tabular font-medium text-text">{m(e.valores.ingresos[ultimo] ?? null)}</span>
              {comp !== null && <Variacion nuevo={e.valores.ingresos[ultimo] ?? null} viejo={e.valores.ingresos[comp] ?? null} />}
              {" · "}
            </>
          )}
          ganancia neta <span className={cn("tabular font-medium", (e.valores.gananciaNeta[ultimo] ?? 0) < 0 ? "text-loss" : "text-text")}>{m(e.valores.gananciaNeta[ultimo] ?? null)}</span>
          {comp !== null && <Variacion nuevo={e.valores.gananciaNeta[ultimo] ?? null} viejo={e.valores.gananciaNeta[comp] ?? null} />}
          {comp !== null && <span className="text-text-3"> contra {esAnual ? "el ejercicio anterior" : `el mismo trimestre de ${e.periodos[comp]!.fin.slice(0, 4)}`}</span>}.
        </p>
        <Barras e={e} anual={esAnual} moneda={moneda} financiera={financiera} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-h3">Estados contables</h3>
          <SegmentedControl
            etiqueta="Qué estado contable"
            tamano="sm"
            valor={estado}
            onChange={setEstado}
            opciones={[
              { valor: "resultados", etiqueta: "Resultados" },
              { valor: "balance", etiqueta: "Balance" },
              { valor: "flujo", etiqueta: "Flujo de caja" },
            ]}
          />
        </div>
        <Tabla e={e} anual={esAnual} moneda={moneda} filas={ESTADOS[estado]} comp={comp} />
      </div>
    </div>
  );
}

function Variacion({ nuevo, viejo }: { nuevo: number | null; viejo: number | null }) {
  if (nuevo === null || viejo === null || viejo <= 0) return null;
  return (
    <>
      {" "}
      <Delta valor={nuevo / viejo - 1} decimales={1} className="text-chico" />
    </>
  );
}

/** Tabla de un estado: una columna por período, la última con la variación interanual. Montos en millones. */
function Tabla({ e, anual, moneda, filas, comp }: { e: Estados; anual: boolean; moneda: string; filas: Fila[]; comp: number | null }) {
  const visibles = filas.filter((f) => valoresDe(e, f.clave).some((x) => x !== null));
  const montos = visibles.filter((f) => !f.tipo || f.tipo === "monto").flatMap((f) => valoresDe(e, f.clave).filter((x): x is number => x !== null));
  const decimales = Math.max(0, ...montos.map(Math.abs)) < 1e8 ? 1 : 0;
  const ultimo = e.periodos.length - 1;
  const celda = (f: Fila, x: number | null) => {
    if (x === null) return <span className="text-text-3">—</span>;
    if (f.tipo === "porcentaje") return porcentaje(x, 1);
    if (f.tipo === "porAccion") return numero(x, 2);
    if (f.tipo === "acciones") return numero(x / 1e6, 0);
    return <span className={x < 0 ? "text-loss" : undefined}>{numero(x / 1e6, decimales)}</span>;
  };
  if (visibles.length === 0) return <p className="text-chico text-text-2">La empresa no cargó este estado en la SEC con sus números en formato de datos.</p>;
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[640px] text-[14px]">
        <caption className="sr-only">Estado contable, {anual ? "por ejercicio" : "por trimestre"}, en millones de {simbolo(moneda)}</caption>
        <thead>
          <tr className="text-left text-micro text-text-3">
            <th className="sticky left-0 z-10 bg-bg pr-3 pb-2 font-normal">Millones de {simbolo(moneda)}</th>
            {e.periodos.map((p) => (
              <th key={p.fin} className="pb-2 pl-3 text-right font-normal whitespace-nowrap">
                {etiquetaPeriodo(p.fin, anual)}
              </th>
            ))}
            {comp !== null && <th className="pb-2 pl-4 text-right font-normal whitespace-nowrap">{anual ? "Contra el anterior" : "Interanual"}</th>}
          </tr>
        </thead>
        <tbody>
          {visibles.map((f) => {
            const v = valoresDe(e, f.clave);
            return (
              <tr key={f.clave} className="border-t border-border">
                <th scope="row" className={cn("sticky left-0 z-10 max-w-[220px] min-w-[150px] bg-bg py-2.5 pr-3 text-left font-normal", f.destacada ? "font-semibold text-text" : "text-text-2")}>
                  {f.etiqueta}
                  {f.ayuda && <span className="block text-[11px] font-normal text-text-3">{f.ayuda}</span>}
                </th>
                {v.map((x, k) => (
                  <td key={e.periodos[k]!.fin} className={cn("tabular py-2.5 pl-3 text-right whitespace-nowrap", f.destacada && "font-semibold")}>
                    {celda(f, x)}
                  </td>
                ))}
                {comp !== null && (
                  <td className="py-2.5 pl-4 text-right">
                    {f.tipo === "porcentaje" ? (
                      v[ultimo] !== null && v[comp] !== null ? <Delta valor={v[ultimo]! - v[comp]!} tipo="puntos" decimales={1} className="text-micro" /> : <span className="text-text-3">—</span>
                    ) : v[ultimo] !== null && v[comp] !== null && v[comp]! > 0 ? (
                      <Delta valor={v[ultimo]! / v[comp]! - 1} decimales={1} className="text-micro" />
                    ) : (
                      <span className="text-text-3">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {e.periodos.some((p) => p.derivado) && (
        <p className="mt-2 text-micro text-text-3">Los trimestres de cierre de ejercicio (y el flujo de cada trimestre) salen de restar acumulados: las empresas no los informan por separado.</p>
      )}
    </div>
  );
}

/**
 * Barras por período: ingresos (gris) y ganancia neta (verde, o roja por debajo del cero si es pérdida). HTML y CSS:
 * cada período lleva su valor escrito para quien no ve el gráfico.
 */
function Barras({ e, anual, moneda, financiera }: { e: Estados; anual: boolean; moneda: string; financiera: boolean }) {
  const ingresos = e.valores.ingresos;
  const ganancia = e.valores.gananciaNeta;
  const valores = [...(financiera ? [] : ingresos), ...ganancia].filter((x): x is number => x !== null);
  if (valores.length === 0) return null;
  const maxPos = Math.max(0, ...valores);
  const maxNeg = Math.max(0, ...valores.map((x) => -x));
  const total = maxPos + maxNeg || 1;
  const cero = (maxNeg / total) * 100;
  const alto = (x: number) => `${Math.max(0.8, (Math.abs(x) / total) * 100)}%`;
  const fmt = (x: number | null) => (x === null ? "sin dato" : pesosCompacto(x, simbolo(moneda)));
  const conPerdidas = ganancia.some((x) => (x ?? 0) < 0);
  return (
    <div>
      <p className="mb-2 flex flex-wrap items-center gap-4 text-micro text-text-2" aria-hidden>
        {!financiera && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-text-3/50" /> Ingresos
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-gain" /> Ganancia neta
        </span>
        {conPerdidas && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-loss" /> Pérdida
          </span>
        )}
      </p>
      <div className="relative h-44 border-b border-border lg:h-52">
        {maxNeg > 0 && <div aria-hidden className="absolute inset-x-0 border-t border-border-strong" style={{ bottom: `${cero}%` }} />}
        <ul className="absolute inset-0 flex items-stretch justify-around gap-1.5 sm:gap-2">
          {e.periodos.map((p, k) => {
            const ing = ingresos[k] ?? null;
            const gan = ganancia[k] ?? null;
            return (
              <li key={p.fin} className="relative flex flex-1 items-stretch justify-center gap-0.5 sm:gap-1" aria-label={`${etiquetaPeriodo(p.fin, anual)}: ${financiera ? "" : `ingresos ${fmt(ing)}, `}ganancia neta ${fmt(gan)}`}>
                {!financiera && <span className="relative w-full max-w-7">{ing !== null && <span className="absolute inset-x-0 rounded-t-[4px] bg-text-3/50" style={{ bottom: `${cero}%`, height: alto(ing) }} />}</span>}
                <span className="relative w-full max-w-7">
                  {gan !== null &&
                    (gan >= 0 ? (
                      <span className="absolute inset-x-0 rounded-t-[4px] bg-gain" style={{ bottom: `${cero}%`, height: alto(gan) }} />
                    ) : (
                      <span className="absolute inset-x-0 rounded-b-[4px] bg-loss" style={{ top: `${100 - cero}%`, height: alto(gan) }} />
                    ))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <ul aria-hidden className="mt-2 flex justify-around gap-1.5 sm:gap-2">
        {e.periodos.map((p, k) => (
          <li key={p.fin} className="flex min-w-0 flex-1 flex-col items-center text-center">
            {/* En el celular, el mes y el año en dos renglones (ocho trimestres no entran en uno). */}
            <span className="text-[11px] leading-tight font-semibold text-text sm:hidden">
              {etiquetaPeriodo(p.fin, anual)
                .split(/\s+/)
                .map((x) => (
                  <span key={x} className="block">
                    {x}
                  </span>
                ))}
            </span>
            <span className="hidden text-micro font-semibold whitespace-nowrap text-text sm:block">{etiquetaPeriodo(p.fin, anual)}</span>
            {!financiera && <span className="tabular hidden text-[11px] text-text-3 sm:block">{ingresos[k] != null ? pesosCompacto(ingresos[k], "").trim() : "—"}</span>}
            <span className={cn("tabular hidden text-[11px] sm:block", (ganancia[k] ?? 0) < 0 ? "text-loss" : "text-text-2")}>{ganancia[k] != null ? pesosCompacto(ganancia[k], "").trim() : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
