import { PageHeader } from "@/components/shell/page-header";
import { Delta } from "@/components/ui/delta";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { ProviderMark } from "@/components/ui/provider-mark";
import { enDolares, hoyAR, maximaCaida, primaContraMep, rango, rendimientos, sumarDias, volatilidadAnual } from "@/lib/calculos";
import type { FichaActivo } from "@/lib/data/servicios/activo";
import { FUENTES, type EstadoDato } from "@/lib/data/types";
import { dolares, fechaCorta, numero, pesos, porcentaje } from "@/lib/format";
import { GraficoActivo } from "./grafico";
import { AcercaDe, Aviso, DatosClave, NoticiasActivo, Parecidos, Ruta, TablaRendimiento, type Dato } from "./partes";

/** Ficha de un CEDEAR o una acción argentina. */
export function FichaAccion({ a, mepHoy, asOf, estado }: { a: FichaActivo; mepHoy: number | null; asOf: string; estado: EstadoDato }) {
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

  const unAnioAtras = sumarDias(hoy, -365);
  const rango52 = rango(a.velas, unAnioAtras);
  const vol = volatilidadAnual(a.velas);
  const caida = maximaCaida(cierres, unAnioAtras);
  const prima = a.mepImplicito && mepHoy ? primaContraMep(a.mepImplicito, mepHoy) : null;
  const nombre = a.nombre ?? a.ticker;

  const datos: Dato[] = [
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
        eyebrow={<Ruta seccion={a.tipo === "cedear" ? "CEDEARs" : "Acciones"} href={a.tipo === "cedear" ? "/mercados" : "/mercados/acciones"} ticker={a.ticker} />}
        titulo={nombre}
        bajada={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <ProviderMark activo={a.ticker} sigla={a.ticker.slice(0, 2)} tamano={32} />
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
            <GraficoActivo
              series={[
                { id: "ars", etiqueta: "En pesos", titulo: `${a.ticker} en pesos`, moneda: "$", serie: cierres.map((p) => [p.fecha, p.cierre]) },
                { id: "usd", etiqueta: "En dólares", titulo: `${a.ticker} en dólares MEP`, moneda: "US$", serie: cierresUsd.map((p) => [p.fecha, p.cierre]) },
              ]}
            />
          ) : (
            <ErrorState compacto titulo="Todavía no tenemos la historia de precios de este activo." detalle="Nuestra fuente de precios históricos (data912) no la publica. Mostramos el precio de hoy y el resto de los datos." />
          )}
          <p className="text-chico text-text-2">
            Hoy: <span className="tabular font-medium text-text">{a.precio ? pesos(a.precio, 2) : "—"}</span> <Delta valor={a.variacion} className="text-chico" />
            {a.tipo === "cedear" && prima !== null && mepHoy && (
              <>
                {" · "}Su dólar implícito sale{" "}
                <span className="font-medium text-text">
                  {porcentaje(Math.abs(prima), 1)} {prima >= 0 ? "más caro" : "más barato"}
                </span>{" "}
                que el MEP ({pesos(mepHoy, 2)}).
              </>
            )}
          </p>
          {a.serieCortada && <p className="text-micro text-text-3">La serie arranca en el último cambio de ratio: antes de esa fecha los precios no son comparables con los de hoy.</p>}
        </section>
        <DatosClave datos={datos} />
      </div>

      <TablaRendimiento
        anio={hoy.slice(0, 4)}
        filas={[
          ["En pesos", rendimientos(cierres, hoy)],
          ["En dólares MEP", rendimientos(cierresUsd, hoy)],
        ]}
        nota="En dólares, cada precio se divide por el dólar MEP de ese día: muestra si el activo le ganó a la devaluación. Rendimientos pasados, sin dividendos."
      />

      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <NoticiasActivo titulo={`Noticias de ${nombre}`} noticias={a.noticias} vacio={`No encontramos noticias de ${nombre} en los últimos tres días en los medios que seguimos.`} />
        <AcercaDe
          titulo={a.sector === "ETF" ? "Qué es" : "Acerca de la empresa"}
          texto={a.acerca ? <p>{a.acerca.texto}</p> : null}
          wikipedia={a.acerca?.fuente === "wikipedia" ? a.acerca.url : null}
          datos={[
            ["Tipo", a.tipo === "cedear" ? "CEDEAR" : "Acción argentina"],
            ...(a.sector ? ([["Sector", a.sector]] as [string, string][]) : []),
            ...(a.panel ? ([["Panel", a.panel === "líder" ? "Líder (S&P Merval)" : "General"]] as [string, string][]) : []),
            ["Ticker en BYMA", <span key="t" className="font-mono">{a.ticker}</span>],
          ]}
        />
      </div>

      <Parecidos
        titulo={a.tipo === "cedear" ? `Otros CEDEARs de ${a.sector?.toLowerCase() ?? "su sector"}` : `Otras acciones del panel ${a.panel}`}
        items={a.parecidos.map((p) => ({ ticker: p.ticker, nombre: p.nombre, valor: pesos(p.precio, 2), detalle: <Delta valor={p.variacion} className="text-micro" /> }))}
      />

      <SourceNote
        className="mt-12"
        fuentes={[FUENTES.data912, FUENTES.dolarapi, FUENTES.argentinadatos, ...(a.acerca?.fuente === "wikipedia" ? [FUENTES.wikipedia] : [])]}
        actualizado={asOf}
        estado={estado}
        metodologia="/metodologia#activo"
      >
        <span aria-hidden>·</span>
        <span>Precios de BYMA con demora{a.tipo === "cedear" ? "; Estados Unidos, con demora" : ""}</span>
      </SourceNote>
      <Aviso />
    </>
  );
}
