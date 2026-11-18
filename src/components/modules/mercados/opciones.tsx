"use client";

import { Fragment, useState } from "react";
import { DataTable, type Columna } from "@/components/ui/data-table";
import { MetricExplainer } from "@/components/ui/metric-explainer";
import { SegmentedControl } from "@/components/ui/segmented";
import type { CadenaOpciones, FilaLanzamiento, FilaOpciones, LadoOpcion, VencimientoOpciones } from "@/lib/data/types";
import { fechaCorta, fechaLarga, nombreMes, numero, pesos, porcentaje, SIN_DATO } from "@/lib/format";
import { cn } from "@/lib/cn";

const prima = (x: number | null | undefined) => (x === null || x === undefined ? SIN_DATO : numero(x, 2));
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Cadena de opciones, volatilidad y lanzamiento cubierto de un vencimiento. */
export function VistaOpciones({ cadena }: { cadena: CadenaOpciones }) {
  // Arranca en el vencimiento con más volumen: el que mira la mayoría.
  const principal = cadena.vencimientos.reduce((m, v) => (v.volumen > m.volumen ? v : m), cadena.vencimientos[0]!);
  const [fecha, setFecha] = useState(principal.fecha);
  const v = cadena.vencimientos.find((x) => x.fecha === fecha) ?? principal;
  const { subyacente: s } = cadena;

  return (
    <div className="flex flex-col gap-14 lg:gap-20">
      <section aria-labelledby="titulo-cadena" className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-1">
            <h2 id="titulo-cadena" className="text-[22px] font-semibold tracking-tight">
              Cadena de {s.ticker}
            </h2>
            <p className="text-chico text-text-2">
              Vence el {fechaLarga(v.fecha).toLowerCase()} · {v.dias === 0 ? "hoy" : v.dias === 1 ? "mañana" : `faltan ${v.dias} días`}
            </p>
          </div>
          <div className="sin-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            <SegmentedControl
              etiqueta="Vencimiento"
              valor={fecha}
              onChange={setFecha}
              opciones={cadena.vencimientos.map((x) => ({ valor: x.fecha, etiqueta: `${mayuscula(nombreMes(x.fecha))} ${x.fecha.slice(8, 10)}`, ariaLabel: `Vencimiento del ${fechaCorta(x.fecha, true)}` }))}
            />
          </div>
        </div>
        <Volatilidad v={v} cadena={cadena} />
        <Cadena v={v} precio={s.precio} ticker={s.ticker} />
        <p className="max-w-3xl text-micro">
          Primas en pesos por acción; cada contrato son {cadena.lote} acciones. Compra y venta son las mejores puntas de BYMA. En gris claro, el lado de cada base que ya tiene valor intrínseco (call por debajo del precio, put por
          encima). VI: volatilidad implícita; delta: cuánto se mueve la prima por cada $ 1 que se mueve {s.ticker}. Las dos las calculamos nosotros con Black-Scholes
          {v.tasaModelo ? ` y la tasa de ${v.tasaModelo.nombre.toLowerCase()} (${porcentaje(v.tasaModelo.tna, 1)} TNA)` : " con tasa 0 % (no hubo una tasa en pesos disponible)"}. Con * , las puntas están muy separadas y la VI es
          aproximada.
        </p>
      </section>
      <Lanzamiento v={v} cadena={cadena} />
    </div>
  );
}

// ───────────────────────── Volatilidad ─────────────────────────

function Volatilidad({ v, cadena }: { v: VencimientoOpciones; cadena: CadenaOpciones }) {
  const { d20, d60 } = cadena.volHistorica;
  const datos = [
    { etiqueta: "Volatilidad implícita", valor: v.viCercana, detalle: v.baseCercana ? `Base ${numero(v.baseCercana, 0)}, la más cercana al precio` : "Sin primas suficientes" },
    { etiqueta: "Histórica, 20 ruedas", valor: d20, detalle: `Lo que se movió ${cadena.subyacente.ticker} en el último mes` },
    { etiqueta: "Histórica, 60 ruedas", valor: d60, detalle: "En los últimos tres meses" },
  ];
  const diferencia = v.viCercana !== null && d20 !== null ? v.viCercana - d20 : null;
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-(--radius-card) border border-border bg-border sm:grid-cols-3">
        {datos.map((x) => (
          <div key={x.etiqueta} className="flex flex-col gap-1 bg-bg px-4 py-4">
            <dt className="text-label">{x.etiqueta}</dt>
            <dd className="tabular text-[28px] font-semibold leading-none tracking-tight">{x.valor !== null ? porcentaje(x.valor, 1) : SIN_DATO}</dd>
            <dd className="text-micro">{x.detalle}</dd>
          </div>
        ))}
      </dl>
      {diferencia !== null && (
        <p className="max-w-3xl text-chico text-text-2">
          Las primas descuentan que {cadena.subyacente.ticker} se mueva un <span className="font-medium text-text">{porcentaje(v.viCercana, 1)} anual</span>; en las últimas 20 ruedas se movió un{" "}
          <span className="font-medium text-text">{porcentaje(d20, 1)}</span>.{" "}
          {Math.abs(diferencia) < 0.03 ? "Están en línea." : diferencia > 0 ? "El mercado espera más movimiento que el reciente." : "El mercado espera menos movimiento que el reciente."}
        </p>
      )}
    </div>
  );
}

// ───────────────────────── Cadena ─────────────────────────

/** ¿El lado de esta fila ya tiene valor intrínseco? */
const adentro = (tipo: "call" | "put", base: number, precio: number) => (tipo === "call" ? base < precio : base > precio);

function Vi({ lado }: { lado: LadoOpcion | null }) {
  if (!lado || lado.vi === null) return <span className="text-text-3">{SIN_DATO}</span>;
  return (
    <span className={cn(lado.puntasAbiertas && "text-text-3")} title={lado.puntasAbiertas ? "Puntas muy separadas: la volatilidad implícita es aproximada" : undefined}>
      {porcentaje(lado.vi, 1)}
      {lado.puntasAbiertas && "*"}
    </span>
  );
}

const valor = (x: number | null | undefined, clase?: string) => <span className={cn(x === null || x === undefined ? "text-text-3" : clase)}>{prima(x)}</span>;

function Cadena({ v, precio, ticker }: { v: VencimientoOpciones; precio: number; ticker: string }) {
  const [lado, setLado] = useState<"call" | "put">("call");
  // Dónde va la línea del precio: antes de la primera base que lo supera.
  const corte = v.filas.findIndex((f) => f.base > precio);
  const lineaPrecio = (columnas: number) => (
    <tr aria-hidden>
      <td colSpan={columnas} className="p-0">
        <div className="flex items-center gap-3 py-1.5">
          <span className="h-px flex-1 bg-accent/60" />
          <span className="tabular text-micro font-medium text-accent">
            {ticker} {pesos(precio, 2)}
          </span>
          <span className="h-px flex-1 bg-accent/60" />
        </div>
      </td>
    </tr>
  );
  const celda = "px-2 py-2.5 text-right tabular";
  const sombra = (f: FilaOpciones, tipo: "call" | "put") => adentro(tipo, f.base, precio) && "bg-surface-2";
  const baseCelda = (f: FilaOpciones) => (
    <td className={cn("px-3 py-2.5 text-center font-mono text-[14px] font-semibold tabular", f.base === v.baseCercana && "text-accent")}>{numero(f.base, f.base % 1 ? 2 : 0)}</td>
  );

  return (
    <>
      {/* Desktop y tablet: calls a la izquierda, puts a la derecha, la base en el medio. */}
      <div className="hidden overflow-x-auto md:block">
        <div className="flex justify-between pb-2 text-chico font-medium">
          <span>
            Calls <span className="font-normal text-text-3">· derecho a comprar</span>
          </span>
          <span>
            Puts <span className="font-normal text-text-3">· derecho a vender</span>
          </span>
        </div>
        <table className="w-full border-collapse text-[14px]" aria-label={`Cadena de opciones de ${ticker}, vencimiento ${fechaCorta(v.fecha, true)}`}>
          <thead>
            <tr className="shadow-[inset_0_-1px_0_var(--c-border)]">
              {["Volumen", "Delta", "VI", "Último", "Compra", "Venta"].map((h, i) => (
                <th key={`c${h}`} className={cn("h-9 px-2 text-right text-label font-medium", (i === 0 || i === 1 || i === 3) && "hidden lg:table-cell")}>
                  {h}
                </th>
              ))}
              <th className="h-9 px-3 text-center text-label font-medium">Base</th>
              {["Compra", "Venta", "Último", "VI", "Delta", "Volumen"].map((h, i) => (
                <th key={`p${h}`} className={cn("h-9 px-2 text-right text-label font-medium", (i === 2 || i === 4 || i === 5) && "hidden lg:table-cell")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.filas.map((f, i) => (
              <Fragment key={f.base}>
                {i === corte && lineaPrecio(13)}
                <tr className="shadow-[inset_0_-1px_0_var(--c-border)]">
                  <td className={cn(celda, "hidden text-text-3 lg:table-cell", sombra(f, "call"))}>{f.call?.volumen ? numero(f.call.volumen, 0) : SIN_DATO}</td>
                  <td className={cn(celda, "hidden lg:table-cell", sombra(f, "call"))}>{f.call?.delta != null ? numero(f.call.delta, 2) : <span className="text-text-3">{SIN_DATO}</span>}</td>
                  <td className={cn(celda, sombra(f, "call"))}>
                    <Vi lado={f.call} />
                  </td>
                  <td className={cn(celda, "hidden lg:table-cell", sombra(f, "call"))}>{valor(f.call?.ultimo, "text-text-2")}</td>
                  <td className={cn(celda, "font-medium", sombra(f, "call"))}>{valor(f.call?.compra)}</td>
                  <td className={cn(celda, "font-medium", sombra(f, "call"))}>{valor(f.call?.venta)}</td>
                  {baseCelda(f)}
                  <td className={cn(celda, "font-medium", sombra(f, "put"))}>{valor(f.put?.compra)}</td>
                  <td className={cn(celda, "font-medium", sombra(f, "put"))}>{valor(f.put?.venta)}</td>
                  <td className={cn(celda, "hidden lg:table-cell", sombra(f, "put"))}>{valor(f.put?.ultimo, "text-text-2")}</td>
                  <td className={cn(celda, sombra(f, "put"))}>
                    <Vi lado={f.put} />
                  </td>
                  <td className={cn(celda, "hidden lg:table-cell", sombra(f, "put"))}>{f.put?.delta != null ? numero(f.put.delta, 2) : <span className="text-text-3">{SIN_DATO}</span>}</td>
                  <td className={cn(celda, "hidden text-text-3 lg:table-cell", sombra(f, "put"))}>{f.put?.volumen ? numero(f.put.volumen, 0) : SIN_DATO}</td>
                </tr>
              </Fragment>
            ))}
            {corte === -1 && lineaPrecio(13)}
          </tbody>
        </table>
      </div>

      {/* Celular: calls o puts, de a uno. */}
      <div className="flex flex-col gap-4 md:hidden">
        <SegmentedControl
          etiqueta="Tipo de opción"
          valor={lado}
          onChange={setLado}
          ancho="lleno"
          opciones={[
            { valor: "call", etiqueta: "Calls" },
            { valor: "put", etiqueta: "Puts" },
          ]}
        />
        <table className="w-full border-collapse text-[14px]" aria-label={`${lado === "call" ? "Calls" : "Puts"} de ${ticker}, vencimiento ${fechaCorta(v.fecha, true)}`}>
          <thead>
            <tr className="shadow-[inset_0_-1px_0_var(--c-border)]">
              {["Base", "Compra", "Venta", "VI", "Delta"].map((h, i) => (
                <th key={h} className={cn("h-9 px-2 text-label font-medium", i === 0 ? "text-left" : "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.filas
              .map((f, i) => ({ f, i, o: lado === "call" ? f.call : f.put }))
              .map(({ f, i, o }) => (
                <Fragment key={f.base}>
                  {i === corte && lineaPrecio(5)}
                  <tr className={cn("shadow-[inset_0_-1px_0_var(--c-border)]", sombra(f, lado))}>
                    <td className={cn("px-2 py-2.5 font-mono text-[14px] font-semibold tabular", f.base === v.baseCercana && "text-accent")}>{numero(f.base, f.base % 1 ? 2 : 0)}</td>
                    <td className={cn(celda, "font-medium")}>{valor(o?.compra)}</td>
                    <td className={cn(celda, "font-medium")}>{valor(o?.venta)}</td>
                    <td className={celda}>
                      <Vi lado={o} />
                    </td>
                    <td className={celda}>{o?.delta != null ? numero(o.delta, 2) : <span className="text-text-3">{SIN_DATO}</span>}</td>
                  </tr>
                </Fragment>
              ))}
            {corte === -1 && lineaPrecio(5)}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ───────────────────────── Lanzamiento cubierto ─────────────────────────

function Colchon({ x, ticker }: { x: number; ticker: string }) {
  if (Math.abs(x) < 0.0005) return <span>{ticker} tiene que quedar igual</span>;
  return x > 0 ? (
    <span>
      Puede bajar <span className="font-medium text-text">{porcentaje(x, 1)}</span>
    </span>
  ) : (
    <span>
      Tiene que subir <span className="font-medium text-text">{porcentaje(-x, 1)}</span>
    </span>
  );
}

function Lanzamiento({ v, cadena }: { v: VencimientoOpciones; cadena: CadenaOpciones }) {
  const { subyacente: s } = cadena;
  const compraAccion = s.venta ?? s.precio;
  // Para explicar la cuenta: la base con valor intrínseco más cercana al precio (la típica de un lanzamiento "tasa").
  const ejemplo = [...v.lanzamientos].filter((l) => l.colchon > 0).sort((a, b) => a.colchon - b.colchon)[0] ?? v.lanzamientos[0];
  // Por defecto, solo las bases por debajo del precio: ahí la tasa no depende de que la acción suba.
  const [conArriba, setConArriba] = useState(false);
  const arriba = v.lanzamientos.filter((l) => l.colchon < 0);
  const visibles = conArriba || arriba.length === v.lanzamientos.length ? v.lanzamientos : v.lanzamientos.filter((l) => l.colchon >= 0);
  const columnas: Columna<FilaLanzamiento>[] = [
    { id: "base", encabezado: "Base", valorOrden: (l) => l.base, celda: (l) => <span className="font-mono font-semibold tabular">{numero(l.base, l.base % 1 ? 2 : 0)}</span> },
    { id: "prima", encabezado: "Cobrás de prima", alineacion: "derecha", valorOrden: (l) => l.prima, celda: (l) => pesos(l.prima, 2) },
    { id: "inversion", encabezado: "Ponés por acción", alineacion: "derecha", solo: "desktop", valorOrden: (l) => l.inversion, celda: (l) => pesos(l.inversion, 2) },
    { id: "tna", encabezado: "TNA si te ejercen", alineacion: "derecha", valorOrden: (l) => l.tna, ordenInicial: "desc", celda: (l) => <span className="font-semibold">{porcentaje(l.tna, 1)}</span> },
    { id: "colchon", encabezado: `Para que te ejerzan, ${s.ticker}…`, alineacion: "derecha", valorOrden: (l) => l.colchon, celda: (l) => <span className="text-chico text-text-2"><Colchon x={l.colchon} ticker={s.ticker} /></span> },
    { id: "equilibrio", encabezado: "No perdés hasta", alineacion: "derecha", solo: "desktop", valorOrden: (l) => l.equilibrio, celda: (l) => <span>{pesos(l.equilibrio, 2)}</span> },
  ];

  return (
    <section aria-labelledby="titulo-lanzamiento" className="flex flex-col gap-6">
      <div className="flex max-w-3xl flex-col gap-2">
        <h2 id="titulo-lanzamiento" className="text-[22px] font-semibold tracking-tight">
          Lanzamiento cubierto: la tasa en pesos de vender un call
        </h2>
        <p className="text-text-2">
          Comprás {s.ticker} a {pesos(compraAccion, 2)} (la mejor punta vendedora) y vendés un call a la mejor punta compradora. Si al vencimiento {s.ticker} está por encima de la base, te ejercen: entregás las acciones a la
          base y la ganancia queda fija desde hoy, como una colocación a tasa. Si queda por debajo, te quedás con las acciones y la prima cobrada.
        </p>
      </div>

      {v.comparables.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-label">En pesos, a un plazo parecido ({v.diasCobro} días)</p>
          <ul className="flex flex-wrap gap-2">
            {v.comparables.map((c) => (
              <li key={c.id} className="flex items-baseline gap-2 rounded-(--radius-chip) border border-border px-3 py-1.5 text-chico">
                <span className="font-medium">{c.nombre}</span>
                <span className="text-text-3">{c.detalle}</span>
                <span className="tabular font-semibold">{porcentaje(c.tna, 1)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {v.lanzamientos.length === 0 ? (
        <p className="text-text-2">Para este vencimiento no hay calls con punta compradora: no se puede armar un lanzamiento cubierto ahora.</p>
      ) : (
        <DataTable
          etiqueta={`Lanzamiento cubierto de ${s.ticker}, vencimiento ${fechaCorta(v.fecha, true)}`}
          filas={visibles}
          columnas={columnas}
          clave={(l) => l.simbolo}
          ordenPorDefecto={{ columna: "base", direccion: "asc" }}
          filaMovil={(l) => (
            <span className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[15px] font-semibold tabular">Base {numero(l.base, l.base % 1 ? 2 : 0)}</span>
                <span className="block text-micro">
                  Prima {pesos(l.prima, 2)} · <Colchon x={l.colchon} ticker={s.ticker} />
                </span>
              </span>
              <span className="text-right">
                <span className="tabular block text-[15px] font-semibold">{porcentaje(l.tna, 1)}</span>
                <span className="block text-micro">TNA</span>
              </span>
            </span>
          )}
        />
      )}
      {arriba.length > 0 && arriba.length < v.lanzamientos.length && (
        <button type="button" onClick={() => setConArriba((x) => !x)} className="self-start text-chico font-medium text-accent hover:underline">
          {conArriba
            ? `Ocultar las bases por encima de ${pesos(s.precio, 0)}`
            : `Ver también las ${arriba.length} bases por encima de ${pesos(s.precio, 0)}: ahí la tasa depende de que ${s.ticker} suba`}
        </button>
      )}

      {ejemplo && (
        <MetricExplainer
          titulo={`¿De dónde sale la tasa de la base ${numero(ejemplo.base, 0)}?`}
          formula="TNA = (base ÷ (precio de la acción − prima) − 1) × 365 ÷ días"
          pasos={[
            { etiqueta: `Precio de ${s.ticker} (punta vendedora)`, valor: pesos(compraAccion, 2) },
            { etiqueta: "Prima que cobrás (punta compradora)", valor: pesos(ejemplo.prima, 2) },
            { etiqueta: "Ponés por acción", valor: pesos(ejemplo.inversion, 2) },
            { etiqueta: "Cobrás si te ejercen (la base)", valor: pesos(ejemplo.base, 2) },
            { etiqueta: "Rendimiento directo", valor: porcentaje(ejemplo.directo, 2) },
            { etiqueta: "Días (de la liquidación de hoy al cobro del ejercicio)", valor: numero(v.diasCobro, 0) },
          ]}
          resultado={`${porcentaje(ejemplo.tna, 2)} TNA`}
          fuente="Puntas de BYMA (data912). Antes de comisiones, derechos de mercado e impuestos."
          ancla="/metodologia#opciones"
        />
      )}
      <p className="max-w-3xl text-micro">
        La tasa es antes de comisiones, derechos de mercado e impuestos, que en opciones pesan: preguntale a tu broker cuánto cobra. No incluye dividendos. Si {s.ticker} cae por debajo del punto de equilibrio, perdés plata como con
        cualquier acción.
      </p>
    </section>
  );
}
