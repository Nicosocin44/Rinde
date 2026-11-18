"use client";

import { useMemo, useState } from "react";
import { DataTable, type Columna } from "@/components/ui/data-table";
import { MetricExplainer } from "@/components/ui/metric-explainer";
import { SegmentedControl } from "@/components/ui/segmented";
import type { CadenaOpciones, FilaLanzamiento, VencimientoOpciones } from "@/lib/data/types";
import { armarCajas, armarLanzamientos, bandaCajas, type FilaCaja } from "@/lib/opciones/tasas";
import { fechaCorta, numero, pesos, porcentaje } from "@/lib/format";
import { CampoComision, EncabezadoVencimiento, useComision, useVencimiento } from "./comun";

/** Solapa Tasas: lanzamiento cubierto y cajas, con la comisión de cada persona. */
export function VistaTasas({ cadena }: { cadena: CadenaOpciones }) {
  const [v, elegir] = useVencimiento(cadena);
  const [comision, setComision] = useComision();
  return (
    <div className="flex flex-col gap-14 lg:gap-20">
      <div className="flex flex-col gap-4">
        <EncabezadoVencimiento titulo="Tasas en pesos con opciones" id="titulo-tasas" cadena={cadena} v={v} onElegir={elegir}>
          <CampoComision comision={comision} onChange={setComision} />
        </EncabezadoVencimiento>
        <p className="max-w-3xl text-chico text-text-2">
          Todas las tasas ya descuentan tu comisión más los derechos de mercado ({porcentaje(comision, 2)} sobre cada operación; ponela según tu broker). No incluyen impuestos ni dividendos.
        </p>
        {v.comparables.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-label">Para comparar: en pesos, a un plazo parecido ({v.diasCobro} días)</p>
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
      </div>
      <Lanzamiento v={v} cadena={cadena} comision={comision} />
      <Cajas v={v} cadena={cadena} comision={comision} />
    </div>
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

function Lanzamiento({ v, cadena, comision }: { v: VencimientoOpciones; cadena: CadenaOpciones; comision: number }) {
  const { subyacente: s } = cadena;
  const compraAccion = s.venta ?? s.precio;
  const lanzamientos = useMemo(() => armarLanzamientos(v.filas, compraAccion, v.diasCobro, comision), [v, compraAccion, comision]);
  // Para explicar la cuenta: la base con valor intrínseco más cercana al precio (la típica de un lanzamiento "tasa").
  const ejemplo = [...lanzamientos].filter((l) => l.colchon > 0).sort((a, b) => a.colchon - b.colchon)[0] ?? lanzamientos[0];
  // Por defecto, solo las bases por debajo del precio: ahí la tasa no depende de que la acción suba.
  const [conArriba, setConArriba] = useState(false);
  const arriba = lanzamientos.filter((l) => l.colchon < 0);
  const visibles = conArriba || arriba.length === lanzamientos.length ? lanzamientos : lanzamientos.filter((l) => l.colchon >= 0);
  const columnas: Columna<FilaLanzamiento>[] = [
    { id: "base", encabezado: "Base", valorOrden: (l) => l.base, celda: (l) => <span className="font-mono font-semibold tabular">{numero(l.base, l.base % 1 ? 2 : 0)}</span> },
    { id: "prima", encabezado: "Cobrás de prima", alineacion: "derecha", valorOrden: (l) => l.prima, celda: (l) => pesos(l.prima, 2) },
    { id: "inversion", encabezado: "Ponés por acción", alineacion: "derecha", solo: "desktop", valorOrden: (l) => l.inversion, celda: (l) => pesos(l.inversion, 2) },
    { id: "tna", encabezado: "TNA si te ejercen", alineacion: "derecha", valorOrden: (l) => l.tna, ordenInicial: "desc", celda: (l) => <span className="font-semibold">{porcentaje(l.tna, 1)}</span> },
    {
      id: "colchon",
      encabezado: `Para que te ejerzan, ${s.ticker}…`,
      alineacion: "derecha",
      valorOrden: (l) => l.colchon,
      celda: (l) => (
        <span className="text-chico text-text-2">
          <Colchon x={l.colchon} ticker={s.ticker} />
        </span>
      ),
    },
    { id: "equilibrio", encabezado: "No perdés hasta", alineacion: "derecha", solo: "desktop", valorOrden: (l) => l.equilibrio, celda: (l) => <span>{pesos(l.equilibrio, 2)}</span> },
  ];

  return (
    <section aria-labelledby="titulo-lanzamiento" className="flex flex-col gap-6">
      <div className="flex max-w-3xl flex-col gap-2">
        <h2 id="titulo-lanzamiento" className="text-[22px] font-semibold tracking-tight">
          Lanzamiento cubierto: la tasa de vender un call
        </h2>
        <p className="text-text-2">
          Comprás {s.ticker} a {pesos(compraAccion, 2)} (la mejor punta vendedora) y vendés un call a la mejor punta compradora. Si al vencimiento {s.ticker} está por encima de la base, te ejercen: entregás las acciones a la
          base y la ganancia queda fija desde hoy, como una colocación a tasa. Si queda por debajo, te quedás con las acciones y la prima cobrada.
        </p>
      </div>

      {lanzamientos.length === 0 ? (
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
      {arriba.length > 0 && arriba.length < lanzamientos.length && (
        <button type="button" onClick={() => setConArriba((x) => !x)} className="self-start text-chico font-medium text-accent hover:underline">
          {conArriba
            ? `Ocultar las bases por encima de ${pesos(s.precio, 0)}`
            : `Ver también las ${arriba.length} bases por encima de ${pesos(s.precio, 0)}: ahí la tasa depende de que ${s.ticker} suba`}
        </button>
      )}

      {ejemplo && (
        <MetricExplainer
          titulo={`¿De dónde sale la tasa de la base ${numero(ejemplo.base, 0)}?`}
          formula="TNA = (base × (1 − c) ÷ (precio × (1 + c) − prima × (1 − c)) − 1) × 365 ÷ días"
          pasos={[
            { etiqueta: `Precio de ${s.ticker} (punta vendedora)`, valor: pesos(compraAccion, 2) },
            { etiqueta: "Prima que cobrás (punta compradora)", valor: pesos(ejemplo.prima, 2) },
            { etiqueta: "c: tu comisión + derechos", valor: porcentaje(comision, 2) },
            { etiqueta: "Ponés por acción", valor: pesos(ejemplo.inversion, 2) },
            { etiqueta: "Cobrás si te ejercen (base − comisión)", valor: pesos(ejemplo.base * (1 - comision), 2) },
            { etiqueta: "Rendimiento directo", valor: porcentaje(ejemplo.directo, 2) },
            { etiqueta: "Días (de la liquidación de hoy al cobro del ejercicio)", valor: numero(v.diasCobro, 0) },
          ]}
          resultado={`${porcentaje(ejemplo.tna, 2)} TNA`}
          fuente="Puntas de BYMA (data912). Sin impuestos ni dividendos."
          ancla="/metodologia#opciones"
        />
      )}
      <p className="max-w-3xl text-micro">Si {s.ticker} cae por debajo del punto de equilibrio, perdés plata como con cualquier acción.</p>
    </section>
  );
}

// ───────────────────────── Cajas ─────────────────────────

const MOSTRAR_CAJAS = 10;

function Cajas({ v, cadena, comision }: { v: VencimientoOpciones; cadena: CadenaOpciones; comision: number }) {
  const [operacion, setOperacion] = useState<"colocar" | "tomar">("colocar");
  const [todas, setTodas] = useState(false);
  const referencia = v.tasaModelo?.tna ?? null;
  const cajas = useMemo(() => armarCajas(v.filas, operacion, v.diasCobro, comision, referencia), [v, operacion, comision, referencia]);
  const [minima, maxima] = bandaCajas(referencia);
  const visibles = todas ? cajas : cajas.slice(0, MOSTRAR_CAJAS);
  const lote = cadena.lote;
  const ejemplo = cajas[0];
  const columnas: Columna<FilaCaja>[] = [
    {
      id: "bases",
      encabezado: "Bases",
      valorOrden: (c) => c.baja,
      celda: (c) => (
        <span className="font-mono font-semibold tabular">
          {numero(c.baja, 0)} / {numero(c.alta, 0)}
        </span>
      ),
    },
    { id: "hoy", encabezado: operacion === "colocar" ? "Ponés hoy" : "Recibís hoy", alineacion: "derecha", valorOrden: (c) => c.hoy, celda: (c) => pesos(c.hoy * lote, 0) },
    { id: "venc", encabezado: operacion === "colocar" ? "Cobrás al vencimiento" : "Pagás al vencimiento", alineacion: "derecha", solo: "desktop", valorOrden: (c) => c.alVencimiento, celda: (c) => pesos(c.alVencimiento * lote, 0) },
    { id: "tna", encabezado: operacion === "colocar" ? "TNA" : "Costo (TNA)", alineacion: "derecha", valorOrden: (c) => c.tna, celda: (c) => <span className="font-semibold">{porcentaje(c.tna, 1)}</span> },
    { id: "contratos", encabezado: "Cajas disponibles", alineacion: "derecha", solo: "desktop", valorOrden: (c) => c.contratos, celda: (c) => <span className="text-text-2">{c.contratos !== null ? numero(c.contratos, 0) : "—"}</span> },
  ];

  return (
    <section aria-labelledby="titulo-cajas" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-3xl flex-col gap-2">
          <h2 id="titulo-cajas" className="text-[22px] font-semibold tracking-tight">
            Cajas: una tasa sin riesgo de precio
          </h2>
          <p className="text-text-2">
            Una caja combina cuatro opciones de dos bases: call comprado y put vendido en la base baja, call vendido y put comprado en la alta. Al vencimiento vale siempre la diferencia de bases, suba o baje {cadena.subyacente.ticker}.
            Comprarla es colocar pesos a tasa; venderla es tomar pesos prestados.
          </p>
        </div>
        <SegmentedControl
          etiqueta="Operación"
          valor={operacion}
          onChange={(o) => {
            setOperacion(o);
            setTodas(false);
          }}
          opciones={[
            { valor: "colocar", etiqueta: "Colocar pesos" },
            { valor: "tomar", etiqueta: "Tomar pesos" },
          ]}
        />
      </div>

      {cajas.length === 0 ? (
        <p className="text-text-2">Ahora no hay dos bases con las cuatro puntas necesarias (o con tu comisión ninguna da una tasa positiva) para este vencimiento.</p>
      ) : (
        <DataTable
          etiqueta={`Cajas de ${cadena.subyacente.ticker} para ${operacion} pesos, vencimiento ${fechaCorta(v.fecha, true)}`}
          filas={visibles}
          columnas={columnas}
          clave={(c) => c.id}
          ordenPorDefecto={{ columna: "tna", direccion: operacion === "colocar" ? "desc" : "asc" }}
          filaMovil={(c) => (
            <span className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[15px] font-semibold tabular">
                  {numero(c.baja, 0)} / {numero(c.alta, 0)}
                </span>
                <span className="block text-micro">
                  {operacion === "colocar" ? "Ponés" : "Recibís"} {pesos(c.hoy * lote, 0)} · {c.contratos !== null ? `${numero(c.contratos, 0)} disponibles` : "sin cantidades"}
                </span>
              </span>
              <span className="text-right">
                <span className="tabular block text-[15px] font-semibold">{porcentaje(c.tna, 1)}</span>
                <span className="block text-micro">TNA</span>
              </span>
            </span>
          )}
        />
      )}
      {cajas.length > MOSTRAR_CAJAS && (
        <button type="button" onClick={() => setTodas((x) => !x)} className="self-start text-chico font-medium text-accent hover:underline">
          {todas ? `Ver solo las primeras ${MOSTRAR_CAJAS}` : `Ver las ${cajas.length} cajas posibles`}
        </button>
      )}
      {ejemplo && (
        <MetricExplainer
          titulo={`¿De dónde sale la tasa de la caja ${numero(ejemplo.baja, 0)} / ${numero(ejemplo.alta, 0)}?`}
          formula={operacion === "colocar" ? "TNA = ((base alta − base baja) ÷ lo que ponés hoy − 1) × 365 ÷ días" : "Costo = ((base alta − base baja) ÷ lo que recibís hoy − 1) × 365 ÷ días"}
          pasos={[
            { etiqueta: operacion === "colocar" ? "Ponés hoy, por caja (con comisión)" : "Recibís hoy, por caja (con comisión)", valor: pesos(ejemplo.hoy * lote, 2) },
            { etiqueta: operacion === "colocar" ? "Cobrás al vencimiento" : "Pagás al vencimiento", valor: pesos(ejemplo.alVencimiento * lote, 2) },
            { etiqueta: "Rendimiento directo", valor: porcentaje(ejemplo.directo, 2) },
            { etiqueta: "Días", valor: numero(v.diasCobro, 0) },
          ]}
          resultado={`${porcentaje(ejemplo.tna, 2)} TNA`}
          fuente="Puntas de BYMA (data912), con tu comisión sobre las cuatro primas."
          ancla="/metodologia#opciones"
        />
      )}
      <p className="max-w-3xl text-micro">
        Una caja son {lote} acciones por pata. Mostramos las que dan entre {porcentaje(minima, 1)} y {porcentaje(maxima, 1)} TNA{v.tasaModelo ? ` (la mitad y el doble de la ${v.tasaModelo.nombre.toLowerCase()})` : ""}: fuera de eso son puntas sueltas de bases lejanas. Usa las mejores puntas de ahora: si hay pocas cajas disponibles, para un monto grande el precio va a ser peor. Vender opciones pide garantía en tu broker, aunque la caja esté
        cubierta. No incluye los costos del ejercicio al vencimiento.
      </p>
    </section>
  );
}
