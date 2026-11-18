import Link from "next/link";
import type { ReactNode } from "react";
import { SUBYACENTES_OPCIONES } from "@data/ar/opciones";
import { PageHeader } from "@/components/shell/page-header";
import { Delta } from "@/components/ui/delta";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { ProviderMark } from "@/components/ui/provider-mark";
import { ratioAproximado } from "@/lib/activos/perfil";
import { d, enDolares, hoyAR, maximaCaida, primaContraMep, rango, rendimientos, sumarDias, velasEnOtraMoneda, volatilidadAnual, compactar } from "@/lib/calculos";
import type { FichaActivo } from "@/lib/data/servicios/activo";
import { FUENTES, type EstadoDato } from "@/lib/data/types";
import { dolares, fechaCorta, numero, pesos, pesosCompacto, porcentaje } from "@/lib/format";
import { SeguirActivo } from "./seguir";
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
  const p = a.perfil;
  // Sector: el nuestro (curado) o, si no lo tenemos, la industria que informa Wikidata.
  const industria = p?.industrias[0] ? p.industrias[0].charAt(0).toUpperCase() + p.industrias[0].slice(1) : null;
  const sector = a.sector ?? industria;
  const ratio = a.tipo === "cedear" ? ratioAproximado(a.subyacente?.precio ?? null, a.precioUsd) : null;
  const sinHistoria = cierres.length < 2;
  const rendPesos = rendimientos(cierres, hoy);
  const rendUsd = rendimientos(cierresUsd, hoy);
  const hayRendimiento = [...Object.values(rendPesos), ...Object.values(rendUsd)].some((x) => x !== null);

  const datos: Dato[] = [
    {
      etiqueta: "Cierre anterior",
      // Sin historia, sale del precio y la variación del día: precio / (1 + variación).
      valor: anterior ? pesos(anterior.cierre, 2) : a.precio && a.variacion !== null ? pesos(d(a.precio).div(d(1).plus(a.variacion)).toNumber(), 2) : "—",
    },
    { etiqueta: rueda && rueda.fecha !== hoy ? `Rango de la rueda (${fechaCorta(rueda.fecha)})` : "Rango del día", valor: rueda ? `${pesos(rueda.minimo, 2)} – ${pesos(rueda.maximo, 2)}` : "—" },
    { etiqueta: "Rango de 52 semanas", valor: rango52 ? `${pesos(rango52.minimo, 2)} – ${pesos(rango52.maximo, 2)}` : "—" },
    {
      etiqueta: rueda && rueda.fecha !== hoy ? `Volumen (${fechaCorta(rueda.fecha)})` : "Volumen del día",
      valor: rueda?.volumen ? `${numero(rueda.volumen, 0)} nominales` : a.hoy?.nominales ? `${numero(a.hoy.nominales, 0)} nominales` : "—",
    },
    ...(a.hoy && (a.hoy.compra || a.hoy.venta)
      ? [{ etiqueta: "Puntas: compra / venta", valor: `${a.hoy.compra ? pesos(a.hoy.compra, 2) : "—"} / ${a.hoy.venta ? pesos(a.hoy.venta, 2) : "—"}`, ayuda: "La mejor oferta para comprar y para vender en BYMA ahora." }]
      : []),
    ...(a.hoy?.operaciones ? [{ etiqueta: "Operaciones del día", valor: numero(a.hoy.operaciones, 0) }] : []),
    { etiqueta: "Volatilidad anual", valor: vol !== null ? porcentaje(vol, 1) : "—", ayuda: "Cuánto se mueve el precio: el desvío de las variaciones diarias del último año, anualizado." },
    { etiqueta: "Máxima caída (1 año)", valor: caida ? <span className="text-loss">{porcentaje(caida.caida, 1)}</span> : "—", ayuda: caida ? `Del ${fechaCorta(caida.pico, true)} al ${fechaCorta(caida.piso, true)}.` : undefined },
  ];
  if (a.tipo === "cedear") {
    datos.push(
      { etiqueta: "Un CEDEAR, en dólares", valor: a.precioUsd ? dolares(a.precioUsd, 2) : "—", ayuda: "Su precio en la especie en dólares (D). Un CEDEAR puede ser una fracción de la acción, por eso no coincide con el precio en EE.UU." },
      { etiqueta: "Una acción en EE.UU.", valor: a.subyacente ? <>{dolares(a.subyacente.precio, 2)} <Delta valor={a.subyacente.variacion} className="text-micro" /></> : "—", ayuda: "La acción de origen, en su mercado, con demora." },
      { etiqueta: "Dólar implícito (MEP)", valor: a.mepImplicito ? pesos(a.mepImplicito, 2) : "—", ayuda: "Lo que pagás por cada dólar al comprar este CEDEAR en pesos." },
      { etiqueta: "Dólar implícito (CCL)", valor: a.cclImplicito ? pesos(a.cclImplicito, 2) : "—" },
      ...(ratio ? [{ etiqueta: "Ratio (aproximado)", valor: `${numero(ratio, 0)} CEDEARs = 1 acción`, ayuda: "Calculado con el precio en EE.UU. y el del CEDEAR en dólares." }] : []),
      ...(a.subyacente?.volumen ? [{ etiqueta: "Volumen en EE.UU.", valor: `${pesosCompacto(a.subyacente.volumen, "").trim()} acciones` }] : []),
    );
  }

  const datosEmpresa: [string, ReactNode][] = [["Tipo", a.tipo === "cedear" ? "CEDEAR" : "Acción argentina"]];
  if (sector) datosEmpresa.push([a.sector ? "Sector" : "Industria", sector]);
  if (a.panel) datosEmpresa.push(["Panel", a.panel === "líder" ? "Líder (S&P Merval)" : "General"]);
  if (p?.sede || p?.pais) datosEmpresa.push(["Sede", [p.sede, p.pais].filter(Boolean).join(", ")]);
  if (p?.fundacion) datosEmpresa.push(["Fundada", String(p.fundacion)]);
  if (p?.empleados) datosEmpresa.push(["Empleados", `${numero(p.empleados.cantidad, 0)}${p.empleados.fecha ? ` (${p.empleados.fecha.slice(0, 4)})` : ""}`]);
  if (p?.web)
    datosEmpresa.push([
      "Sitio web",
      <a key="w" href={p.web} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-border-strong decoration-dotted underline-offset-4 hover:text-text">
        {p.web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
      </a>,
    ]);
  if (a.tipo === "cedear" && p?.bolsa) datosEmpresa.push(["Cotiza en EE.UU.", p.bolsa]);
  datosEmpresa.push(["Ticker en BYMA", <span key="t" className="font-mono">{a.ticker}</span>]);

  return (
    <>
      <PageHeader
        eyebrow={<Ruta seccion={a.tipo === "cedear" ? "CEDEARs" : "Acciones"} href={a.tipo === "cedear" ? "/mercados" : "/mercados/acciones"} ticker={a.ticker} />}
        titulo={nombre}
        acciones={a.precio ? <SeguirActivo ticker={a.ticker} nombre={nombre} precio={a.precio} moneda="ARS" /> : undefined}
        bajada={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <ProviderMark activo={a.ticker} sigla={a.ticker.slice(0, 2)} tamano={32} />
            <span>
              {a.tipo === "cedear" ? "CEDEAR" : `Acción del panel ${a.panel}`}
              {sector && ` · ${sector}`} · cotiza en BYMA
              {a.tipo === "cedear" && p?.bolsa && p.bolsa !== "Bolsa de Buenos Aires" && ` y en EE.UU. en ${p.bolsa}`}
            </span>
          </span>
        }
        className="mb-8 lg:mb-12"
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <section aria-label="Precio" className="flex min-w-0 flex-col gap-4">
          {sinHistoria && (
            <div className="flex flex-col gap-1">
              <p className="text-label">{a.ticker} en pesos</p>
              <p className="tabular text-hero">{a.precio ? pesos(a.precio, 2) : "—"}</p>
              <Delta valor={a.variacion} className="text-chico" />
            </div>
          )}
          {!sinHistoria ? (
            <GraficoActivo
              series={[
                { id: "ars", etiqueta: "En pesos", titulo: `${a.ticker} en pesos`, moneda: "$", serie: cierres.map((p) => [p.fecha, p.cierre]), velas: compactar(a.velas), variacionDia: a.variacion },
                {
                  id: "usd",
                  etiqueta: "En dólares",
                  titulo: `${a.ticker} en dólares MEP`,
                  moneda: "US$",
                  serie: cierresUsd.map((p) => [p.fecha, p.cierre]),
                  velas: compactar(velasEnOtraMoneda(a.velas, a.mep.map((p) => ({ fecha: p.fecha.slice(0, 10), valor: p.valor })), "dividir")),
                },
              ]}
            />
          ) : (
            <ErrorState
              compacto
              titulo="Todavía no hay gráfico para este activo."
              detalle="Nuestra fuente de precios históricos (data912) no publica su historia, en general porque es un CEDEAR nuevo. Abajo están el precio de hoy, las puntas, los datos de la empresa y sus noticias."
            />
          )}
          <p className="text-chico text-text-2">
            {!sinHistoria && (
              <>
                Hoy: <span className="tabular font-medium text-text">{a.precio ? pesos(a.precio, 2) : "—"}</span> <Delta valor={a.variacion} className="text-chico" />
              </>
            )}
            {a.tipo === "cedear" && prima !== null && mepHoy && (
              <>
                {sinHistoria ? "" : " · "}Su dólar implícito sale{" "}
                <span className="font-medium text-text">
                  {porcentaje(Math.abs(prima), 1)} {prima >= 0 ? "más caro" : "más barato"}
                </span>{" "}
                que el MEP ({pesos(mepHoy, 2)}).
              </>
            )}
          </p>
          {SUBYACENTES_OPCIONES[a.ticker] && (
            <Link href="/mercados/opciones" className="self-start text-chico font-medium text-accent hover:underline">
              Ver las opciones de {a.ticker}: cadena, volatilidad y lanzamiento cubierto
            </Link>
          )}
          {a.cambiosRatio.length > 0 && (
            <p className="text-micro text-text-3">
              Precios ajustados por {a.cambiosRatio.length === 1 ? "el cambio de ratio" : "los cambios de ratio"} del{" "}
              {a.cambiosRatio.map((c) => `${fechaCorta(c.fecha, true)} (×${c.veces})`).join(" y del ")}: antes de esa fecha, los precios se dividen para que se puedan comparar con los de hoy.
            </p>
          )}
          {a.serieCortada && (
            <p className="text-micro text-text-3">
              La historia arranca el {fechaCorta(a.serieCortada, true)}: ese día hay un salto de precio que no es un cambio de ratio y no pudimos explicar, así que lo anterior no es comparable.
            </p>
          )}
        </section>
        <DatosClave datos={sinHistoria ? datos.filter((x) => x.valor !== "—") : datos} />
      </div>

      {hayRendimiento && (
        <TablaRendimiento
          anio={hoy.slice(0, 4)}
          filas={[
            ["En pesos", rendPesos],
            ["En dólares MEP", rendUsd],
          ]}
          nota="En dólares, cada precio se divide por el dólar MEP de ese día: muestra si el activo le ganó a la devaluación. Rendimientos pasados, sin dividendos."
        />
      )}

      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <NoticiasActivo titulo={`Noticias de ${nombre}`} noticias={a.noticias} vacio={`No encontramos noticias de ${nombre} en los últimos tres días en los medios que seguimos.`} />
        <AcercaDe
          titulo={a.sector === "ETF" ? "Qué es" : "Acerca de la empresa"}
          texto={a.acerca ? <p>{a.acerca.texto}</p> : null}
          datos={datosEmpresa}
        />
      </div>

      <Parecidos
        titulo={a.parecidosPor === "sector" ? `Otros CEDEARs de ${a.sector?.toLowerCase() ?? "su sector"}` : a.parecidosPor === "volumen" ? "Los CEDEARs más operados hoy" : `Otras acciones del panel ${a.panel}`}
        items={a.parecidos.map((p) => ({ ticker: p.ticker, nombre: p.nombre, valor: pesos(p.precio, 2), detalle: <Delta valor={p.variacion} className="text-micro" /> }))}
      />

      <SourceNote
        className="mt-12"
        fuentes={[FUENTES.data912, FUENTES.dolarapi, FUENTES.argentinadatos, ...(a.acerca?.fuente === "wikipedia" ? [FUENTES.wikipedia] : []), ...(p ? [FUENTES.wikidata] : [])]}
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
