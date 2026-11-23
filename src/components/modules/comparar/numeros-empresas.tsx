import type { ReactNode } from "react";
import { CATEGORICOS } from "@/components/charts/colores";
import { Delta } from "@/components/ui/delta";
import type { ActivoComparable, NumerosEmpresa } from "@/lib/data/servicios/comparar";
import { numerosDeEmpresas } from "@/lib/data/servicios/comparar";
import { mesAnio, numero, porcentaje } from "@/lib/format";
import { Etiqueta } from "@/components/ui/concepto";

/**
 * Los números de la empresa de cada CEDEAR o acción, lado a lado: PER, margen, rentabilidad, crecimiento y dividendo.
 * Va en su propio <Suspense>: el gráfico no espera a los balances. No aparece si ninguno es una empresa con balances.
 */
export async function NumerosEmpresas({ activos, tickers }: { activos: ActivoComparable[]; tickers: string[] }) {
  const numeros = await numerosDeEmpresas(activos);
  const con = activos.map((a, i) => ({ a, n: numeros[i] })).filter((x): x is { a: ActivoComparable; n: NumerosEmpresa } => x.n !== null && x.n !== undefined);
  if (con.length === 0) return null;
  const nada = <span className="text-text-3">—</span>;
  const filas: [string, string | null, (n: NumerosEmpresa) => ReactNode][] = [
    ["PER", "Precio / ganancia de 12 meses (empresas de EE.UU.)", (n) => (n.per === null ? nada : `${numero(n.per, 1)} veces`)],
    ["Margen neto", "Lo que queda de cada venta", (n) => (n.margenNeto === null ? nada : porcentaje(n.margenNeto, 1))],
    ["Rentabilidad (ROE)", "Ganancia sobre el patrimonio", (n) => (n.roe === null ? nada : porcentaje(n.roe, 1))],
    ["Crecimiento de ingresos", "Último ejercicio contra el anterior", (n) => (n.crecimientoIngresos === null ? nada : <Delta valor={n.crecimientoIngresos} decimales={1} />)],
    ["Dividendo", "Por año, sobre el precio (empresas de EE.UU.)", (n) => (n.rendimientoDividendo === null ? nada : porcentaje(n.rendimientoDividendo, 2))],
    ["Último balance", null, (n) => (n.balanceAl ? mesAnio(n.balanceAl) : nada)],
  ];
  const color = (t: string) => CATEGORICOS[Math.max(0, tickers.indexOf(t)) % CATEGORICOS.length];
  return (
    <section aria-labelledby="numeros-empresas" className="mt-12 flex flex-col gap-3">
      <h2 id="numeros-empresas" className="text-h3">
        Números de las empresas
      </h2>
      <div className="relative overflow-x-auto">
        {/* Ancho según cuántas empresas hay: con dos entra en el celular y el valor no queda lejos de su fila. */}
        <table className="w-full text-[15px]" style={{ minWidth: 150 + con.length * 95, maxWidth: 260 + con.length * 140 }}>
          <caption className="sr-only">Números de cada empresa, de sus balances</caption>
          <thead>
            <tr className="text-left text-micro text-text-3">
              <th className="sticky left-0 z-10 bg-bg pb-2 font-normal" />
              {con.map(({ a }) => (
                <th key={a.ticker} className="pb-2 text-right font-normal">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[12px] font-semibold text-text">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: color(a.ticker) }} />
                    {a.ticker}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(([nombre, ayuda, f]) => (
              <tr key={nombre} className="border-t border-border">
                <th scope="row" className="sticky left-0 z-10 max-w-[200px] min-w-[140px] bg-bg py-2.5 pr-3 text-left font-normal text-text-2">
                  <span className="text-chico">
                    <Etiqueta texto={nombre} />
                  </span>
                  {ayuda && <span className="block text-micro text-text-3">{ayuda}</span>}
                </th>
                {con.map(({ a, n }) => (
                  <td key={a.ticker} className="tabular py-2.5 pl-3 text-right whitespace-nowrap">
                    {f(n)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-micro text-text-3">De los balances que cada empresa presenta ante la CNV o la SEC. Los ETF, bonos y cripto no tienen estos números.</p>
    </section>
  );
}
