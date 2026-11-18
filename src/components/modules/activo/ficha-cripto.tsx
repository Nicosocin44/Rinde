import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { SourceNote } from "@/components/ui/frescura";
import { ProviderMark } from "@/components/ui/provider-mark";
import { aPesos, hoyAR, maximaCaida, primaContraMep, rango, rendimientos, sumarDias, volatilidadAnual, type Vela } from "@/lib/calculos";
import type { FichaCripto } from "@/lib/data/servicios/fichas";
import { FUENTES, type EstadoDato } from "@/lib/data/types";
import { dolares, fechaCorta, numero, pesos, porcentaje } from "@/lib/format";
import { GraficoActivo, type SerieGrafico } from "./grafico";
import { AcercaDe, Aviso, DatosClave, NoticiasActivo, Parecidos, Ruta, TablaRendimiento, type Dato } from "./partes";

const OTRAS: { ticker: string; nombre: string }[] = [
  { ticker: "BTC", nombre: "Bitcoin" },
  { ticker: "ETH", nombre: "Ether" },
  { ticker: "USDT", nombre: "Tether (USDT)" },
  { ticker: "USDC", nombre: "USD Coin (USDC)" },
];

/** Cripto opera todos los días: la volatilidad se anualiza con 365. */
const DIAS_CRIPTO = 365;

/** Ficha de BTC, ETH, USDT o USDC: precio, gráfico, dónde comprar más barato, rendimiento y noticias. */
export function FichaCriptoVista({ f, asOf, estado }: { f: FichaCripto; asOf: string; estado: EstadoDato }) {
  const c = f.cripto;
  const hoy = hoyAR();
  const estable = c.simbolo === "USDT" || c.simbolo === "USDC";
  const unAnioAtras = sumarDias(hoy, -365);

  // BTC y ETH: la serie en dólares (Binance) y en pesos (× dólar cripto de cada día).
  // USDT y USDC: valen un dólar; lo que se mueve es su precio en pesos, el dólar cripto.
  const cierresUsd = f.velasUsd.map((v) => ({ fecha: v.fecha, cierre: v.cierre }));
  const dolarCripto = f.dolarCripto.map((p) => ({ fecha: p.fecha, valor: p.valor }));
  const cierresArs = estable ? dolarCripto.map((p) => ({ fecha: p.fecha, cierre: p.valor })) : aPesos(cierresUsd, dolarCripto);
  const velasBase: Vela[] = estable ? cierresArs.map((p) => ({ ...p, apertura: p.cierre, maximo: p.cierre, minimo: p.cierre, volumen: 0 })) : f.velasUsd;
  const base = estable ? cierresArs : cierresUsd;
  const fmt = (x: number) => (estable ? pesos(x, 2) : dolares(x, 0));
  // BTC y ETH: el precio en dólares de referencia es el de Binance (mercado global). El promedio en dólares de los
  // exchanges locales viene con sobreprecio y no coincide con el gráfico.
  const precioUsd = !estable && cierresUsd.length ? cierresUsd.at(-1)!.cierre : c.precioUsd;

  const rango52 = rango(velasBase, unAnioAtras);
  const vol = volatilidadAnual(base, DIAS_CRIPTO, DIAS_CRIPTO);
  const caida = maximaCaida(base, unAnioAtras);
  const brecha = estable && f.mep ? primaContraMep(c.precioArs, f.mep) : null;

  const series: SerieGrafico[] = estable
    ? [{ id: "ars", etiqueta: "En pesos", titulo: `${c.simbolo} en pesos (dólar cripto)`, moneda: "$", serie: cierresArs.map((p) => [p.fecha, p.cierre]) }]
    : [
        { id: "usd", etiqueta: "En dólares", titulo: `${c.simbolo} en dólares`, moneda: "US$", serie: cierresUsd.map((p) => [p.fecha, p.cierre]) },
        { id: "ars", etiqueta: "En pesos", titulo: `${c.simbolo} en pesos`, moneda: "$", serie: cierresArs.map((p) => [p.fecha, p.cierre]) },
      ];

  const datos: Dato[] = [
    { etiqueta: "Precio en pesos", valor: pesos(c.precioArs, estable ? 2 : 0), ayuda: "Mediana entre exchanges, con comisiones." },
    { etiqueta: "Precio en dólares", valor: precioUsd ? dolares(precioUsd, estable ? 4 : 0) : "—", ayuda: estable ? undefined : "En Binance, el mercado global de referencia." },
    ...(brecha !== null && f.mep
      ? [{ etiqueta: "Contra el dólar MEP", valor: `${brecha >= 0 ? "+" : "−"}${porcentaje(Math.abs(brecha), 1)}`, ayuda: `El MEP está a ${pesos(f.mep, 2)}: comprar ${c.simbolo} sale ${brecha >= 0 ? "más caro" : "más barato"}.` }]
      : []),
    { etiqueta: "Rango de 52 semanas", valor: rango52 ? `${fmt(rango52.minimo)} – ${fmt(rango52.maximo)}` : "—" },
    { etiqueta: "Volatilidad anual", valor: vol !== null ? porcentaje(vol, 1) : "—", ayuda: "Desvío de las variaciones diarias del último año, anualizado (365 días)." },
    { etiqueta: "Máxima caída (1 año)", valor: caida ? <span className="text-loss">{porcentaje(caida.caida, 1)}</span> : "—", ayuda: caida ? `Del ${fechaCorta(caida.pico, true)} al ${fechaCorta(caida.piso, true)}.` : undefined },
  ];
  const baratos = [...c.exchanges].sort((a, b) => a.compras - b.compras).slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow={<Ruta seccion="Cripto" href="/mercados/cripto" ticker={c.simbolo} />}
        titulo={c.nombre}
        bajada={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <ProviderMark activo={c.simbolo} sigla={c.simbolo.slice(0, 2)} tamano={32} />
            <span>{estable ? "Stablecoin: una moneda digital que vale un dólar" : "Criptomoneda"} · se compra en exchanges y billeteras</span>
          </span>
        }
        className="mb-8 lg:mb-12"
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <section aria-label="Precio" className="flex min-w-0 flex-col gap-4">
          <GraficoActivo series={series} />
          <p className="text-chico text-text-2">
            Hoy: <span className="tabular font-medium text-text">{pesos(c.precioArs, estable ? 2 : 0)}</span>
            {precioUsd && !estable && <> · {dolares(precioUsd, 0)} en Binance</>}
          </p>
        </section>
        <DatosClave datos={datos} />
      </div>

      {baratos.length > 0 && (
        <section aria-labelledby="donde-comprar" className="mt-12 lg:mt-16">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="donde-comprar" className="text-h3">
              Dónde comprar más barato
            </h2>
            <Link href={estable ? `/dolar/comprar?activo=${c.simbolo}` : "/mercados/cripto"} className="text-chico text-text-2 underline decoration-border-strong decoration-dotted underline-offset-4 hover:text-text">
              Ver el ranking completo
            </Link>
          </div>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[480px] text-[15px]">
              <thead>
                <tr className="text-left text-micro text-text-3">
                  <th className="pb-2 font-normal">Exchange</th>
                  <th className="pb-2 text-right font-normal">Comprás a</th>
                  <th className="pb-2 text-right font-normal">Vendés a</th>
                  <th className="pb-2 text-right font-normal">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {baratos.map((e, i) => (
                  <tr key={e.id} className={i === 0 ? "border-t border-border bg-accent-soft" : "border-t border-border"}>
                    <td className="py-3 pr-3">
                      <span className="flex items-center gap-2.5">
                        <ProviderMark proveedorId={e.id} sigla={e.nombre.slice(0, 2)} tamano={24} />
                        <span className="font-medium">{e.nombre}</span>
                      </span>
                    </td>
                    <td className="tabular py-3 text-right font-medium">{pesos(e.compras, estable ? 2 : 0)}</td>
                    <td className="tabular py-3 text-right text-text-2">{pesos(e.vendes, estable ? 2 : 0)}</td>
                    <td className="tabular py-3 text-right text-text-2">{porcentaje(e.spread, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-micro text-text-3">Precios finales con comisiones, según CriptoYa. Ordenado solo por precio de compra.</p>
        </section>
      )}

      <TablaRendimiento
        anio={hoy.slice(0, 4)}
        filas={
          estable
            ? [["En pesos", rendimientos(cierresArs, hoy)]]
            : [
                ["En dólares", rendimientos(cierresUsd, hoy)],
                ["En pesos", rendimientos(cierresArs, hoy)],
              ]
        }
        nota={
          estable
            ? "Variación de su precio en pesos (el dólar cripto). En dólares, una stablecoin no sube ni baja."
            : "En pesos, cada precio en dólares se multiplica por el dólar cripto de ese día. La historia en dólares llega hasta unos 2 años y 9 meses."
        }
      />

      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <NoticiasActivo titulo={`Noticias de ${estable ? "cripto y stablecoins" : c.nombre}`} noticias={f.noticias} vacio="No hay noticias de cripto en los últimos tres días en los medios que seguimos." />
        <AcercaDe
          titulo="Qué es"
          texto={f.acerca ? <p>{f.acerca.texto}</p> : null}
          wikipedia={f.acerca?.url ?? null}
          datos={[
            ["Tipo", estable ? "Stablecoin" : "Criptomoneda"],
            ["Símbolo", <span key="s" className="font-mono">{c.simbolo}</span>],
            ["Exchanges con precio", numero(c.exchanges.length, 0)],
          ]}
        />
      </div>

      <Parecidos titulo="Otras cripto" items={OTRAS.filter((o) => o.ticker !== c.simbolo).map((o) => ({ ticker: o.ticker, nombre: o.nombre, valor: "Ver ficha" }))} />

      <SourceNote
        className="mt-12"
        fuentes={[FUENTES.criptoya, ...(estable ? [] : [FUENTES.binance]), FUENTES.argentinadatos, ...(f.acerca ? [FUENTES.wikipedia] : [])]}
        actualizado={asOf}
        estado={estado}
        metodologia="/metodologia#activo"
      >
        <span aria-hidden>·</span>
        <span>{estable ? "Historia: dólar cripto (ArgentinaDatos)" : "Historia en dólares: Binance; en pesos, × dólar cripto"}</span>
      </SourceNote>
      <Aviso />
    </>
  );
}
