import { CalculadoraLecap } from "@/components/modules/pesos/lecaps";
import { PageHeader } from "@/components/shell/page-header";
import { Delta } from "@/components/ui/delta";
import { SourceNote } from "@/components/ui/frescura";
import { d, tasaReal } from "@/lib/calculos";
import type { FichaLetra } from "@/lib/data/servicios/fichas";
import { FUENTES, type EstadoDato } from "@/lib/data/types";
import { fechaCorta, mesAnio, numero, porcentaje } from "@/lib/format";
import { CurvaConLetra } from "./grafico";
import { AvisoActivo } from "./seguir";
import { AcercaDe, Aviso, DatosClave, NoticiasActivo, Parecidos, Ruta, type Dato } from "./partes";

/** Ficha de una LECAP o BONCAP: cuánto cobrás, cómo está en la curva, si le gana a la inflación y al plazo fijo. */
export function FichaLetraVista({ f, asOf, estado }: { f: FichaLetra; asOf: string; estado: EstadoDato }) {
  const l = f.letra;
  // Lo que gana en todo el período (precio → valor final) y contra la inflación esperada en el mismo período.
  const periodo = d(l.vf).div(l.precio).minus(1).toNumber();
  const real = f.inflacionHasta !== null ? tasaReal(periodo, f.inflacionHasta).toNumber() : null;
  const diferenciaPf = f.plazoFijo ? Math.round((l.tea - f.plazoFijo.tea) * 1000) / 10 : null;
  const nombre = `${l.tipo} ${l.ticker}`;

  const datos: Dato[] = [
    { etiqueta: "TEA", valor: porcentaje(l.tea, 2), ayuda: "Lo que rinde por año, con los intereses capitalizados." },
    { etiqueta: "TNA · TEM", valor: `${porcentaje(l.tna, 2)} · ${porcentaje(l.tem, 2)}` },
    { etiqueta: "En todo el plazo", valor: porcentaje(periodo, 2), ayuda: `Lo que ganás desde hoy hasta el ${fechaCorta(l.vencimiento, true)}.` },
    { etiqueta: "Días al vencimiento", valor: `${l.dias} días`, ayuda: "Desde la liquidación (24 h)." },
    { etiqueta: "Precio", valor: numero(l.precio, 3), ayuda: "Por cada 100 de valor nominal." },
    { etiqueta: "Valor final", valor: `${numero(l.vf, 3)}${l.vfEstimado ? " (estimado)" : ""}`, ayuda: "Lo que paga al vencimiento por cada 100 de valor nominal." },
    { etiqueta: "Variación de hoy", valor: <Delta valor={l.variacion} className="text-[15px]" /> },
    { etiqueta: "Volumen del día", valor: l.volumen ? `${numero(l.volumen / 1_000_000, 0)} M` : "—", ayuda: "Millones de valor nominal operados (data912)." },
  ];

  return (
    <>
      <PageHeader
        eyebrow={<Ruta seccion="LECAPs y BONCAPs" href="/pesos/lecaps" ticker={l.ticker} />}
        titulo={nombre}
        acciones={<AvisoActivo ticker={l.ticker} nombre={nombre} precio={l.precio} moneda="ARS" />}
        bajada={`Letra del Tesoro a tasa fija en pesos · vence el ${fechaCorta(l.vencimiento, true)} (${l.dias} días)`}
        className="mb-8 lg:mb-12"
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <section aria-label="Cuánto cobrás" className="flex min-w-0 flex-col gap-10">
          <div className="max-w-xl">
            <CalculadoraLecap l={l} liquidacion={f.curva.liquidacion} />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-label">Dónde está en la curva</h2>
            <CurvaConLetra letras={f.curva.letras.filter((x) => x.enCurva || x.ticker === l.ticker).map((x) => ({ id: x.ticker, dias: x.dias, tea: x.tea }))} ajuste={f.curva.ajuste} ticker={l.ticker} />
            <p className="text-micro">Cada punto es una letra: días al vencimiento contra TEA. La línea es la curva ajustada; si {l.ticker} está arriba, paga más que las de plazo parecido.</p>
          </div>
        </section>
        <DatosClave datos={datos} />
      </div>

      <section aria-labelledby="comparar" className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col gap-2">
          <h2 id="comparar" className="text-h3">
            ¿Le gana a la inflación?
          </h2>
          {real !== null && f.inflacionHasta !== null ? (
            <p className="max-w-xl text-[16px] leading-[25px] text-text-2">
              Hasta el vencimiento ganás <span className="tabular font-medium text-text">{porcentaje(periodo, 1)}</span> y la inflación esperada para esos días es{" "}
              <span className="tabular font-medium text-text">{porcentaje(f.inflacionHasta, 1)}</span>.{" "}
              {real >= 0 ? (
                <span className="font-medium text-gain">Le ganaría por {porcentaje(real, 1)}</span>
              ) : (
                <span className="font-medium text-loss">Perdería {porcentaje(-real, 1)} contra la inflación</span>
              )}
              , si la inflación es la que espera el mercado{f.informeRem ? ` (REM de ${/^\d{4}-\d{2}$/.test(f.informeRem) ? mesAnio(`${f.informeRem}-01`) : f.informeRem})` : ""}.
            </p>
          ) : (
            <p className="text-chico text-text-3">No tenemos la inflación esperada para comparar en este momento.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-h3">¿Y contra un plazo fijo?</h2>
          {f.plazoFijo && diferenciaPf !== null ? (
            <p className="max-w-xl text-[16px] leading-[25px] text-text-2">
              El mejor plazo fijo a {f.plazoFijo.plazoDias} días ({f.plazoFijo.nombre}) paga <span className="tabular font-medium text-text">{porcentaje(f.plazoFijo.tea, 1)} TEA</span>; {l.ticker}{" "}
              <span className="tabular font-medium text-text">{porcentaje(l.tea, 1)}</span>: {diferenciaPf === 0 ? "lo mismo." : `${numero(Math.abs(diferenciaPf), 1)} puntos ${diferenciaPf > 0 ? "más" : "menos"}.`}{" "}
              La letra se puede vender antes del vencimiento (al precio de ese día); el plazo fijo no se puede cortar.
            </p>
          ) : (
            <p className="text-chico text-text-3">No tenemos tasas de plazo fijo para comparar en este momento.</p>
          )}
        </div>
      </section>

      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <NoticiasActivo titulo="Noticias de LECAPs y tasas" noticias={f.noticias} vacio="No encontramos noticias de tasas en los últimos días." />
        <AcercaDe
          titulo={`Qué es una ${l.tipo}`}
          texto={
            <>
              <p>
                {l.tipo === "LECAP"
                  ? "Letra Capitalizable del Tesoro: un préstamo en pesos al Estado nacional, a tasa fija y de corto plazo."
                  : "Bono Capitalizable del Tesoro: como una LECAP, pero a más plazo (más de un año desde que se emite)."}{" "}
                No paga intereses en el camino: se capitalizan y cobrás todo junto al vencimiento.
              </p>
              <p>Sabés hoy cuánto vas a cobrar. Se compra en cualquier broker y se puede vender antes, al precio del mercado de ese día.</p>
            </>
          }
          datos={[
            ["Tipo", l.tipo],
            ["Vencimiento", fechaCorta(l.vencimiento, true)],
            ["Moneda", "Pesos"],
            ["Ticker en BYMA", <span key="t" className="font-mono">{l.ticker}</span>],
          ]}
        />
      </div>

      <Parecidos
        titulo="Letras de plazo parecido"
        items={f.vecinas.map((v) => ({ ticker: v.ticker, nombre: `${v.tipo} ${v.ticker}`, valor: `${porcentaje(v.tea, 1)} TEA`, detalle: <span className="text-text-3">{v.dias} días</span>, logo: false }))}
      />

      <SourceNote className="mt-12" fuentes={[FUENTES.data912, FUENTES.argentinadatos, FUENTES.bcra]} actualizado={asOf} estado={estado} metodologia="/metodologia#lecaps">
        <span aria-hidden>·</span>
        <span>Inflación esperada: REM del BCRA</span>
      </SourceNote>
      <Aviso />
    </>
  );
}
