"use client";

import { Bell, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/estados";
import { MoneyInput, NumberField } from "@/components/ui/money-input";
import { SegmentedControl } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { alCambiarAlertas, borrarAlerta, guardarAlerta, listarAlertas } from "@/lib/alertas/almacen";
import { describir, evaluar, LIMITE_GRATIS, type Alerta, type FotoMercado } from "@/lib/alertas/evaluar";
import type { TipoDolar } from "@/lib/data/types";
import { hace } from "@/lib/format";
import { cn } from "@/lib/cn";
import { fotoConActivos, tickersDeAlertas } from "@/lib/alertas/foto";
import { vencimientosLocales } from "./vigia";

/** Los tipos que se crean desde esta pantalla (la alerta de un activo se crea desde su ficha). */
type TipoAlerta = Exclude<Alerta["tipo"], "activo">;

/** Una alerta con su estado actual. Se usa también en Inicio (sección de producto) con datos de ejemplo. */
export function FilaAlerta({ alerta, foto, onBorrar, onToggle }: { alerta: Alerta; foto: FotoMercado | null; onBorrar?: () => void; onToggle?: () => void }) {
  const r = foto ? evaluar(alerta, foto) : null;
  return (
    <li className="flex items-center gap-4 border-b border-border py-4 last:border-0">
      <Bell className={cn("size-[18px] shrink-0", r?.cumplida && alerta.activa ? "text-accent" : "text-text-3")} strokeWidth={1.5} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[15px] font-medium", !alerta.activa && "text-text-3")}>{describir(alerta)}</p>
        <p className="truncate text-chico text-text-3">
          {r ? (
            <>
              {r.cumplida ? <span className="font-medium text-accent">Se cumple ahora</span> : "Todavía no"} · {r.actual}
            </>
          ) : (
            "Revisando…"
          )}
          {alerta.ultimaVez && <> · avisada {hace(alerta.ultimaVez)}</>}
        </p>
      </div>
      {onToggle && (
        <button
          type="button"
          role="switch"
          aria-checked={alerta.activa}
          aria-label={alerta.activa ? "Pausar alerta" : "Activar alerta"}
          onClick={onToggle}
          className={cn("relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors", alerta.activa ? "bg-accent" : "bg-surface-2 ring-1 ring-border-strong ring-inset")}
        >
          <span className={cn("absolute top-[3px] size-5 rounded-full bg-white shadow-(--shadow-thumb) transition-transform duration-(--duration-short)", alerta.activa ? "translate-x-[21px]" : "translate-x-[3px]")} />
        </button>
      )}
      {onBorrar && (
        <button type="button" onClick={onBorrar} aria-label="Borrar alerta" className="inline-flex size-10 items-center justify-center rounded-(--radius-control) text-text-3 hover:bg-surface-2 hover:text-loss">
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  );
}

export function AlertasVista() {
  const params = useSearchParams();
  const toast = useToast();
  const [alertas, setAlertas] = useState<Alerta[] | null>(null);
  const [foto, setFoto] = useState<FotoMercado | null>(null);
  const [crear, setCrear] = useState(params.get("nueva") === "1");

  useEffect(() => {
    let vivo = true;
    const leer = () => listarAlertas().then((a) => vivo && setAlertas(a));
    void leer();
    const desuscribir = alCambiarAlertas(() => void leer());
    return () => {
      vivo = false;
      desuscribir();
    };
  }, []);
  // La foto se vuelve a pedir cuando cambia la lista: así una alerta nueva de un activo trae su precio.
  const tickersAlertas = tickersDeAlertas(alertas ?? []).sort().join(",");
  useEffect(() => {
    let vivo = true;
    vencimientosLocales()
      .then((v) => fotoConActivos(tickersAlertas ? tickersAlertas.split(",") : [], v))
      .then((f) => vivo && f && setFoto(f))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [tickersAlertas]);

  const activas = alertas?.filter((a) => a.activa).length ?? 0;
  const lleno = activas >= LIMITE_GRATIS;

  return (
    <div className="flex flex-col gap-10" data-testid="alertas">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-label">Alertas activas</p>
          <p className="tabular text-hero">
            {activas}
            <span className="text-[0.4em] font-medium text-text-3"> de {LIMITE_GRATIS}</span>
          </p>
        </div>
        <Button variante="primario" tamano="lg" onClick={() => (lleno ? toast(`El plan gratuito permite ${LIMITE_GRATIS} alertas activas. Pausá una para crear otra.`) : setCrear(true))} data-testid="nueva-alerta">
          <Plus />
          Nueva alerta
        </Button>
      </div>

      {alertas && alertas.length === 0 ? (
        <EmptyState titulo="Todavía no tenés alertas." ayuda="Por ejemplo: avisame si el MEP pasa $ 1.650, si una billetera paga más de 25 % o si mi plazo fijo vence en 3 días." />
      ) : (
        <ul className="border-t border-border" data-testid="lista-alertas">
          {(alertas ?? []).map((a) => (
            <FilaAlerta
              key={a.id}
              alerta={a}
              foto={foto}
              onBorrar={async () => {
                await borrarAlerta(a.id);
                toast("Alerta borrada");
              }}
              onToggle={async () => {
                if (!a.activa && lleno) return toast(`Ya tenés ${LIMITE_GRATIS} alertas activas.`);
                await guardarAlerta({ ...a, activa: !a.activa });
              }}
            />
          ))}
        </ul>
      )}

      <div className="max-w-2xl text-chico text-text-2">
        <p className="mb-1 font-medium text-text">¿Cómo te avisamos?</p>
        Por ahora, dentro del sitio: mientras tengas {""}
        una pestaña abierta, revisamos tus alertas cada 3 minutos y te mostramos un aviso cuando se cumplen. Pronto: notificaciones en el celular, email y Telegram. Tus alertas se guardan solo en este navegador.
      </div>

      <Sheet abierto={crear} onCambio={setCrear} titulo="Nueva alerta">
        <FormAlerta
          onCrear={async (a) => {
            await guardarAlerta(a);
            setCrear(false);
            toast("Alerta creada");
          }}
        />
      </Sheet>
    </div>
  );
}

function FormAlerta({ onCrear }: { onCrear: (a: Alerta) => Promise<void> }) {
  const [tipo, setTipo] = useState<TipoAlerta>("precio");
  const [dolar, setDolar] = useState<TipoDolar>("mep");
  const [condicion, setCondicion] = useState<"mayor" | "menor">("mayor");
  const [valor, setValor] = useState(1650);
  const [tasa, setTasa] = useState(25);
  const [dias, setDias] = useState(3);
  const [activoSpread, setActivoSpread] = useState<"USD" | "USDT">("USD");

  const crear = () => {
    const base = { id: crypto.randomUUID(), creada: new Date().toISOString(), activa: true };
    const a: Alerta =
      tipo === "precio"
        ? { ...base, tipo, dolar, condicion, valor }
        : tipo === "tasa"
          ? { ...base, tipo, condicion: "mayor", valor: tasa / 100 }
          : tipo === "comparacion"
            ? { ...base, tipo }
            : tipo === "vencimiento"
              ? { ...base, tipo, dias }
              : { ...base, tipo, activo: activoSpread, condicion: "menor", valor };
    void onCrear(a);
  };

  const opcionesTipo: { valor: TipoAlerta; etiqueta: string; ayuda: string }[] = [
    { valor: "precio", etiqueta: "Precio del dólar", ayuda: "Avisame si el MEP pasa $ X" },
    { valor: "tasa", etiqueta: "Tasa", ayuda: "Si una billetera paga más de X %" },
    { valor: "comparacion", etiqueta: "Comparación", ayuda: "Si una LECAP rinde más que el plazo fijo" },
    { valor: "vencimiento", etiqueta: "Vencimiento", ayuda: "Si algo de mi cartera vence pronto" },
    { valor: "spread", etiqueta: "Dónde comprar", ayuda: "Si comprar dólares cuesta menos de $ X" },
  ];

  return (
    <div className="flex flex-col gap-5" data-testid="form-alerta">
      <fieldset>
        <legend className="mb-2 text-label">Avisame cuando…</legend>
        <ul className="flex flex-col gap-2">
          {opcionesTipo.map((o) => (
            <li key={o.valor}>
              <button
                type="button"
                aria-pressed={tipo === o.valor}
                onClick={() => {
                  setTipo(o.valor);
                  if (o.valor === "spread") setValor(1560);
                  if (o.valor === "precio") setValor(1650);
                }}
                className={cn("flex w-full flex-col rounded-(--radius-control) border px-4 py-2.5 text-left transition-colors", tipo === o.valor ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong")}
              >
                <span className="text-[15px] font-medium">{o.etiqueta}</span>
                <span className="text-chico text-text-3">{o.ayuda}</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      {tipo === "precio" && (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-label">Dólar</span>
            <select value={dolar} onChange={(e) => setDolar(e.target.value as TipoDolar)} className="h-11 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3.5 text-[16px]">
              {(["mep", "oficial", "blue", "ccl", "cripto", "tarjeta"] as TipoDolar[]).map((d) => (
                <option key={d} value={d}>
                  {d === "mep" ? "MEP" : d === "ccl" ? "CCL" : d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <SegmentedControl
            etiqueta="Condición"
            ancho="lleno"
            valor={condicion}
            onChange={setCondicion}
            opciones={[
              { valor: "mayor", etiqueta: "Sube de" },
              { valor: "menor", etiqueta: "Baja de" },
            ]}
          />
          <MoneyInput etiqueta="Valor" valor={valor} onChange={setValor} />
        </>
      )}
      {tipo === "tasa" && <NumberField etiqueta="Más de" valor={tasa} onChange={setTasa} sufijo="% TNA" min={1} max={200} paso={0.5} decimales={1} />}
      {tipo === "vencimiento" && <NumberField etiqueta="Con anticipación de" valor={dias} onChange={(v) => setDias(Math.max(0, Math.round(v)))} sufijo="días" min={0} max={60} decimales={0} />}
      {tipo === "spread" && (
        <>
          <SegmentedControl
            etiqueta="Qué dólar"
            ancho="lleno"
            valor={activoSpread}
            onChange={setActivoSpread}
            opciones={[
              { valor: "USD", etiqueta: "Dólar" },
              { valor: "USDT", etiqueta: "USDT" },
            ]}
          />
          <MoneyInput etiqueta="Cuesta menos de" valor={valor} onChange={setValor} />
        </>
      )}
      <Button variante="primario" tamano="lg" onClick={crear} data-testid="crear-alerta">
        Crear alerta
      </Button>
    </div>
  );
}
