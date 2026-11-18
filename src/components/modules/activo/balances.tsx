import Link from "next/link";
import type { ReactNode } from "react";
import { Delta } from "@/components/ui/delta";
import { valuar, type Valuacion } from "@/lib/calculos";
import { obtenerBalances } from "@/lib/data";
import { dolares, fechaCorta, mesAnio, numero, pesosCompacto, porcentaje } from "@/lib/format";
import { ResultadosEmpresa } from "./balances-vista";

/**
 * Balances y resultados de la empresa, de lo que presenta ante la SEC: las cifras principales, los resultados por
 * trimestre y por ejercicio, los tres estados contables completos y los números clave (valuación, rentabilidad,
 * crecimiento, salud financiera y accionistas). Va en su propio <Suspense>: la ficha se muestra sin esperarlo.
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
  const m = (x: number | null | undefined) => (x == null ? "—" : pesosCompacto(x, simbolo(b.moneda)));
  const anioUltimo = etiquetaEjercicio(b.anual.periodos.at(-1)!.fin);
  const u = b.ultimos12.valores;
  const etiquetaDoce = b.ultimos12.fuente === "trimestres" ? "últimos 12 meses" : `ejercicio ${anioUltimo}`;
  const ind = b.indicadores;
  const dpa = b.anual.valores.dividendoPorAccion.at(-1) ?? null;

  // ── Cuatro cifras de arriba ──
  const tarjetas: { etiqueta: string; valor: ReactNode; detalle: ReactNode }[] = [];
  if (!b.financiera)
    tarjetas.push({
      etiqueta: `Ingresos · ${etiquetaDoce}`,
      valor: m(u.ingresos),
      // El crecimiento que va con la cifra: si es el ejercicio, contra el anterior; si son 12 meses, el del último trimestre.
      detalle:
        b.ultimos12.fuente === "ejercicio" && ind.crecimientoIngresos !== null ? (
          <Crece valor={ind.crecimientoIngresos} texto={`contra el ejercicio anterior`} />
        ) : ind.ingresosInteranual !== null ? (
          <Crece valor={ind.ingresosInteranual} texto="en el último trimestre, interanual" />
        ) : (
          "Lo que vendió"
        ),
    });
  tarjetas.push({
    etiqueta: `Ganancia neta · ${etiquetaDoce}`,
    valor: <span className={(u.gananciaNeta ?? 0) < 0 ? "text-loss" : undefined}>{m(u.gananciaNeta)}</span>,
    detalle:
      ind.margenNeto !== null
        ? ind.margenNeto >= 0
          ? `Se queda con ${porcentaje(ind.margenNeto, 1)} de lo que vende`
          : `Pierde ${porcentaje(-ind.margenNeto, 1)} de lo que vende`
        : ind.crecimientoGanancia !== null
          ? <Crece valor={ind.crecimientoGanancia} texto={`en el ejercicio ${anioUltimo}`} />
          : "Lo que ganó después de impuestos",
  });
  if (v?.per) tarjetas.push({ etiqueta: "PER (precio / ganancia)", valor: `${numero(v.per, 1)} veces`, detalle: `Su precio equivale a ${numero(v.per, 0)} años de la ganancia actual` });
  else if (ind.roe !== null) tarjetas.push({ etiqueta: "Rentabilidad sobre el patrimonio", valor: porcentaje(ind.roe, 1), detalle: "Ganancia sobre lo que pusieron los accionistas (ROE)" });
  if (v?.rendimientoDividendo) tarjetas.push({ etiqueta: "Dividendo", valor: `${porcentaje(v.rendimientoDividendo, 2)} al año`, detalle: dpa ? `${dolares(dpa, 2)} por acción en el ejercicio ${anioUltimo}` : "Dividendos pagados sobre su valor" });
  else if (u.flujoLibre != null) tarjetas.push({ etiqueta: `Flujo de caja libre · ${etiquetaDoce}`, valor: <span className={u.flujoLibre < 0 ? "text-loss" : undefined}>{m(u.flujoLibre)}</span>, detalle: "Lo que le queda después de invertir en el negocio" });
  else if (ind.pasivosPatrimonio !== null) tarjetas.push({ etiqueta: "Pasivos / patrimonio", valor: `${numero(ind.pasivosPatrimonio, 1)} veces`, detalle: "Cuánto debe por cada peso de los accionistas" });

  // ── Números clave ──
  const veces = (x: number | null, dec = 1) => (x === null ? null : `${numero(x, dec)} veces`);
  const pct = (x: number | null, dec = 1) => (x === null ? null : porcentaje(x, dec));
  const grupos: { titulo: string; items: Item[] }[] = [
    { titulo: "Valuación", items: v ? itemsValuacion(v, simbolo(b.moneda)) : [] },
    {
      titulo: `Rentabilidad · ${etiquetaDoce}`,
      items: [
        { etiqueta: "Margen bruto", valor: pct(ind.margenBruto), ayuda: "Lo que queda de cada venta después del costo de lo vendido" },
        { etiqueta: "Margen operativo", valor: pct(ind.margenOperativo), ayuda: "Lo que deja el negocio, antes de intereses e impuestos" },
        { etiqueta: "Margen EBITDA", valor: pct(ind.margenEbitda) },
        { etiqueta: "Margen neto", valor: pct(ind.margenNeto), ayuda: "Lo que queda para los accionistas de cada venta" },
        { etiqueta: "Rentabilidad sobre el patrimonio (ROE)", valor: pct(ind.roe), ayuda: "Ganancia sobre lo que pusieron los accionistas" },
        { etiqueta: "Rentabilidad sobre los activos (ROA)", valor: pct(ind.roa), ayuda: "Ganancia sobre todo lo que tiene" },
      ],
    },
    {
      titulo: "Crecimiento",
      items: [
        { etiqueta: "Ingresos, último trimestre", valor: ind.ingresosInteranual === null ? null : <Delta valor={ind.ingresosInteranual} decimales={1} />, ayuda: "Contra el mismo trimestre del año anterior" },
        { etiqueta: "Ganancia, último trimestre", valor: ind.gananciaInteranual === null ? null : <Delta valor={ind.gananciaInteranual} decimales={1} />, ayuda: "Contra el mismo trimestre del año anterior" },
        { etiqueta: `Ingresos, ejercicio ${anioUltimo}`, valor: ind.crecimientoIngresos === null ? null : <Delta valor={ind.crecimientoIngresos} decimales={1} />, ayuda: "Contra el ejercicio anterior" },
        { etiqueta: `Ganancia, ejercicio ${anioUltimo}`, valor: ind.crecimientoGanancia === null ? null : <Delta valor={ind.crecimientoGanancia} decimales={1} />, ayuda: "Contra el ejercicio anterior" },
      ],
    },
    {
      titulo: b.balance ? `Salud financiera · al ${fechaCorta(b.balance.fecha, true)}` : "Salud financiera",
      items: [
        { etiqueta: "Liquidez corriente", valor: veces(ind.liquidezCorriente, 2), ayuda: "Activo corriente / pasivo corriente: más de 1, alcanza para pagar lo de este año" },
        { etiqueta: "Prueba ácida", valor: veces(ind.pruebaAcida, 2), ayuda: "Lo mismo, sin contar los inventarios" },
        { etiqueta: "Caja e inversiones de corto plazo", valor: b.balance ? m((b.balance.valores.caja ?? 0) + (b.balance.valores.inversionesCortoPlazo ?? 0) || null) : null },
        { etiqueta: "Deuda financiera", valor: b.balance?.valores.deudaTotal != null ? m(b.balance.valores.deudaTotal) : null },
        { etiqueta: "Deuda neta", valor: ind.deudaNeta === null ? null : ind.deudaNeta < 0 ? `${m(-ind.deudaNeta)} a favor` : m(ind.deudaNeta), ayuda: ind.deudaNeta !== null && ind.deudaNeta < 0 ? "Tiene más caja que deuda" : "Deuda − caja e inversiones de corto plazo" },
        { etiqueta: "Deuda neta / EBITDA", valor: ind.deudaNeta !== null && ind.deudaNeta > 0 ? veces(ind.deudaNetaEbitda) : null, ayuda: "Cuántos años de EBITDA necesita para pagar la deuda" },
        { etiqueta: "Deuda / patrimonio", valor: veces(ind.deudaPatrimonio, 2) },
        { etiqueta: "Pasivos / patrimonio", valor: veces(ind.pasivosPatrimonio, 2), ayuda: "Todo lo que debe, por cada peso de los accionistas" },
        { etiqueta: "Cobertura de intereses", valor: veces(ind.coberturaIntereses), ayuda: "Cuántas veces la ganancia operativa paga los intereses" },
      ],
    },
    {
      titulo: "Por acción y accionistas",
      items: [
        { etiqueta: `Ganancia por acción · ${etiquetaDoce}`, valor: ind.bpa12m === null ? null : `${simbolo(b.moneda)} ${numero(ind.bpa12m, 2)}` },
        { etiqueta: `Dividendo por acción · ${anioUltimo}`, valor: dpa === null ? null : `${simbolo(b.moneda)} ${numero(dpa, 2)}` },
        { etiqueta: "Payout", valor: pct(ind.payout), ayuda: "Qué parte de la ganancia reparte en dividendos" },
        { etiqueta: `Dividendos pagados · ${etiquetaDoce}`, valor: u.dividendosPagados != null ? m(u.dividendosPagados) : null },
        { etiqueta: `Recompra de acciones · ${etiquetaDoce}`, valor: u.recompras != null ? m(u.recompras) : null, ayuda: "Otra forma de devolver plata a los accionistas" },
        { etiqueta: "Acciones", valor: b.acciones === null ? null : `${numero(b.acciones / 1e6, 0)} millones`, ayuda: "Promedio diluido del último período" },
      ],
    },
  ];

  const periodo = b.ultimo.fin !== b.anual.periodos.at(-1)!.fin ? "trimestre" : "ejercicio";

  return (
    <section aria-labelledby="balances" className="mt-12 lg:mt-16">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="balances" className="text-h2">
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

      <ResultadosEmpresa moneda={b.moneda} anual={b.anual} trimestral={b.trimestral} financiera={b.financiera} />

      <div className="mt-10">
        <h3 className="mb-4 text-h3">Números clave</h3>
        <div className="grid gap-x-12 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
          {grupos
            .map((g) => ({ ...g, items: g.items.filter((x) => x.valor !== null) }))
            .filter((g) => g.items.length > 0)
            .map((g, k) => (
              <Grupo key={g.titulo} id={`numeros-${k}`} titulo={g.titulo} items={g.items} />
            ))}
        </div>
      </div>

      <p className="mt-6 max-w-3xl text-micro text-text-3">
        {b.moneda === "USD" ? "En dólares" : b.moneda === "ARS" ? "En pesos" : `En la moneda del balance (${b.moneda})`}, tal como la empresa los presenta ante la SEC
        {b.ajustadoPorInflacion ? ", ajustados por inflación a la fecha del balance: por eso solo comparamos ejercicios que vienen en el mismo balance y no mostramos trimestres" : ""}.
        {b.ultimos12.fuente === "trimestres" ? " Últimos 12 meses: la suma de los últimos cuatro trimestres." : ""}
        {v ? ` La valuación usa el precio de hoy de una acción en EE.UU. (${dolares(precioAccionUsd!, 2)}).` : ""}{" "}
        <Link href="/metodologia#balances" className="underline decoration-dotted underline-offset-4 hover:text-text-2">
          Cómo lo calculamos
        </Link>
        .
      </p>
    </section>
  );
}

type Item = { etiqueta: string; valor: ReactNode | null; ayuda?: string };

function itemsValuacion(v: Valuacion, sim: string): Item[] {
  const veces = (x: number | null) => (x === null ? null : `${numero(x, 1)} veces`);
  return [
    { etiqueta: "Capitalización", valor: pesosCompacto(v.capitalizacion, "US$"), ayuda: "Precio de hoy × acciones" },
    { etiqueta: "Valor de empresa", valor: v.valorEmpresa === null ? null : pesosCompacto(v.valorEmpresa, sim), ayuda: "Capitalización + deuda − caja" },
    { etiqueta: "PER", valor: veces(v.per), ayuda: "Precio / ganancia de 12 meses" },
    { etiqueta: "Precio / ventas", valor: veces(v.precioVentas) },
    { etiqueta: "Precio / valor libro", valor: veces(v.precioValorLibro), ayuda: "Precio / patrimonio" },
    { etiqueta: "Valor de empresa / EBITDA", valor: veces(v.evEbitda) },
    { etiqueta: "Rendimiento del dividendo", valor: v.rendimientoDividendo === null ? null : porcentaje(v.rendimientoDividendo, 2), ayuda: "Dividendo anual / precio" },
    { etiqueta: "Rendimiento del flujo libre", valor: v.rendimientoFlujoLibre === null ? null : porcentaje(v.rendimientoFlujoLibre, 1), ayuda: "Flujo de caja libre de 12 meses / capitalización" },
  ];
}

/** Un grupo de números clave: etiqueta (con una línea de ayuda) a la izquierda, cifra a la derecha. */
function Grupo({ id, titulo, items }: { id: string; titulo: string; items: Item[] }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col">
      <h4 id={id} className="mb-2 text-label">
        {titulo}
      </h4>
      <dl className="border-t border-border">
        {items.map((d) => (
          <div key={d.etiqueta} className="flex items-baseline justify-between gap-4 border-b border-border py-2.5">
            <dt className="text-chico text-text-2">
              {d.etiqueta}
              {d.ayuda && <span className="block text-micro text-text-3">{d.ayuda}</span>}
            </dt>
            <dd className="tabular shrink-0 text-right text-[15px] font-medium">{d.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Crece({ valor, texto }: { valor: number; texto: string }) {
  return (
    <>
      <Delta valor={valor} decimales={1} className="text-micro" /> {texto}
    </>
  );
}

const simbolo = (moneda: string) => (moneda === "USD" ? "US$" : moneda === "ARS" ? "$" : moneda === "EUR" ? "€" : moneda);

/** `2025` si el ejercicio cierra en diciembre; si no, `sep 2026`. */
function etiquetaEjercicio(fin: string): string {
  return fin.slice(5, 7) === "12" ? fin.slice(0, 4) : mesAnio(fin);
}

