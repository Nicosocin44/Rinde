"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { GraficoResultado } from "@/components/charts/opciones";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/ui/money-input";
import { analizarEstrategia, costoEstrategia, primaBS, resultadoAlVencimiento, tasaContinua, type Pata } from "@/lib/calculos";
import type { CadenaOpciones, FilaOpciones, LadoOpcion, VencimientoOpciones } from "@/lib/data/types";
import { numero, pesos, porcentaje } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CampoComision, EncabezadoVencimiento, useComision, useVencimiento } from "./comun";

type PataEditable = Pata & { id: number };

const ESTRATEGIAS = [
  { id: "call", nombre: "Compra de call", idea: "Ganás si sube; como mucho perdés la prima." },
  { id: "put", nombre: "Compra de put", idea: "Ganás si baja; como mucho perdés la prima." },
  { id: "cubierto", nombre: "Lanzamiento cubierto", idea: "Tenés las acciones y cobrás una prima a cambio de limitar la suba." },
  { id: "alcista", nombre: "Spread alcista", idea: "Call comprado y otro vendido más arriba: suba acotada, más barato." },
  { id: "bajista", nombre: "Spread bajista", idea: "Put comprado y otro vendido más abajo: baja acotada, más barato." },
  { id: "mariposa", nombre: "Mariposa", idea: "Ganás si al vencimiento queda cerca de la base del medio." },
  { id: "cono", nombre: "Cono comprado", idea: "Call y put de la misma base: ganás si se mueve mucho, para cualquier lado." },
] as const;

type IdEstrategia = (typeof ESTRATEGIAS)[number]["id"];

/** El lado de una base para un tipo de opción. */
const ladoDe = (f: FilaOpciones | undefined, tipo: "call" | "put"): LadoOpcion | null => (f ? (tipo === "call" ? f.call : f.put) : null);

/** Precio de mercado para una pata: comprás a la punta vendedora, vendés a la compradora; si no hay, el de referencia. */
function precioMercado(v: VencimientoOpciones, accion: number, p: Pick<Pata, "tipo" | "lado" | "base">): number {
  if (p.tipo === "accion") return accion;
  const o = ladoDe(
    v.filas.find((f) => f.base === p.base),
    p.tipo,
  );
  const punta = p.lado === "compra" ? o?.venta : o?.compra;
  return punta ?? o?.referencia ?? o?.ultimo ?? 0;
}

let siguienteId = 1;

function armar(id: IdEstrategia, v: VencimientoOpciones, precioAccion: number, lote: number): PataEditable[] {
  const bases = v.filas.filter((f) => (f.call?.compra || f.call?.venta) && (f.put?.compra || f.put?.venta)).map((f) => f.base);
  const todas = bases.length >= 3 ? bases : v.filas.map((f) => f.base);
  const i = Math.max(
    0,
    todas.reduce((m, b, k) => (Math.abs(b - precioAccion) < Math.abs(todas[m]! - precioAccion) ? k : m), 0),
  );
  const base = (k: number) => todas[Math.max(0, Math.min(todas.length - 1, k))]!;
  const debajo = todas.filter((b) => b <= precioAccion).at(-1) ?? base(i);
  const pata = (tipo: Pata["tipo"], lado: Pata["lado"], b: number, cantidad = 1): PataEditable => ({ id: siguienteId++, tipo, lado, base: b, cantidad, precio: precioMercado(v, precioAccion, { tipo, lado, base: b }) });
  switch (id) {
    case "call":
      return [pata("call", "compra", base(i))];
    case "put":
      return [pata("put", "compra", base(i))];
    case "cubierto":
      return [pata("accion", "compra", 0, lote), pata("call", "venta", debajo)];
    case "alcista":
      return [pata("call", "compra", base(i)), pata("call", "venta", base(i + 2))];
    case "bajista":
      return [pata("put", "compra", base(i)), pata("put", "venta", base(i - 2))];
    case "mariposa":
      return [pata("call", "compra", base(i - 1)), pata("call", "venta", base(i), 2), pata("call", "compra", base(i + 1))];
    case "cono":
      return [pata("call", "compra", base(i)), pata("put", "compra", base(i))];
  }
}

const selectClase = "h-10 w-full rounded-(--radius-control) border border-border-strong bg-surface-2 px-2 text-[15px] focus-visible:border-accent";

/** Solapa Estrategias: armás una estrategia con las primas de ahora y ves cuánto ganás o perdés según dónde termine la acción. */
export function VistaEstrategias({ cadena }: { cadena: CadenaOpciones }) {
  const [v, elegirVencimiento] = useVencimiento(cadena);
  const [comision, setComision] = useComision();
  const { subyacente: s, lote } = cadena;
  const precioAccion = s.venta ?? s.precio;
  const [estrategia, setEstrategia] = useState<IdEstrategia | "propia">("call");
  const [patas, setPatas] = useState<PataEditable[]>(() => armar("call", v, precioAccion, lote));

  const elegirEstrategia = (id: IdEstrategia) => {
    setEstrategia(id);
    setPatas(armar(id, v, precioAccion, lote));
  };
  // Al cambiar de vencimiento (o cuando se recupera el que se eligió en otra solapa), las patas pasan a ese vencimiento.
  const [armadoPara, setArmadoPara] = useState(v.fecha);
  if (armadoPara !== v.fecha) {
    setArmadoPara(v.fecha);
    setPatas(
      estrategia !== "propia"
        ? armar(estrategia, v, precioAccion, lote)
        : patas.map((p) => {
            const base = v.filas.some((f) => f.base === p.base) ? p.base : (v.filas[0]?.base ?? p.base);
            return { ...p, base, precio: precioMercado(v, precioAccion, { ...p, base }) };
          }),
    );
  }
  const cambiar = (id: number, cambios: Partial<Pata>, repreciar = false) => {
    setEstrategia("propia");
    setPatas((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        const nueva = { ...p, ...cambios };
        if (cambios.tipo === "accion" && p.tipo !== "accion") nueva.cantidad = lote;
        if (cambios.tipo && cambios.tipo !== "accion" && p.tipo === "accion") nueva.cantidad = 1;
        return repreciar ? { ...nueva, precio: precioMercado(v, precioAccion, nueva) } : nueva;
      }),
    );
  };

  const validas = useMemo(() => patas.filter((p) => p.cantidad > 0 && p.precio >= 0), [patas]);
  const analisis = useMemo(() => analizarEstrategia(validas, lote, comision), [validas, lote, comision]);
  const grafico = useMemo(() => {
    if (validas.length === 0) return null;
    const bases = validas.filter((p) => p.tipo !== "accion").map((p) => p.base);
    const extremos = [...bases, precioAccion, ...(analisis?.equilibrios ?? [])];
    const desde = Math.max(0, Math.min(precioAccion * 0.85, ...extremos.map((x) => x * 0.95)));
    const hasta = Math.max(precioAccion * 1.15, ...extremos.map((x) => x * 1.05));
    const n = 160;
    const xs = [...Array.from({ length: n + 1 }, (_, k) => desde + ((hasta - desde) * k) / n), ...bases.filter((b) => b > desde && b < hasta)].sort((a, b) => a - b);
    const vencimiento = xs.map((x) => ({ x, y: resultadoAlVencimiento(validas, lote, x, comision).toNumber() }));
    // Hoy, según el modelo: cada opción valuada con Black-Scholes y su volatilidad implícita (o la de la base más cercana).
    const t = v.dias / 365;
    const r = v.tasaModelo ? tasaContinua(v.tasaModelo.tea) : 0;
    const sigmas = validas.map((p) => (p.tipo === "accion" ? 0 : (ladoDe(v.filas.find((f) => f.base === p.base), p.tipo)?.vi ?? v.viCercana)));
    const hoyPosible = t > 0 && sigmas.every((sg) => sg !== null);
    const costo = costoEstrategia(validas, lote, comision).toNumber();
    const hoy = hoyPosible
      ? xs.map((x) => ({
          x,
          y:
            validas.reduce((total, p, k) => {
              const unidad = p.tipo === "accion" ? x : primaBS({ tipo: p.tipo, s: x, k: p.base, t, r, sigma: sigmas[k]! });
              const acciones = p.tipo === "accion" ? p.cantidad : p.cantidad * lote;
              return total + (p.lado === "compra" ? 1 : -1) * unidad * acciones;
            }, 0) - costo,
        }))
      : null;
    return { vencimiento, hoy };
  }, [validas, lote, comision, precioAccion, v, analisis]);

  const vendeDescubierto = validas.some((p) => p.tipo !== "accion" && p.lado === "venta");
  const cuenta = (x: { toNumber: () => number } | null | undefined, ilimitada: string) => (x === null ? ilimitada : x === undefined ? "—" : pesos(x.toNumber(), 0));

  return (
    <div className="flex flex-col gap-10">
      <EncabezadoVencimiento titulo="Calculadora de estrategias" id="titulo-estrategias" cadena={cadena} v={v} onElegir={elegirVencimiento}>
        <CampoComision comision={comision} onChange={setComision} />
      </EncabezadoVencimiento>

      <div className="flex flex-col gap-3">
        <p className="text-label">Elegí una estrategia (después podés cambiar cada pata)</p>
        <div className="flex flex-wrap gap-2">
          {ESTRATEGIAS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => elegirEstrategia(e.id)}
              aria-pressed={estrategia === e.id}
              className={cn(
                "rounded-full border px-3.5 py-2 text-chico font-medium transition-colors",
                estrategia === e.id ? "border-inverse bg-inverse text-on-inverse" : "border-border-strong text-text-2 hover:text-text",
              )}
            >
              {e.nombre}
            </button>
          ))}
        </div>
        <p className="text-chico text-text-2">{estrategia === "propia" ? "Estrategia propia: la armaste vos." : ESTRATEGIAS.find((e) => e.id === estrategia)?.idea}</p>
      </div>

      <section aria-labelledby="titulo-patas" className="flex flex-col gap-3">
        <h3 id="titulo-patas" className="text-[17px] font-semibold">
          Las patas
        </h3>
        <ul className="flex flex-col gap-3">
          {patas.map((p) => (
            <li key={p.id} className="grid grid-cols-2 items-end gap-3 rounded-(--radius-card) border border-border p-3 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
              <label className="flex flex-col gap-1.5">
                <span className="text-label">Operación</span>
                <select className={selectClase} value={p.lado} onChange={(e) => cambiar(p.id, { lado: e.target.value as Pata["lado"] }, true)}>
                  <option value="compra">Compra</option>
                  <option value="venta">Venta</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-label">Qué</span>
                <select className={selectClase} value={p.tipo} onChange={(e) => cambiar(p.id, { tipo: e.target.value as Pata["tipo"] }, true)}>
                  <option value="call">Call</option>
                  <option value="put">Put</option>
                  <option value="accion">Acción {s.ticker}</option>
                </select>
              </label>
              {p.tipo === "accion" ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-label">Base</span>
                  <span className="flex h-10 items-center text-text-3">—</span>
                </div>
              ) : (
                <label className="flex flex-col gap-1.5">
                  <span className="text-label">Base</span>
                  <select className={selectClase} value={p.base} onChange={(e) => cambiar(p.id, { base: Number(e.target.value) }, true)}>
                    {v.filas.map((f) => (
                      <option key={f.base} value={f.base}>
                        {numero(f.base, f.base % 1 ? 2 : 0)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <NumberField etiqueta={p.tipo === "accion" ? "Acciones" : "Contratos"} valor={p.cantidad} onChange={(x) => cambiar(p.id, { cantidad: Math.max(0, Math.round(x)) })} min={0} max={100000} paso={p.tipo === "accion" ? lote : 1} decimales={0} />
              <NumberField etiqueta={p.tipo === "accion" ? "Precio" : "Prima"} valor={p.precio} onChange={(x) => cambiar(p.id, { precio: Math.max(0, x) })} min={0} max={1e7} paso={p.tipo === "accion" ? 10 : 1} decimales={2} />
              <button
                type="button"
                onClick={() => {
                  setEstrategia("propia");
                  setPatas((ps) => ps.filter((x) => x.id !== p.id));
                }}
                className="flex size-10 items-center justify-center self-end rounded-full text-text-3 hover:bg-surface-2 hover:text-text"
                aria-label="Sacar esta pata"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variante="secundario"
            tamano="sm"
            onClick={() => {
              setEstrategia("propia");
              const base = v.baseCercana ?? v.filas[0]?.base ?? 0;
              setPatas((ps) => [...ps, { id: siguienteId++, tipo: "call", lado: "compra", base, cantidad: 1, precio: precioMercado(v, precioAccion, { tipo: "call", lado: "compra", base }) }]);
            }}
            disabled={patas.length >= 6}
          >
            <Plus />
            Sumar una pata
          </Button>
          <p className="text-micro">
            Las primas arrancan en las puntas de ahora: comprás a la vendedora y vendés a la compradora. Cada contrato son {lote} acciones. {s.ticker} hoy: {pesos(precioAccion, 2)}.
          </p>
        </div>
      </section>

      {analisis && grafico ? (
        <section aria-labelledby="titulo-resultado" className="flex flex-col gap-6">
          <h3 id="titulo-resultado" className="text-[17px] font-semibold">
            Cuánto ganás o perdés al vencimiento
          </h3>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-card) border border-border bg-border lg:grid-cols-4">
            <Dato etiqueta={analisis.costo.isNeg() ? "Hoy cobrás" : "Hoy pagás"} valor={pesos(analisis.costo.abs().toNumber(), 0)} detalle="Con tu comisión" />
            <Dato etiqueta="Ganancia máxima" valor={cuenta(analisis.gananciaMaxima, "Sin techo")} tono="gain" />
            <Dato etiqueta="Pérdida máxima" valor={cuenta(analisis.perdidaMaxima, "Sin piso")} tono="loss" />
            <Dato
              etiqueta={analisis.equilibrios.length === 1 ? "Punto de equilibrio" : "Puntos de equilibrio"}
              valor={analisis.equilibrios.length ? analisis.equilibrios.map((e) => numero(e, 0)).join(" y ") : "—"}
              detalle={analisis.equilibrios.length === 1 ? `${s.ticker} ${analisis.equilibrios[0]! >= precioAccion ? "tiene que subir" : "puede bajar"} ${porcentaje(Math.abs(analisis.equilibrios[0]! / precioAccion - 1), 1)}` : undefined}
            />
          </dl>
          <GraficoResultado vencimiento={grafico.vencimiento} hoy={grafico.hoy} precio={precioAccion} equilibrios={analisis.equilibrios} ticker={s.ticker} />
          <p className="max-w-3xl text-micro">
            Al vencimiento: lo que vale cada pata si {s.ticker} cierra en ese precio, menos lo que pagaste (o más lo que cobraste) hoy, con tu comisión. No incluye los costos del ejercicio ni impuestos. La línea punteada es una
            estimación de cuánto valdría hoy con Black-Scholes y la volatilidad implícita de cada serie.
          </p>
          {vendeDescubierto && (
            <p role="note" className="max-w-3xl border-l-2 border-warn pl-4 text-chico text-text-2">
              Vender opciones te obliga a cumplir si te ejercen: el broker te pide garantía y, si la venta no está cubierta, la pérdida puede ser mucho mayor que la prima que cobraste.
            </p>
          )}
        </section>
      ) : (
        <p className="text-text-2">Sumá al menos una pata con cantidad para ver el resultado.</p>
      )}
    </div>
  );
}

function Dato({ etiqueta, valor, detalle, tono }: { etiqueta: string; valor: string; detalle?: string; tono?: "gain" | "loss" }) {
  return (
    <div className="flex flex-col gap-1 bg-bg px-4 py-4">
      <dt className="text-label">{etiqueta}</dt>
      <dd className={cn("tabular text-[22px] font-semibold leading-tight tracking-tight", tono === "gain" && "text-gain", tono === "loss" && "text-loss")}>{valor}</dd>
      {detalle && <dd className="text-micro">{detalle}</dd>}
    </div>
  );
}
