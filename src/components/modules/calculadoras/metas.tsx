"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/estados";
import { MoneyInput, NumberField } from "@/components/ui/money-input";
import { SegmentedControl } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/toast";
import { evaluarMeta, hoyAR, sumarMeses, type ContextoMeta, type EstadoMeta, type Meta } from "@/lib/calculos";
import { dinero, fechaCorta, mesAnio, porcentaje } from "@/lib/format";
import { alCambiarMetas, borrarMeta, guardarMeta, listarMetas } from "@/lib/metas/almacen";
import { cn } from "@/lib/cn";

/** La opción en pesos sin plazo que más rinde hoy. Es el supuesto de las metas en pesos. */
export type ReferenciaMeta = { nombre: string; tea: number } | null;

type Props = { referencia: ReferenciaMeta; inflacionMensual: number | null };

const SUGERENCIAS = ["Un viaje", "Un auto", "Un departamento", "Estudios", "Fondo de emergencia"];

/**
 * Metas de ahorro: cada persona arma las suyas (nombre, monto, fecha, cuánto puede poner por mes), ve el plan
 * para llegar con las tasas de hoy y cada 30 días carga cuánto tiene para ver si va adelantada o atrasada.
 */
export function Metas({ referencia, inflacionMensual }: Props) {
  const toast = useToast();
  const [metas, setMetas] = useState<Meta[] | null>(null);
  // La fecha solo se usa después de leer las metas del navegador (nunca en el HTML del servidor).
  const [hoy] = useState(() => hoyAR());
  const [nueva, setNueva] = useState<string | false>(false);
  const [controlDe, setControlDe] = useState<Meta | null>(null);

  useEffect(() => {
    let vivo = true;
    const leer = () => listarMetas().then((m) => vivo && setMetas(m));
    void leer();
    const desuscribir = alCambiarMetas(() => void leer());
    return () => {
      vivo = false;
      desuscribir();
    };
  }, []);

  const contexto: ContextoMeta = { teaReferencia: referencia?.tea ?? 0, inflacionMensual: inflacionMensual ?? 0 };

  if (metas === null) {
    return (
      <div aria-busy className="flex flex-col gap-6">
        <Skeleton className="h-12 w-40 rounded-full" />
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-4 border-t border-border py-8">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-5 w-72" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {metas.length === 0 ? (
        <EmptyState
          titulo="Todavía no armaste ninguna meta."
          ayuda="Elegí qué querés lograr, cuánto cuesta y para cuándo. Te decimos cuánto poner por mes y, cada 30 días, cómo venís."
          accion={
            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.map((s) => (
                <Button key={s} variante="secundario" tamano="sm" onClick={() => setNueva(s)}>
                  {s}
                </Button>
              ))}
              <Button variante="primario" tamano="sm" onClick={() => setNueva("")}>
                <Plus /> Otra
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="mb-2 flex justify-end">
            <Button variante="primario" onClick={() => setNueva("")}>
              <Plus /> Nueva meta
            </Button>
          </div>
          <ul className="border-t border-border">
            {metas.map((m) => (
              <TarjetaMeta
                key={m.id}
                meta={m}
                estado={evaluarMeta(m, contexto, hoy)}
                referencia={referencia}
                onControl={() => setControlDe(m)}
                onBorrar={async () => {
                  await borrarMeta(m.id);
                  toast(`Borraste "${m.nombre}".`, { etiqueta: "Deshacer", onClick: () => void guardarMeta(m) });
                }}
              />
            ))}
          </ul>
        </>
      )}

      <p className="mt-8 max-w-2xl text-micro">
        Es una simulación con las tasas y la inflación esperada de hoy, que cambian todos los días: no es una promesa de rendimiento ni una recomendación. Tus metas se guardan solo en este navegador.{" "}
        <Link href="/metodologia#metas" className="underline decoration-border-strong decoration-dotted underline-offset-4 hover:text-text">
          Ver la fórmula
        </Link>
      </p>

      <HojaNuevaMeta
        abierta={nueva !== false}
        nombreInicial={nueva || ""}
        hoy={hoy}
        contexto={contexto}
        referencia={referencia}
        onCerrar={() => setNueva(false)}
        onGuardar={async (m) => {
          await guardarMeta(m);
          setNueva(false);
          toast(`Listo, "${m.nombre}" quedó guardada.`);
        }}
      />
      <HojaControl
        meta={controlDe}
        hoy={hoy}
        onCerrar={() => setControlDe(null)}
        onGuardar={async (m) => {
          await guardarMeta(m);
          setControlDe(null);
          toast("Actualizado. El plan se recalculó con las tasas de hoy.");
        }}
      />
    </>
  );
}

function TarjetaMeta({ meta, estado: e, referencia, onControl, onBorrar }: { meta: Meta; estado: EstadoMeta; referencia: ReferenciaMeta; onControl: () => void; onBorrar: () => void }) {
  const $ = (x: number) => dinero(x, meta.moneda, 0);
  const ultimo = meta.controles.at(-1)!;
  const marca = e.objetivoHoy > 0 ? Math.min(1, Math.max(0, e.esperadoHoy / e.objetivoHoy)) : 0;
  const ajusta = meta.moneda === "ARS" && Math.round(e.objetivoFinal) !== Math.round(meta.objetivo);

  return (
    <li className="flex flex-col gap-5 border-b border-border py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-h3 break-words">{meta.nombre}</h3>
          <p className="mt-1 text-chico text-text-2">
            {$(meta.objetivo)} para {mesAnio(meta.fechaObjetivo)}
            {ajusta && <> · con la inflación esperada, unos {$(e.objetivoFinal)}</>}
          </p>
        </div>
        <p className="tabular shrink-0 text-h2">{porcentaje(e.avance, 0)}</p>
      </div>

      <div>
        <div
          role="progressbar"
          aria-label={`Avance de ${meta.nombre}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(e.avance * 100)}
          className="relative h-3 rounded-full bg-surface-2"
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-(--duration-base) ease-(--ease-standard)" style={{ width: `${e.avance * 100}%` }} />
          {!e.cumplida && marca > 0 && <span aria-hidden className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-text" style={{ left: `calc(${marca * 100}% - 1px)` }} />}
        </div>
        <div className="mt-2 flex justify-between gap-4 text-chico text-text-3">
          <span>
            Tenés <span className="tabular font-medium text-text">{$(e.saldo)}</span>
          </span>
          {!e.cumplida && (
            <span>
              Te faltan <span className="tabular font-medium text-text">{$(e.objetivoHoy - e.saldo)}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex max-w-2xl flex-col gap-1.5 text-[16px] leading-[24px] text-text-2">
        {e.cumplida ? (
          <p className="font-medium text-text">Llegaste a la meta.</p>
        ) : (
          <>
            {meta.controles.length > 1 || e.esperadoHoy > ultimo.saldo ? (
              <p>
                {e.diferencia >= 0 ? (
                  <span className="font-medium text-gain">Vas adelantado: +{$(e.diferencia)}</span>
                ) : (
                  <span className="font-medium text-warn">Vas atrasado: −{$(-e.diferencia)}</span>
                )}{" "}
                contra el plan (la rayita de la barra).
              </p>
            ) : null}
            <p>
              Para llegar en {mesAnio(meta.fechaObjetivo)} tenés que poner <span className="tabular font-medium text-text">{$(e.aporteNecesario)}</span> por mes
              {e.mesesRestantes > 0 ? ` durante ${e.mesesRestantes} ${e.mesesRestantes === 1 ? "mes" : "meses"}` : ""}.
            </p>
            {meta.aporteMensual > 0 && (
              <p>
                Con los {$(meta.aporteMensual)} por mes que planeaste,{" "}
                {e.mesesConTuAporte === null ? "no llegás: la meta sube más rápido de lo que juntás." : <>llegás en {mesAnio(sumarMeses(ultimo.fecha, e.mesesConTuAporte))}.</>}
              </p>
            )}
          </>
        )}
        <p className="text-chico text-text-3">
          {meta.teaManual !== null
            ? `Con el rendimiento que elegiste: ${porcentaje(e.tea, 1)} anual.`
            : meta.moneda === "USD"
              ? "Sin rendimiento: dólares guardados."
              : referencia
                ? `Si lo ponés en ${referencia.nombre}, la opción sin plazo que más rinde hoy (${porcentaje(e.tea, 1)} TEA).`
                : "Sin rendimiento: hoy no pudimos traer las tasas."}
        </p>
      </div>

      {meta.controles.length > 1 && (
        <ol className="flex flex-wrap gap-x-5 gap-y-1 text-chico text-text-3" aria-label="Historial">
          {meta.controles.map((c) => (
            <li key={c.fecha} className="tabular">
              {fechaCorta(c.fecha)} · {$(c.saldo)}
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!e.cumplida && (
          <Button variante={e.controlPendiente ? "primario" : "secundario"} tamano="sm" onClick={onControl}>
            Cargar cuánto tengo
          </Button>
        )}
        {e.controlPendiente && <span className="text-chico text-text-2">Pasaron {e.diasDesdeControl} días desde tu último control.</span>}
        <button
          type="button"
          onClick={onBorrar}
          aria-label={`Borrar la meta ${meta.nombre}`}
          className="ml-auto inline-flex size-10 items-center justify-center rounded-(--radius-control) text-text-3 hover:bg-surface-2 hover:text-loss"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}

function HojaNuevaMeta({
  abierta,
  nombreInicial,
  hoy,
  contexto,
  referencia,
  onCerrar,
  onGuardar,
}: {
  abierta: boolean;
  nombreInicial: string;
  hoy: string;
  contexto: ContextoMeta;
  referencia: ReferenciaMeta;
  onCerrar: () => void;
  onGuardar: (m: Meta) => void;
}) {
  return (
    <Sheet abierto={abierta} onCambio={(a) => !a && onCerrar()} titulo="Nueva meta" descripcion="Cuánto cuesta lo que querés y para cuándo.">
      <FormNuevaMeta key={nombreInicial} nombreInicial={nombreInicial} hoy={hoy} contexto={contexto} referencia={referencia} onGuardar={onGuardar} />
    </Sheet>
  );
}

function FormNuevaMeta({
  nombreInicial,
  hoy,
  contexto,
  referencia,
  onGuardar,
}: {
  nombreInicial: string;
  hoy: string;
  contexto: ContextoMeta;
  referencia: ReferenciaMeta;
  onGuardar: (m: Meta) => void;
}) {
  const idNombre = useId();
  const [nombre, setNombre] = useState(nombreInicial);
  const [moneda, setMoneda] = useState<Meta["moneda"]>("ARS");
  const [objetivo, setObjetivo] = useState(0);
  const [tenes, setTenes] = useState(0);
  const [meses, setMeses] = useState(12);
  const [aporte, setAporte] = useState(0);
  const [rinde, setRinde] = useState<"hoy" | "propio">("hoy");
  const [teaPropia, setTeaPropia] = useState(0);

  const borrador: Meta = useMemo(
    () => ({
      id: "borrador",
      nombre: nombre.trim(),
      moneda,
      objetivo,
      fechaObjetivo: sumarMeses(hoy, meses),
      aporteMensual: aporte,
      // Dólares sin rendimiento elegido = "dólares guardados" (null); en pesos, null = la mejor opción de hoy.
      teaManual: moneda === "USD" ? (teaPropia > 0 ? teaPropia / 100 : null) : rinde === "propio" ? teaPropia / 100 : null,
      creada: hoy,
      controles: [{ fecha: hoy, saldo: tenes }],
    }),
    [nombre, moneda, objetivo, hoy, meses, aporte, rinde, teaPropia, tenes],
  );
  const e = evaluarMeta(borrador, contexto, hoy);
  const $ = (x: number) => dinero(x, moneda, 0);
  const valida = borrador.nombre.length > 0 && objetivo > 0;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (valida) onGuardar({ ...borrador, id: crypto.randomUUID() });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idNombre} className="text-label">
          Qué querés lograr
        </label>
        <input
          id={idNombre}
          value={nombre}
          maxLength={60}
          onChange={(ev) => setNombre(ev.target.value)}
          placeholder="Ej.: viaje a Brasil"
          className="h-11 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3.5 text-[16px] text-text outline-none transition-colors placeholder:text-text-3 focus:border-accent focus:bg-surface"
        />
      </div>
      <SegmentedControl
        etiqueta="Moneda"
        ancho="lleno"
        valor={moneda}
        onChange={setMoneda}
        opciones={[
          { valor: "ARS", etiqueta: "En pesos" },
          { valor: "USD", etiqueta: "En dólares" },
        ]}
      />
      <MoneyInput etiqueta={moneda === "ARS" ? "Cuánto cuesta hoy" : "Cuánto cuesta"} moneda={moneda === "ARS" ? "$" : "US$"} valor={objetivo} onChange={setObjetivo} />
      <MoneyInput etiqueta="Ya tenés juntado" moneda={moneda === "ARS" ? "$" : "US$"} valor={tenes} onChange={setTenes} />
      <Slider etiqueta="Para cuándo" valor={meses} onChange={setMeses} min={1} max={120} formato={(v) => `${v} ${v === 1 ? "mes" : "meses"} · ${mesAnio(sumarMeses(hoy, v))}`} />
      <MoneyInput etiqueta="Podés poner por mes (opcional)" moneda={moneda === "ARS" ? "$" : "US$"} valor={aporte} onChange={setAporte} />
      {moneda === "ARS" ? (
        <>
          <SegmentedControl
            etiqueta="Rendimiento"
            ancho="lleno"
            tamano="sm"
            valor={rinde}
            onChange={setRinde}
            opciones={[
              { valor: "hoy", etiqueta: referencia ? `Lo mejor de hoy (${porcentaje(referencia.tea, 1)})` : "Lo mejor de hoy" },
              { valor: "propio", etiqueta: "Elijo yo" },
            ]}
          />
          {rinde === "propio" && <NumberField etiqueta="Rendimiento anual (TEA)" valor={teaPropia} onChange={setTeaPropia} sufijo="%" min={0} max={200} paso={1} decimales={1} />}
        </>
      ) : (
        <NumberField etiqueta="Rendimiento anual en dólares" valor={teaPropia} onChange={setTeaPropia} sufijo="%" min={0} max={20} paso={0.5} decimales={1} />
      )}

      {objetivo > 0 && (
        <div aria-live="polite" className="rounded-(--radius-card) bg-surface-2 px-5 py-4">
          {e.cumplida ? (
            <p className="text-[16px] font-medium">Con lo que ya tenés, llegás.</p>
          ) : (
            <>
              <p className="text-label">Tenés que poner por mes</p>
              <p className="tabular text-h2">{$(e.aporteNecesario)}</p>
              <p className="mt-1 text-chico text-text-2">
                {moneda === "ARS" && Math.round(e.objetivoFinal) !== Math.round(objetivo) && (
                  <>
                    Con la inflación esperada, en {mesAnio(borrador.fechaObjetivo)} va a costar unos {$(e.objetivoFinal)}.{" "}
                  </>
                )}
                {aporte > 0 && (e.mesesConTuAporte === null ? `Con ${$(aporte)} por mes no llegás.` : `Con ${$(aporte)} por mes llegás en ${mesAnio(sumarMeses(hoy, e.mesesConTuAporte))}.`)}
              </p>
            </>
          )}
        </div>
      )}

      <Button type="submit" variante="primario" disabled={!valida}>
        Guardar meta
      </Button>
    </form>
  );
}

function HojaControl({ meta, hoy, onCerrar, onGuardar }: { meta: Meta | null; hoy: string; onCerrar: () => void; onGuardar: (m: Meta) => void }) {
  return (
    <Sheet abierto={meta !== null} onCambio={(a) => !a && onCerrar()} titulo={meta ? meta.nombre : ""} descripcion="Cargá cuánto tenés juntado hoy para esta meta.">
      {meta && <FormControl key={meta.id + meta.controles.length} meta={meta} hoy={hoy} onGuardar={onGuardar} />}
    </Sheet>
  );
}

function FormControl({ meta, hoy, onGuardar }: { meta: Meta; hoy: string; onGuardar: (m: Meta) => void }) {
  const [saldo, setSaldo] = useState((meta.controles.at(-1)?.saldo ?? 0) + meta.aporteMensual);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        // Un control por día: si ya cargó hoy, se reemplaza.
        const controles = [...meta.controles.filter((c) => c.fecha !== hoy), { fecha: hoy, saldo }].sort((a, b) => a.fecha.localeCompare(b.fecha));
        onGuardar({ ...meta, controles });
      }}
    >
      <MoneyInput etiqueta="Tenés hoy" moneda={meta.moneda === "ARS" ? "$" : "US$"} valor={saldo} onChange={setSaldo} tamano="lg" />
      <p className={cn("text-chico text-text-2")}>
        La vez anterior ({fechaCorta(meta.controles.at(-1)!.fecha)}) tenías {dinero(meta.controles.at(-1)!.saldo, meta.moneda, 0)}.
      </p>
      <Button type="submit" variante="primario">
        Guardar
      </Button>
    </form>
  );
}
