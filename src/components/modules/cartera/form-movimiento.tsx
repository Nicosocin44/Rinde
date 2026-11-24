"use client";

import { useId, useMemo, useState } from "react";
import { BONOS_USD } from "@data/ar/bonos-usd";
import { LECAPS } from "@data/ar/lecaps";
import { CEDEARS, PANEL_LIDER } from "@data/ar/mercados";
import { PROVEEDORES } from "@data/ar/proveedores";
import { Button } from "@/components/ui/button";
import { MoneyInput, NumberField } from "@/components/ui/money-input";
import { SegmentedControl } from "@/components/ui/segmented";
import { hoyAR, sumarDias } from "@/lib/calculos/fechas";
import { esCuenta, idActivo, monedaDe } from "@/lib/cartera/activos";
import { precioCuenta, type Activo, type Movimiento, type TipoActivo, type TipoMovimiento } from "@/lib/calculos/cartera";
import type { PreciosCartera } from "@/lib/data/servicios/cartera";
import { dinero, numero } from "@/lib/format";
import { cn } from "@/lib/cn";

const TIPOS: { valor: TipoActivo; etiqueta: string }[] = [
  { valor: "billetera", etiqueta: "Billetera o cuenta" },
  { valor: "plazo_fijo", etiqueta: "Plazo fijo" },
  { valor: "cedear", etiqueta: "CEDEAR" },
  { valor: "accion", etiqueta: "Acción" },
  { valor: "bono", etiqueta: "Bono en USD" },
  { valor: "lecap", etiqueta: "LECAP" },
  { valor: "cripto", etiqueta: "Cripto" },
  { valor: "efectivo_usd", etiqueta: "Dólares" },
];

const SUGERENCIAS: Partial<Record<TipoActivo, { valor: string; nombre: string }[]>> = {
  cedear: Object.entries(CEDEARS).map(([t, c]) => ({ valor: t, nombre: c.nombre })),
  accion: Object.entries(PANEL_LIDER).map(([t, n]) => ({ valor: t, nombre: n })),
  bono: BONOS_USD.map((b) => ({ valor: b.ticker, nombre: b.nombre })),
  lecap: LECAPS.map((l) => ({ valor: l.ticker, nombre: `${l.tipo} ${l.ticker}` })),
  cripto: [
    { valor: "BTC", nombre: "Bitcoin" },
    { valor: "ETH", nombre: "Ether" },
    { valor: "USDT", nombre: "Tether" },
    { valor: "USDC", nombre: "USD Coin" },
  ],
};

const esCuentaForm = esCuenta;

/**
 * Carga manual de un movimiento. Las posiciones se derivan de los movimientos (no hay "editar posición").
 * Para cuentas se pide el monto; para instrumentos, cantidad y precio (sugerido con el precio de hoy).
 */
export function FormMovimiento({ precios, onGuardar, activosExistentes, conCuenta = false }: { precios: PreciosCartera | null; onGuardar: (a: Activo, m: Movimiento) => Promise<void>; activosExistentes: Activo[]; conCuenta?: boolean }) {
  const id = useId();
  const [tipo, setTipo] = useState<TipoActivo>("cedear");
  const [ticker, setTicker] = useState("AAPL");
  const [nombre, setNombre] = useState("");
  const [movimiento, setMovimiento] = useState<TipoMovimiento>("compra");
  const [fecha, setFecha] = useState(hoyAR());
  const [cantidad, setCantidad] = useState(10);
  const [precio, setPrecio] = useState<number | null>(null);
  const [monto, setMonto] = useState(1_000_000);
  const [tna, setTna] = useState(20);
  const [plazo, setPlazo] = useState(30);
  const [comision, setComision] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cuenta = esCuentaForm(tipo);
  const moneda = monedaDe(tipo);
  const tickerNorm = ticker.trim().toUpperCase();
  const activoId = idActivo(tipo, cuenta ? nombre : tickerNorm, fecha);
  const precioHoy = precios?.actuales[activoId]?.precio ?? null;
  const precioUsado = precio ?? (fecha === hoyAR() ? precioHoy : null);
  const porCien = tipo === "bono" || tipo === "lecap";
  const importe = cuenta ? monto : precioUsado ? (cantidad * precioUsado) / (porCien ? 100 : 1) : null;

  const nombresProveedor = useMemo(
    () => PROVEEDORES.filter((p) => (tipo === "plazo_fijo" ? p.tipo === "banco" : p.tipo === "billetera" || p.tipo === "banco" || p.tipo === "exchange")).map((p) => p.nombre),
    [tipo],
  );

  const cambiarTipo = (t: TipoActivo) => {
    setTipo(t);
    setMovimiento(esCuentaForm(t) ? "deposito" : "compra");
    setTicker(SUGERENCIAS[t]?.[0]?.valor ?? "");
    setNombre(t === "efectivo_usd" ? "Dólares ahorrados" : "");
    setPrecio(null);
    setError(null);
  };

  const guardar = async () => {
    setError(null);
    if (!cuenta && !/^[A-Z0-9.]{1,12}$/.test(tickerNorm)) return setError("Escribí el ticker del instrumento (por ejemplo, AAPL).");
    if (cuenta && tipo !== "efectivo_usd" && !nombre.trim()) return setError(tipo === "plazo_fijo" ? "Escribí el banco." : "Escribí el nombre de la billetera o cuenta.");
    if (!cuenta && (!precioUsado || precioUsado <= 0)) return setError("Indicá el precio al que operaste.");
    if (cuenta ? monto <= 0 : cantidad <= 0) return setError("La cantidad tiene que ser mayor a cero.");
    if (fecha > hoyAR()) return setError("La fecha no puede ser futura.");

    const existente = activosExistentes.find((a) => a.id === activoId);
    const sugerencia = SUGERENCIAS[tipo]?.find((s) => s.valor === tickerNorm);
    const activo: Activo = existente ?? {
      id: activoId,
      tipo,
      nombre: cuenta ? (tipo === "plazo_fijo" ? `Plazo fijo ${nombre.trim()}` : nombre.trim() || "Dólares") : (sugerencia?.nombre ?? tickerNorm),
      ticker: cuenta ? undefined : tickerNorm,
      moneda,
      proveedorId: cuenta ? PROVEEDORES.find((p) => p.nombre.toLowerCase() === nombre.trim().toLowerCase())?.id : undefined,
      ...(tipo === "billetera" || tipo === "plazo_fijo" ? { tna: tna / 100, inicio: fecha } : {}),
      ...(tipo === "plazo_fijo" ? { vencimiento: sumarDias(fecha, plazo) } : {}),
      ...(tipo === "lecap" ? { vencimiento: LECAPS.find((l) => l.ticker === tickerNorm)?.vencimiento } : {}),
    };
    let mov: Movimiento;
    if (cuenta) {
      const p = precioCuenta(activo, fecha);
      mov = { id: crypto.randomUUID(), activoId, fecha, tipo: movimiento, cantidad: String(monto / p.toNumber()), precio: p.toString() };
    } else {
      mov = { id: crypto.randomUUID(), activoId, fecha, tipo: movimiento, cantidad: String(cantidad), precio: String(precioUsado), comision: comision ? String(comision) : undefined };
    }
    setGuardando(true);
    try {
      await onGuardar(activo, mov);
    } catch {
      setError("No pudimos guardar. Revisá que tu navegador permita guardar datos.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-5" data-testid="form-movimiento">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label">Qué cargás</legend>
        <div className="grid grid-cols-2 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              aria-pressed={tipo === t.valor}
              onClick={() => cambiarTipo(t.valor)}
              className={cn("h-10 rounded-(--radius-control) border px-3 text-left text-[14px] font-medium transition-colors", tipo === t.valor ? "border-accent bg-accent-soft text-text" : "border-border text-text-2 hover:border-border-strong")}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
      </fieldset>

      <SegmentedControl
        etiqueta="Tipo de movimiento"
        ancho="lleno"
        valor={movimiento}
        onChange={setMovimiento}
        opciones={cuenta ? [{ valor: "deposito", etiqueta: "Depósito" }, { valor: "retiro", etiqueta: "Retiro" }] : [{ valor: "compra", etiqueta: "Compra" }, { valor: "venta", etiqueta: "Venta" }]}
      />

      {cuenta ? (
        tipo !== "efectivo_usd" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-label">{tipo === "plazo_fijo" ? "Banco" : "Billetera o cuenta"}</span>
            <input
              list={`${id}-prov`}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={tipo === "plazo_fijo" ? "Banco Nación" : "Mercado Pago"}
              className="h-11 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3.5 text-[16px] outline-none focus:border-accent"
            />
            <datalist id={`${id}-prov`}>
              {nombresProveedor.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </label>
        )
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-label">Ticker</span>
          <input
            list={`${id}-tick`}
            value={ticker}
            onChange={(e) => {
              setTicker(e.target.value);
              setPrecio(null);
            }}
            autoCapitalize="characters"
            className="h-11 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3.5 font-mono text-[16px] uppercase outline-none focus:border-accent"
            data-testid="input-ticker"
          />
          <datalist id={`${id}-tick`}>
            {(SUGERENCIAS[tipo] ?? []).map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.nombre}
              </option>
            ))}
          </datalist>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-label">Fecha</span>
        <input type="date" value={fecha} max={hoyAR()} onChange={(e) => setFecha(e.target.value)} className="h-11 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3.5 text-[16px] outline-none focus:border-accent" />
      </label>

      {cuenta ? (
        <>
          <MoneyInput etiqueta="Monto" moneda={moneda === "USD" ? "US$" : "$"} valor={monto} onChange={setMonto} />
          {tipo !== "efectivo_usd" && movimiento === "deposito" && <NumberField etiqueta="TNA que te pagan" valor={tna} onChange={setTna} sufijo="%" min={0} max={300} paso={0.5} decimales={2} />}
          {tipo === "plazo_fijo" && movimiento === "deposito" && <NumberField etiqueta="Plazo" valor={plazo} onChange={(v) => setPlazo(Math.max(1, Math.round(v)))} sufijo="días" min={1} max={730} decimales={0} />}
        </>
      ) : (
        <>
          <NumberField etiqueta={porCien ? "Nominales" : "Cantidad"} valor={cantidad} onChange={setCantidad} min={0} paso={1} decimales={tipo === "cripto" ? 8 : 0} />
          <NumberField
            etiqueta={`Precio ${porCien ? "por 100 nominales" : "por unidad"} (${moneda === "USD" ? "US$" : "$"})`}
            valor={precioUsado ?? 0}
            onChange={(v) => setPrecio(v)}
            min={0}
            decimales={moneda === "USD" ? 2 : 2}
          />
          {precioHoy && <p className="-mt-3 text-micro">Precio de hoy: {dinero(precioHoy, moneda, 2)}{porCien ? " por 100 nominales" : ""}</p>}
          <NumberField etiqueta="Comisión total" valor={comision} onChange={setComision} sufijo={moneda === "USD" ? "US$" : "$"} min={0} decimales={2} />
        </>
      )}

      {importe !== null && (
        <p className="text-chico text-text-2">
          Total: <span className="tabular font-medium text-text">{dinero(importe, moneda, moneda === "USD" ? 2 : 0)}</span>
          {!cuenta && comision > 0 && <> + {dinero(comision, moneda)} de comisión</>}
          {!cuenta && porCien && <> · {numero(cantidad, 0)} nominales</>}
        </p>
      )}
      {error && (
        <p role="alert" className="text-chico text-loss">
          {error}
        </p>
      )}
      <Button variante="primario" tamano="lg" onClick={guardar} disabled={guardando} data-testid="guardar-movimiento">
        {guardando ? "Guardando…" : "Guardar movimiento"}
      </Button>
      <p className="text-micro">{conCuenta ? "Se guarda en tu cuenta." : "Se guarda solo en este navegador."} Podés exportarlo cuando quieras.</p>
    </div>
  );
}
