import Link from "next/link";
import { CalculadoraFlujos } from "@/components/modules/bonos/bonos";
import { PageHeader } from "@/components/shell/page-header";
import { Delta } from "@/components/ui/delta";
import { ErrorState } from "@/components/ui/estados";
import { SourceNote } from "@/components/ui/frescura";
import { d, hoyAR, maximaCaida, rango, rendimientos, sumarDias, volatilidadAnual } from "@/lib/calculos";
import type { FichaBono } from "@/lib/data/servicios/fichas";
import { FUENTES, type EstadoDato } from "@/lib/data/types";
import { fechaCorta, numero, pesos, porcentaje } from "@/lib/format";
import { GraficoActivo } from "./grafico";
import { AcercaDe, Aviso, DatosClave, NoticiasActivo, Parecidos, Ruta, TablaRendimiento, type Dato } from "./partes";

const PAGOS: Record<number, string> = { 1: "una vez por año", 2: "cada seis meses", 4: "cada tres meses" };

/** Ficha de un bono soberano en dólares (Bonares y Globales del canje 2020). */
export function FichaBonoVista({ f, asOf, estado }: { f: FichaBono; asOf: string; estado: EstadoDato }) {
  const { bono: b, resumen: r } = f;
  const hoy = hoyAR();
  const cierresUsd = f.velasUsd.map((v) => ({ fecha: v.fecha, cierre: v.cierre }));
  const cierresArs = f.velasArs.map((v) => ({ fecha: v.fecha, cierre: v.cierre }));
  const unAnioAtras = sumarDias(hoy, -365);
  const rango52 = rango(f.velasUsd, unAnioAtras);
  const vol = volatilidadAnual(f.velasUsd);
  const caida = maximaCaida(cierresUsd, unAnioAtras);
  // Rendimiento corriente: el cupón anual de hoy (tasa × residual, por 100 VN original) sobre el precio.
  const corriente = b.precioUsd > 0 ? d(b.cuponActual).mul(b.residual).div(b.precioUsd).toNumber() : null;
  const ley = b.ley === "Nueva York" ? "ley Nueva York" : "ley argentina";
  const spreadPar = f.par ? Math.round((b.tir - f.par.tir) * 10_000) : null;

  const datos: Dato[] = [
    { etiqueta: "TIR", valor: porcentaje(b.tir, 2), ayuda: "Lo que rinde por año en dólares si lo tenés hasta el final y se cumplen todos los pagos." },
    { etiqueta: "Duration", valor: `${numero(b.duration, 2)} años`, ayuda: "Años promedio hasta cobrar los flujos. A más duration, más se mueve el precio cuando cambian las tasas." },
    { etiqueta: "Paridad", valor: porcentaje(b.paridad, 1), ayuda: "Precio contra su valor técnico (lo que vale el capital que queda más los intereses corridos)." },
    { etiqueta: "Cupón de hoy", valor: `${porcentaje(r.tasaHoy, 3)} anual`, ayuda: r.tasaMaxima > r.tasaHoy ? `Sube hasta ${porcentaje(r.tasaMaxima, 3)} anual (step-up).` : undefined },
    { etiqueta: "Rendimiento corriente", valor: corriente !== null ? porcentaje(corriente, 2) : "—", ayuda: "El cupón de un año sobre el precio de hoy, sin contar la devolución del capital." },
    { etiqueta: "Capital que queda", valor: `${numero(b.residual, 2)} %`, ayuda: "Lo que falta devolver, por cada 100 de valor nominal original." },
    { etiqueta: "Próximo pago", valor: b.proximoPago ? `${fechaCorta(b.proximoPago.fecha, true)} · US$ ${numero(b.proximoPago.monto, 2)}` : "—", ayuda: "Interés más capital, por cada 100 nominales." },
    { etiqueta: "Rango de 52 semanas", valor: rango52 ? `US$ ${numero(rango52.minimo, 2)} – ${numero(rango52.maximo, 2)}` : "—" },
    { etiqueta: "Volatilidad anual", valor: vol !== null ? porcentaje(vol, 1) : "—" },
    { etiqueta: "Máxima caída (1 año)", valor: caida ? <span className="text-loss">{porcentaje(caida.caida, 1)}</span> : "—", ayuda: caida ? `Del ${fechaCorta(caida.pico, true)} al ${fechaCorta(caida.piso, true)}.` : undefined },
  ];

  return (
    <>
      <PageHeader
        eyebrow={<Ruta seccion="Bonos" href="/bonos" ticker={b.ticker} />}
        titulo={b.nombre}
        bajada={`Bono del Tesoro en dólares · ${ley} · vence el ${fechaCorta(b.vencimiento, true)}`}
        className="mb-8 lg:mb-12"
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <section aria-label="Precio" className="flex min-w-0 flex-col gap-4">
          {cierresUsd.length > 1 || cierresArs.length > 1 ? (
            <GraficoActivo
              series={[
                { id: "usd", etiqueta: "En dólares", titulo: `${b.ticker}D · US$ por 100 nominales`, moneda: "US$", serie: cierresUsd.map((p) => [p.fecha, p.cierre]) },
                { id: "ars", etiqueta: "En pesos", titulo: `${b.ticker} · $ por 100 nominales`, moneda: "$", serie: cierresArs.map((p) => [p.fecha, p.cierre]) },
              ]}
            />
          ) : (
            <ErrorState compacto titulo="Todavía no tenemos la historia de precios de este bono." detalle="Mostramos el precio de hoy y el resto de los datos." />
          )}
          <p className="text-chico text-text-2">
            Hoy: <span className="tabular font-medium text-text">US$ {numero(b.precioUsd, 2)}</span> por 100 nominales <Delta valor={b.variacion} className="text-chico" />
            {b.precioArs && <> · {pesos(b.precioArs, 2)} en pesos</>}
          </p>
          {f.par && spreadPar !== null && (
            <p className="max-w-2xl text-chico text-text-2">
              Su par en la otra ley,{" "}
              <Link href={`/activo/${f.par.ticker}`} className="font-medium text-text underline decoration-border-strong decoration-dotted underline-offset-4">
                {f.par.ticker}
              </Link>
              , paga exactamente lo mismo y rinde {porcentaje(f.par.tir, 2)} TIR:{" "}
              {spreadPar === 0 ? "lo mismo" : `${Math.abs(spreadPar)} puntos básicos ${spreadPar > 0 ? "menos" : "más"}`} que {b.ticker}. Esa diferencia es lo que el mercado cobra o paga por la ley.
            </p>
          )}
        </section>
        <DatosClave datos={datos} />
      </div>

      <section aria-labelledby="calculadora" className="mt-12 lg:mt-16">
        <h2 id="calculadora" className="mb-1 text-h3">
          ¿Cuánto cobrás y cuándo?
        </h2>
        <p className="mb-6 max-w-2xl text-chico text-text-2">Poné cuánto invertís en dólares y te mostramos cada pago de interés y de capital hasta el vencimiento.</p>
        <div className="max-w-2xl">
          <CalculadoraFlujos b={b} liquidacion={f.liquidacion} />
        </div>
      </section>

      <TablaRendimiento
        anio={hoy.slice(0, 4)}
        filas={[
          ["En dólares (D)", rendimientos(cierresUsd, hoy)],
          ["En pesos", rendimientos(cierresArs, hoy)],
        ]}
        nota="Variación del precio, sin contar los cupones y el capital que el bono fue pagando: el rendimiento total es mayor. El precio en dólares es el de la especie D."
      />

      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <NoticiasActivo titulo="Noticias de bonos y deuda" noticias={f.noticias} vacio="No hay noticias de bonos ni deuda en los últimos tres días en los medios que seguimos." />
        <AcercaDe
          titulo="Acerca del bono"
          texto={
            <>
              <p>
                Bono del Tesoro nacional en dólares, {ley}, emitido en el canje de deuda de 2020. Paga intereses {PAGOS[r.pagosPorAnio] ?? `${r.pagosPorAnio} veces por año`} (el 9 de enero y el 9 de julio)
                {r.tasaMaxima > r.tasaHoy ? `, con una tasa que va subiendo: hoy ${porcentaje(r.tasaHoy, 3)} anual y hasta ${porcentaje(r.tasaMaxima, 3)}` : `, al ${porcentaje(r.tasaHoy, 3)} anual`}.
              </p>
              <p>
                {r.cuotasRestantes > 0 && r.proximaAmortizacion
                  ? `Devuelve el capital en cuotas: quedan ${r.cuotasRestantes}, desde el ${fechaCorta(r.proximaAmortizacion, true)} hasta el vencimiento.`
                  : "Ya devolvió todo el capital."}{" "}
                {b.ley === "Nueva York"
                  ? "Ante un conflicto, se rige por las leyes y los tribunales de Nueva York."
                  : "Ante un conflicto, se rige por las leyes y los tribunales argentinos."}
              </p>
            </>
          }
          datos={[
            ["Ley", b.ley === "Nueva York" ? "Nueva York" : "Argentina"],
            ["Vencimiento", fechaCorta(b.vencimiento, true)],
            ["Moneda", "Dólares"],
            ["Ticker en BYMA", <span key="t" className="font-mono">{b.ticker} / {b.ticker}D</span>],
          ]}
        />
      </div>

      <Parecidos
        titulo="Los otros bonos en dólares"
        items={f.otros.map((o) => ({ ticker: o.ticker, nombre: o.nombre, valor: `${porcentaje(o.tir, 2)} TIR`, detalle: <span className="text-text-3">{numero(o.duration, 1)} años de duration</span>, logo: false }))}
      />

      <SourceNote className="mt-12" fuentes={[FUENTES.data912]} actualizado={asOf} estado={estado} metodologia="/metodologia#bonos">
        <span aria-hidden>·</span>
        <span>Flujos según el prospecto del canje 2020 · liquidación {fechaCorta(f.liquidacion, true)}</span>
      </SourceNote>
      <Aviso />
    </>
  );
}

