"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { LIQUIDEZ_OPCION } from "@/components/modules/pesos/etiquetas";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/estados";
import { MoneyInput, NumberField } from "@/components/ui/money-input";
import { SegmentedControl } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/toast";
import {
  caminoMeta,
  compararAlternativas,
  construirIndice,
  d,
  diasEntre,
  evaluarMeta,
  hitosMeta,
  hoyAR,
  nivelEnFecha,
  rendimientoReal,
  resumenMetas,
  sumarMeses,
  tasaPorPeriodo,
  vencimientos,
  type AporteMeta,
  type ContextoMeta,
  type EstadoMeta,
  type InstrumentoMeta,
  type Meta,
} from "@/lib/calculos";
import type { PuntoSerie } from "@/lib/data/types";
import { dinero, fechaCorta, mesAnio, pesosCompacto, porcentaje } from "@/lib/format";
import { alCambiarMetas, borrarMeta, guardarMeta, listarMetas } from "@/lib/metas/almacen";
import { aInstrumento, DOLARES_GUARDADOS, SIN_INVERTIR, TIPOS_INSTRUMENTO, type AlternativaUI, type OpcionInstrumento } from "@/lib/metas/instrumentos";
import { cn } from "@/lib/cn";
import { CaminoMeta } from "./camino";

/** La opción en pesos sin plazo que más rinde hoy. Es el supuesto del plan de las metas en pesos. */
export type ReferenciaMeta = { nombre: string; tea: number } | null;

type Props = {
  referencia: ReferenciaMeta;
  inflacionMensual: number | null;
  /** IPC mensual (fracción) de los últimos meses, para el rendimiento real. */
  ipc: PuntoSerie[];
  /** Dólar MEP de hoy (venta), para mostrar equivalencias. */
  mep: number | null;
  opciones: OpcionInstrumento[];
  /** La mejor opción de cada tipo, para comparar dónde poner lo de cada mes. */
  alternativas: AlternativaUI[];
};

/** Todo lo de hoy que necesita una tarjeta, además de la meta. */
type Datos = {
  hoy: string;
  contexto: ContextoMeta;
  referencia: ReferenciaMeta;
  mep: number | null;
  /** Índice de precios a una fecha (null si no hay IPC). */
  nivel: ((fecha: string) => number | null) | null;
  alternativas: AlternativaUI[];
};

const SUGERENCIAS = ["Un viaje", "Un auto", "Un departamento", "Estudios", "Fondo de emergencia"];
const MOVIMIENTOS_VISIBLES = 5;

const nuevoId = () => crypto.randomUUID();
/** "unos días", "un mes", "3 meses": cuánto después de la fecha de la meta llega. */
const tarde = (fechaMeta: string, llegada: string) => {
  const dias = diasEntre(fechaMeta, llegada);
  if (dias < 31) return "unos días";
  const meses = Math.round(dias / (365 / 12));
  return meses <= 1 ? "un mes" : `${meses} meses`;
};
const simbolo = (m: Meta["moneda"]) => (m === "ARS" ? "$" : "US$");

/** Equivalencia al MEP de hoy: pesos → dólares o dólares → pesos. Solo para mostrar. */
function alMep(monto: number, moneda: Meta["moneda"], mep: number | null): string | null {
  if (!mep || mep <= 0 || !Number.isFinite(monto)) return null;
  return moneda === "ARS" ? dinero(d(monto).div(mep).toNumber(), "USD", 0) : dinero(d(monto).mul(mep).toNumber(), "ARS", 0);
}

/**
 * Meta de ejemplo para quien todavía no armó ninguna: un viaje de $ 3 M en un año, con cuatro aportes mensuales (el último hoy) en la
 * mejor opción sin plazo de hoy. Los montos son de ejemplo; las tasas, la inflación y el dólar son los reales de hoy.
 */
function metaDeEjemplo(hoy: string, referencia: ReferenciaMeta, alternativas: AlternativaUI[]): Meta {
  // La misma opción que usa el plan (la mejor sin plazo con tope de al menos $ 1 M), para que todo cierre.
  const deLaLista = referencia ? alternativas.find((a) => a.nombre === referencia.nombre) : undefined;
  const instrumento: InstrumentoMeta = referencia
    ? { id: deLaLista?.id ?? "ejemplo", nombre: referencia.nombre, tipo: deLaLista?.tipo ?? "fci", tea: referencia.tea }
    : SIN_INVERTIR;
  const creada = sumarMeses(hoy, -3);
  return {
    id: "ejemplo",
    nombre: "Viaje a Bariloche",
    moneda: "ARS",
    objetivo: 3_000_000,
    fechaObjetivo: sumarMeses(hoy, 9),
    aporteMensual: 250_000,
    teaManual: null,
    creada,
    aportes: [0, 1, 2, 3].map((i) => ({ id: `ejemplo-${i}`, fecha: sumarMeses(creada, i), monto: 250_000, instrumento })),
    ajustes: [],
  };
}

/**
 * Metas de ahorro: cada persona arma las suyas (nombre, monto, fecha, cuánto puede poner por mes) y va cargando
 * cuánto pone y en qué instrumento. Ve cuánto vale hoy cada parte, cuánto le dieron sus inversiones (también contra la
 * inflación), el camino para llegar con las tasas de hoy, dónde rendiría más lo de cada mes y cuándo vence cada plazo.
 */
export function Metas({ referencia, inflacionMensual, ipc, mep, opciones, alternativas }: Props) {
  const toast = useToast();
  const [metas, setMetas] = useState<Meta[] | null>(null);
  // La fecha solo se usa después de leer las metas del navegador (nunca en el HTML del servidor).
  const [hoy] = useState(() => hoyAR());
  const [nueva, setNueva] = useState<string | false>(false);
  const [movimientoDe, setMovimientoDe] = useState<Meta | null>(null);
  const [valoresDe, setValoresDe] = useState<Meta | null>(null);

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

  const contexto: ContextoMeta = useMemo(() => ({ teaReferencia: referencia?.tea ?? 0, inflacionMensual: inflacionMensual ?? 0 }), [referencia, inflacionMensual]);
  // Índice de precios con el IPC publicado; después del último dato se proyecta con la inflación esperada del REM.
  const nivel = useMemo(() => {
    if (ipc.length === 0) return null;
    const indice = construirIndice(ipc.map((p) => ({ fecha: p.fecha, valor: p.valor * 100 })));
    const proyectada = inflacionMensual !== null ? inflacionMensual * 100 : undefined;
    return (fecha: string) => nivelEnFecha(indice, fecha, proyectada)?.toNumber() ?? null;
  }, [ipc, inflacionMensual]);
  const datos: Datos = { hoy, contexto, referencia, mep, nivel, alternativas };

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

  const evaluadas = metas.map((meta) => ({ meta, estado: evaluarMeta(meta, contexto, hoy) }));
  const ejemplo = metas.length === 0 ? metaDeEjemplo(hoy, referencia, alternativas) : null;

  return (
    <>
      {metas.length === 0 ? (
        <EmptyState
          titulo="Todavía no armaste ninguna meta."
          ayuda="Elegí qué querés lograr, cuánto cuesta y para cuándo. Después vas cargando cuánto ponés y dónde, y te decimos cómo venís."
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
          {metas.length > 1 && <Resumen lista={evaluadas} mep={mep} />}
          <div className="mb-2 flex justify-end">
            <Button variante="primario" onClick={() => setNueva("")}>
              <Plus /> Nueva meta
            </Button>
          </div>
          <ul className="border-t border-border">
            {evaluadas.map(({ meta: m, estado }) => (
              <TarjetaMeta
                key={m.id}
                meta={m}
                estado={estado}
                datos={datos}
                onSumar={() => setMovimientoDe(m)}
                onValores={() => setValoresDe(m)}
                onBorrarMovimiento={async (a) => {
                  await guardarMeta({ ...m, aportes: m.aportes.filter((x) => x.id !== a.id) });
                  toast("Movimiento borrado.", { etiqueta: "Deshacer", onClick: () => void guardarMeta(m) });
                }}
                onBorrar={async () => {
                  await borrarMeta(m.id);
                  toast(`Borraste "${m.nombre}".`, { etiqueta: "Deshacer", onClick: () => void guardarMeta(m) });
                }}
              />
            ))}
          </ul>
        </>
      )}

      {ejemplo && (
        <section aria-labelledby="titulo-ejemplo" className="mt-6">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-3">
            <h2 id="titulo-ejemplo" className="text-label">
              Así se ve una meta
            </h2>
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-micro text-text-2">Datos de ejemplo</span>
            <span className="text-micro text-text-3">Los montos son inventados; las tasas, la inflación y el dólar son los de hoy.</span>
          </div>
          <ul>
            <TarjetaMeta meta={ejemplo} estado={evaluarMeta(ejemplo, contexto, hoy)} datos={datos} ejemplo />
          </ul>
        </section>
      )}

      <p className="mt-8 max-w-2xl text-micro">
        Los valores de cada instrumento son estimados con la tasa del día en que pusiste la plata; corregilos con lo que te muestra tu app cuando quieras. El plan usa las tasas y la
        inflación esperada de hoy, que cambian todos los días: no es una promesa de rendimiento ni una recomendación. Tus metas se guardan solo en este navegador.{" "}
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
        opciones={opciones}
        onCerrar={() => setNueva(false)}
        onGuardar={async (m) => {
          await guardarMeta(m);
          setNueva(false);
          toast(`Listo, "${m.nombre}" quedó guardada.`);
        }}
      />
      <Sheet abierto={movimientoDe !== null} onCambio={(a) => !a && setMovimientoDe(null)} titulo={movimientoDe?.nombre ?? ""} descripcion="Cuánta plata pusiste o sacaste, y dónde.">
        {movimientoDe && (
          <FormMovimiento
            key={movimientoDe.id + movimientoDe.aportes.length}
            meta={movimientoDe}
            hoy={hoy}
            opciones={opciones}
            onGuardar={async (a) => {
              await guardarMeta({ ...movimientoDe, aportes: [...movimientoDe.aportes, a] });
              setMovimientoDe(null);
              toast(a.monto >= 0 ? "Sumado. El plan se recalculó con las tasas de hoy." : "Anotado el retiro.");
            }}
          />
        )}
      </Sheet>
      <Sheet abierto={valoresDe !== null} onCambio={(a) => !a && setValoresDe(null)} titulo="Valores de hoy" descripcion="Copiá lo que te muestra tu banco, billetera o broker. Reemplaza nuestra estimación.">
        {valoresDe && (
          <FormValores
            key={valoresDe.id + valoresDe.ajustes.length}
            meta={valoresDe}
            estado={evaluarMeta(valoresDe, contexto, hoy)}
            hoy={hoy}
            onGuardar={async (m) => {
              await guardarMeta(m);
              setValoresDe(null);
              toast("Valores actualizados.");
            }}
          />
        )}
      </Sheet>
    </>
  );
}

/** Totales de todas las metas, por moneda: lo juntado, lo que dieron las inversiones y lo que hay que poner por mes. */
function Resumen({ lista, mep }: { lista: { meta: Meta; estado: EstadoMeta }[]; mep: number | null }) {
  const resumen = resumenMetas(lista);
  return (
    <section aria-label="Resumen de tus metas" className="mb-8 flex flex-col gap-6">
      {resumen.map((r) => {
        const $ = (x: number) => dinero(x, r.moneda, 0);
        const equivalente = alMep(r.saldo, r.moneda, mep);
        return (
          <div key={r.moneda} className="flex flex-col gap-3">
            <p className="text-chico text-text-2">
              {r.cantidad} {r.cantidad === 1 ? "meta" : "metas"} en {r.moneda === "ARS" ? "pesos" : "dólares"}
              {r.cumplidas > 0 && <> · {r.cumplidas} cumplida{r.cumplidas === 1 ? "" : "s"}</>}
              {r.pendientes > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-text">
                    {r.pendientes} {r.pendientes === 1 ? "espera" : "esperan"} que cargues lo de este mes
                  </span>
                </>
              )}
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
              <Dato etiqueta="Juntaste" valor={$(r.saldo)} detalle={equivalente ? `≈ ${equivalente} al MEP` : undefined} />
              <Dato etiqueta="Pusiste" valor={$(r.aportado)} />
              <Dato
                etiqueta="Te dieron tus inversiones"
                valor={Math.round(r.ganancia) === 0 ? $(0) : `${r.ganancia > 0 ? "+" : "−"}${$(Math.abs(r.ganancia))}`}
                clase={Math.round(r.ganancia) === 0 ? undefined : r.ganancia > 0 ? "text-gain" : "text-loss"}
              />
              <Dato etiqueta={r.cantidad - r.cumplidas > 1 ? "Por mes, para llegar a todas" : "Por mes, para llegar"} valor={$(r.aporteNecesario)} />
            </dl>
          </div>
        );
      })}
    </section>
  );
}

function Dato({ etiqueta, valor, detalle, clase }: { etiqueta: string; valor: string; detalle?: string; clase?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-label">{etiqueta}</dt>
      <dd className={cn("tabular text-h3", clase)}>{valor}</dd>
      {detalle && <dd className="tabular text-micro text-text-3">{detalle}</dd>}
    </div>
  );
}

function TarjetaMeta({
  meta,
  estado: e,
  datos,
  ejemplo = false,
  onSumar,
  onValores,
  onBorrarMovimiento,
  onBorrar,
}: {
  meta: Meta;
  estado: EstadoMeta;
  datos: Datos;
  /** Meta de ejemplo: solo lectura, sin botones. */
  ejemplo?: boolean;
  onSumar?: () => void;
  onValores?: () => void;
  onBorrarMovimiento?: (a: AporteMeta) => void;
  onBorrar?: () => void;
}) {
  const { hoy, contexto, referencia, mep, nivel, alternativas } = datos;
  const [verTodo, setVerTodo] = useState(false);
  const $ = (x: number) => dinero(x, meta.moneda, 0);
  const otra = (x: number) => alMep(x, meta.moneda, mep);
  const marca = e.objetivoHoy > 0 ? Math.min(1, Math.max(0, e.esperadoHoy / e.objetivoHoy)) : 0;
  const ajusta = meta.moneda === "ARS" && Math.round(e.objetivoFinal) !== Math.round(meta.objetivo);
  const movimientos = [...meta.aportes].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const visibles = verTodo ? movimientos : movimientos.slice(0, MOVIMIENTOS_VISIBLES);
  const arranco = meta.aportes.length > 0 || e.esperadoHoy > 0;
  const faltan = Math.max(0, e.objetivoHoy - e.saldo);

  // Rendimiento real (solo pesos): lo que puso, actualizado por inflación hasta hoy, contra lo que tiene.
  const real = meta.moneda === "ARS" && nivel ? rendimientoReal(meta.aportes, e.saldo, hoy, nivel) : null;
  const venc = vencimientos(meta.aportes, hoy);

  // Camino: con lo que planeó poner por mes (o, si no dijo, con lo necesario para llegar en fecha).
  const aportePlan = meta.aporteMensual > 0 ? meta.aporteMensual : e.aporteNecesario;
  const base = Math.max(1, e.mesesRestantes);
  const horizonte = aportePlan > 0 && e.mesesConTuAporte !== null ? Math.min(Math.max(base, e.mesesConTuAporte), base * 2 + 6) : base;
  const camino = e.cumplida
    ? []
    : caminoMeta({
        saldo: e.saldo,
        aportado: e.aportado,
        aporte: aportePlan,
        tasaSaldo: tasaPorPeriodo(e.teaSaldo, 12),
        tasaAporte: tasaPorPeriodo(e.teaPlan, 12),
        objetivoHoy: e.objetivoHoy,
        inflacionMensual: meta.moneda === "ARS" ? contexto.inflacionMensual : 0,
        meses: horizonte,
      });
  const hitos = hitosMeta(camino).filter((h) => h.mes !== null && h.mes > 0 && h.proporcion > e.avance);
  const comparadas = meta.moneda === "ARS" && !e.cumplida ? compararAlternativas(meta, contexto, hoy, alternativas) : [];

  return (
    <li className="flex flex-col gap-6 border-b border-border py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-h3 break-words">{meta.nombre}</h3>
          <p className="mt-1 text-chico text-text-2">
            {$(meta.objetivo)} para {mesAnio(meta.fechaObjetivo)}
            {ajusta && <> · con la inflación esperada, unos {$(e.objetivoFinal)}</>}
            {meta.moneda === "USD" && otra(meta.objetivo) && <> · ≈ {otra(meta.objetivo)} al MEP de hoy</>}
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
            {otra(e.saldo) && e.saldo > 0 && <span className="tabular block text-micro">≈ {otra(e.saldo)} al MEP</span>}
          </span>
          {!e.cumplida && (
            <span className="text-right">
              Te faltan <span className="tabular font-medium text-text">{$(faltan)}</span>
              {otra(faltan) && <span className="tabular block text-micro">≈ {otra(faltan)} al MEP</span>}
            </span>
          )}
        </div>
      </div>

      {e.tenencias.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h4 className="text-label">Dónde está tu plata</h4>
            <p className="text-chico text-text-2">
              Pusiste <span className="tabular font-medium text-text">{$(e.aportado)}</span>
              {Math.round(e.ganancia) !== 0 && (
                <>
                  {" · "}tus inversiones te dieron{" "}
                  <span className={cn("tabular font-medium", e.ganancia > 0 ? "text-gain" : "text-loss")}>
                    {e.ganancia > 0 ? "+" : "−"}
                    {$(Math.abs(e.ganancia))}
                  </span>
                </>
              )}
            </p>
            {real && Math.round(real.aportadoHoy) !== Math.round(e.aportado) && (
              <p className="text-chico text-text-2">
                Descontando la inflación, lo que pusiste hoy equivale a <span className="tabular">{$(real.aportadoHoy)}</span>:{" "}
                {Math.abs(real.gananciaReal) < Math.abs(real.aportadoHoy) * 0.005 ? (
                  <span className="font-medium text-text">quedaste parejo con la inflación</span>
                ) : real.gananciaReal >= 0 ? (
                  <span className="font-medium text-gain">le ganaste por +{$(real.gananciaReal)}</span>
                ) : (
                  <span className="font-medium text-loss">la inflación se comió −{$(-real.gananciaReal)}</span>
                )}
                .
              </p>
            )}
          </div>
          <table className="w-full text-[15px]">
            <thead className="sr-only">
              <tr>
                <th>Instrumento</th>
                <th>Pusiste</th>
                <th>Vale hoy</th>
              </tr>
            </thead>
            <tbody>
              {e.tenencias.map((t) => (
                <tr key={t.instrumento.id} className="border-t border-border">
                  <td className="py-3 pr-3">
                    <span className="block font-medium">{t.instrumento.nombre}</span>
                    {/* "Sin invertir" y "Dólares guardados" ya se explican solos: sin subtítulo. */}
                    {t.instrumento.tipo !== "efectivo" && t.instrumento.tipo !== "dolares" && (
                      <span className="text-chico text-text-3">
                        {TIPOS_INSTRUMENTO[t.instrumento.tipo] ?? "Otro"}
                        {t.instrumento.tea > 0 && <> · {porcentaje(t.instrumento.tea, 1)} TEA</>}
                      </span>
                    )}
                  </td>
                  <td className="tabular py-3 pr-3 text-right align-top text-text-2">
                    <span className="block text-micro text-text-3 sm:hidden">Pusiste</span>
                    {$(t.aportado)}
                  </td>
                  <td className="tabular py-3 text-right align-top font-medium">
                    <span className="block text-micro font-normal text-text-3 sm:hidden">Vale hoy</span>
                    {$(t.valor)}
                    {!t.valorReal && t.instrumento.tea > 0 && <span className="block text-micro font-normal text-text-3">estimado</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {e.comparacion && referencia && (
            <p className="max-w-2xl text-chico text-text-2">
              Lo tuyo rinde en promedio {porcentaje(e.teaSaldo, 1)} TEA. Hoy {referencia.nombre}, la opción sin plazo que más rinde, paga {porcentaje(e.comparacion.teaReferencia, 1)}: con tu saldo
              serían <span className="tabular font-medium text-text">{$(e.comparacion.extraPorMes)}</span> más por mes.
            </p>
          )}
          {venc.length > 0 && (
            <ul className="flex flex-col gap-1 text-chico" aria-label="Vencimientos">
              {venc.map((v) => (
                <li key={v.aporteId} className="text-text-2">
                  <span className="font-medium text-text">{v.instrumento.nombre}</span> · {$(v.monto)} ·{" "}
                  {v.vencido ? (
                    <span className="text-warn">venció el {fechaCorta(v.vence)}</span>
                  ) : (
                    <>vence el {fechaCorta(v.vence)}</>
                  )}
                  {v.vencido && " — si lo renovaste no hace falta hacer nada; si lo moviste, cargalo con “Sumar plata”."}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex max-w-2xl flex-col gap-1.5 text-[16px] leading-[24px] text-text-2">
        {e.cumplida ? (
          <p className="font-medium text-text">Llegaste a la meta.</p>
        ) : (
          <>
            {arranco && Math.abs(e.diferencia) >= 1 && (
              <p>
                {e.diferencia >= 0 ? (
                  <span className="font-medium text-gain">Vas adelantado: +{$(e.diferencia)}</span>
                ) : (
                  <span className="font-medium text-warn">Vas atrasado: −{$(-e.diferencia)}</span>
                )}{" "}
                contra el plan (la rayita de la barra).
              </p>
            )}
            <p>
              Para llegar en {mesAnio(meta.fechaObjetivo)} tenés que poner <span className="tabular font-medium text-text">{$(e.aporteNecesario)}</span> por mes
              {e.mesesRestantes > 0 ? ` durante ${e.mesesRestantes} ${e.mesesRestantes === 1 ? "mes" : "meses"}` : ""}
              {meta.moneda === "USD" && otra(e.aporteNecesario) && e.aporteNecesario > 0 ? ` (≈ ${otra(e.aporteNecesario)} al MEP)` : ""}.
            </p>
            {meta.aporteMensual > 0 && (
              <p>
                Con los {$(meta.aporteMensual)} por mes que planeaste,{" "}
                {e.mesesConTuAporte === null ? (
                  "no llegás: la meta sube más rápido de lo que juntás."
                ) : e.llegaEnFecha ? (
                  <>llegás a tiempo ({mesAnio(sumarMeses(hoy, e.mesesConTuAporte))}).</>
                ) : (
                  <>
                    llegás el {fechaCorta(sumarMeses(hoy, e.mesesConTuAporte), true)}, {tarde(meta.fechaObjetivo, sumarMeses(hoy, e.mesesConTuAporte))} después de lo que querías.
                  </>
                )}
              </p>
            )}
          </>
        )}
        <p className="text-chico text-text-3">
          {meta.teaManual !== null
            ? `Lo que pongas de acá en adelante, al ${porcentaje(e.teaPlan, 1)} anual que elegiste.`
            : meta.moneda === "USD"
              ? "Lo que pongas de acá en adelante, en dólares sin rendimiento."
              : referencia
                ? `Lo que pongas de acá en adelante, en ${referencia.nombre} (${porcentaje(e.teaPlan, 1)} TEA, la opción sin plazo que más rinde hoy).`
                : "Sin rendimiento para lo nuevo: hoy no pudimos traer las tasas."}
          {meta.moneda === "ARS" && contexto.inflacionMensual > 0 && <> Inflación esperada: {porcentaje(contexto.inflacionMensual, 1)} por mes (REM).</>}
        </p>
      </div>

      {camino.length > 1 && aportePlan > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h4 className="text-label">Camino a la meta, poniendo {$(aportePlan)} por mes</h4>
            {hitos.length > 0 && (
              <p className="text-chico text-text-2">
                {hitos.map((h, i) => (
                  <span key={h.proporcion}>
                    {i > 0 && " · "}
                    {h.proporcion === 1 ? "La meta" : `El ${porcentaje(h.proporcion, 0)}`} en <span className="tabular font-medium text-text">{mesAnio(sumarMeses(hoy, h.mes!))}</span>
                  </span>
                ))}
              </p>
            )}
          </div>
          <CaminoMeta puntos={camino} mesMeta={e.mesesRestantes} formatoY={(v) => pesosCompacto(v, simbolo(meta.moneda))} etiquetaMes={(n) => mesAnio(sumarMeses(hoy, n))} />
        </div>
      )}

      {comparadas.length > 1 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-[15px] font-medium text-text marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="underline decoration-border-strong decoration-dotted underline-offset-4 group-open:no-underline">¿Dónde rinde más lo que pongas cada mes?</span>
            <span aria-hidden className="ml-2 inline-block text-text-3 transition-transform group-open:rotate-90">
              →
            </span>
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-[14px]">
              <thead>
                <tr className="text-left text-micro text-text-3">
                  <th className="pb-2 font-normal">La mejor de cada tipo hoy</th>
                  <th className="pb-2 text-right font-normal">TEA</th>
                  <th className="pb-2 text-right font-normal">Por mes para llegar</th>
                  {meta.aporteMensual > 0 && <th className="pb-2 text-right font-normal">Con {$(meta.aporteMensual)} llegás</th>}
                </tr>
              </thead>
              <tbody>
                {comparadas.map((c) => {
                  const alt = alternativas.find((a) => a.id === c.alternativa.id);
                  return (
                    <tr key={c.alternativa.id} className="border-t border-border">
                      <td className="py-2.5 pr-3">
                        <span className="block font-medium">{c.alternativa.nombre}</span>
                        <span className="text-micro text-text-3">
                          {TIPOS_INSTRUMENTO[c.alternativa.tipo] ?? c.alternativa.tipo}
                          {alt && <> · {LIQUIDEZ_OPCION[alt.liquidez]}</>}
                          {alt?.tope ? <> · esa tasa, hasta {dinero(alt.tope, "ARS", 0)}</> : null}
                        </span>
                      </td>
                      <td className="tabular py-2.5 pr-3 text-right">{porcentaje(c.alternativa.tea, 1)}</td>
                      <td className="tabular py-2.5 pr-3 text-right font-medium">{$(c.aporteNecesario)}</td>
                      {meta.aporteMensual > 0 && (
                        <td className="tabular py-2.5 text-right">{c.mesesConTuAporte === null ? "No llegás" : c.llegaEnFecha ? "A tiempo" : mesAnio(sumarMeses(hoy, c.mesesConTuAporte))}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 max-w-2xl text-micro text-text-3">
            Ordenado solo por tasa. Plazos fijos y letras dejan la plata quieta hasta que vencen y hay que renovarlos; las billeteras y fondos la tienen disponible al instante. Es una comparación,
            no una recomendación.
          </p>
        </details>
      )}

      {movimientos.length > 0 && (
        <div>
          <h4 className="mb-1 text-label">Movimientos</h4>
          <ul className="text-chico">
            {visibles.map((a) => (
              <li key={a.id} className="flex min-h-9 items-center gap-3 border-b border-border py-1.5 last:border-0">
                <span className="w-16 shrink-0 text-text-3">{fechaCorta(a.fecha)}</span>
                <span className="min-w-0 flex-1 truncate text-text-2">{a.instrumento.nombre}</span>
                <span className={cn("tabular font-medium", a.monto < 0 && "text-text-2")}>
                  {a.monto >= 0 ? "+" : "−"}
                  {$(Math.abs(a.monto))}
                </span>
                {onBorrarMovimiento && (
                  <button
                    type="button"
                    onClick={() => onBorrarMovimiento(a)}
                    aria-label={`Borrar el movimiento del ${fechaCorta(a.fecha)}`}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-(--radius-control) text-text-3 hover:bg-surface-2 hover:text-loss"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {movimientos.length > MOVIMIENTOS_VISIBLES && (
            <button type="button" onClick={() => setVerTodo((v) => !v)} className="mt-1 text-chico text-text-2 underline decoration-border-strong decoration-dotted underline-offset-4 hover:text-text">
              {verTodo ? "Ver menos" : `Ver los ${movimientos.length}`}
            </button>
          )}
        </div>
      )}

      {!ejemplo && (
        <div className="flex flex-wrap items-center gap-3">
          {!e.cumplida && onSumar && (
            <Button variante={e.controlPendiente || meta.aportes.length === 0 ? "primario" : "secundario"} tamano="sm" onClick={onSumar}>
              <Plus /> Sumar plata
            </Button>
          )}
          {onValores && e.tenencias.some((t) => t.instrumento.tea > 0) && (
            <Button variante="fantasma" tamano="sm" onClick={onValores}>
              Actualizar valores
            </Button>
          )}
          {e.controlPendiente && <span className="text-chico text-text-2">Pasaron {e.diasDesdeMovimiento} días: ¿cuánto pusiste este mes?</span>}
          {onBorrar && (
            <button
              type="button"
              onClick={onBorrar}
              aria-label={`Borrar la meta ${meta.nombre}`}
              className="ml-auto inline-flex size-10 items-center justify-center rounded-(--radius-control) text-text-3 hover:bg-surface-2 hover:text-loss"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** Lo que el selector muestra elegido al abrir: el último instrumento usado, o "sin invertir" / "dólares guardados". */
function instrumentoInicial(moneda: Meta["moneda"], usados: InstrumentoMeta[], opciones: OpcionInstrumento[]): InstrumentoMeta {
  const u = usados[0];
  if (!u) return moneda === "ARS" ? SIN_INVERTIR : DOLARES_GUARDADOS;
  // Si es una opción del comparador, la TEA se actualiza a la de hoy.
  const deHoy = opciones.find((o) => o.id === u.id);
  return deHoy ? aInstrumento(deHoy) : u;
}

/**
 * Selector de instrumento: primero los que ya usa la meta, después las opciones reales de hoy agrupadas por tipo,
 * y al final "sin invertir" y "otro" (nombre y TEA a mano). En dólares: dólares guardados u otro.
 */
function ElegirInstrumento({
  moneda,
  opciones,
  usados,
  soloUsados = false,
  onChange,
}: {
  moneda: Meta["moneda"];
  opciones: OpcionInstrumento[];
  usados: InstrumentoMeta[];
  soloUsados?: boolean;
  onChange: (i: InstrumentoMeta | null) => void;
}) {
  const id = useId();
  const base = moneda === "ARS" ? SIN_INVERTIR : DOLARES_GUARDADOS;
  const inicial = usados[0]?.id ?? base.id;
  const [valor, setValor] = useState(inicial);
  const [nombreOtro, setNombreOtro] = useState("");
  const [teaOtro, setTeaOtro] = useState(0);

  const grupos = useMemo(() => {
    const porTipo = new Map<string, OpcionInstrumento[]>();
    if (moneda === "ARS") for (const o of opciones) porTipo.set(o.tipo, [...(porTipo.get(o.tipo) ?? []), o]);
    return [...porTipo.entries()];
  }, [moneda, opciones]);

  const resolver = (v: string, nombre = nombreOtro, tea = teaOtro): InstrumentoMeta | null => {
    if (v === "otro") return nombre.trim() ? { id: `otro-${nombre.trim().toLowerCase()}`, nombre: nombre.trim(), tipo: "otro", tea: tea / 100 } : null;
    const usado = usados.find((u) => u.id === v);
    if (usado) {
      // Si es una opción del comparador, la TEA se actualiza a la de hoy.
      const deHoy = opciones.find((o) => o.id === v);
      return deHoy ? aInstrumento(deHoy) : usado;
    }
    if (v === base.id) return base;
    const o = opciones.find((x) => x.id === v);
    return o ? aInstrumento(o) : null;
  };

  const cambiar = (v: string, nombre?: string, tea?: number) => {
    setValor(v);
    if (nombre !== undefined) setNombreOtro(nombre);
    if (tea !== undefined) setTeaOtro(tea);
    onChange(resolver(v, nombre ?? nombreOtro, tea ?? teaOtro));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-label">
          Dónde
        </label>
        <select
          id={id}
          value={valor}
          onChange={(ev) => cambiar(ev.target.value)}
          className="h-11 w-full min-w-0 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3 text-[16px] text-text outline-none transition-colors focus:border-accent focus:bg-surface"
        >
          {usados.length > 0 && (
            <optgroup label="Lo que ya usás en esta meta">
              {usados.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </optgroup>
          )}
          {!soloUsados && (
            <>
              {!usados.some((u) => u.id === base.id) && <option value={base.id}>{base.nombre}</option>}
              {grupos.map(([tipo, lista]) => (
                <optgroup key={tipo} label={`${TIPOS_INSTRUMENTO[tipo] ?? tipo} · rinden hoy`}>
                  {lista
                    .filter((o) => !usados.some((u) => u.id === o.id))
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {aInstrumento(o).nombre} · {porcentaje(o.tea, 1)}
                      </option>
                    ))}
                </optgroup>
              ))}
              <option value="otro">Otro…</option>
            </>
          )}
        </select>
      </div>
      {valor === "otro" && (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-otro`} className="text-label">
              Nombre
            </label>
            <input
              id={`${id}-otro`}
              value={nombreOtro}
              maxLength={50}
              onChange={(ev) => cambiar("otro", ev.target.value)}
              placeholder={moneda === "ARS" ? "Ej.: CEDEARs en mi broker" : "Ej.: cuenta en dólares"}
              className="h-11 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3.5 text-[16px] text-text outline-none transition-colors placeholder:text-text-3 focus:border-accent focus:bg-surface"
            />
          </div>
          <NumberField etiqueta="Rinde por año" valor={teaOtro} onChange={(v) => cambiar("otro", undefined, v)} sufijo="% TEA" min={0} max={300} paso={1} decimales={1} />
        </div>
      )}
    </div>
  );
}

const claseFecha =
  "h-11 w-full rounded-(--radius-control) border border-border-strong bg-surface-2 px-3.5 text-[16px] text-text outline-none transition-colors focus:border-accent focus:bg-surface";

function FormMovimiento({ meta, hoy, opciones, onGuardar }: { meta: Meta; hoy: string; opciones: OpcionInstrumento[]; onGuardar: (a: AporteMeta) => void }) {
  const idFecha = useId();
  const [sentido, setSentido] = useState<"pongo" | "saco">("pongo");
  const [monto, setMonto] = useState(meta.aporteMensual);
  const [fecha, setFecha] = useState(hoy);
  const usados = useMemo(() => {
    const vistos = new Map<string, InstrumentoMeta>();
    for (const a of [...meta.aportes].sort((x, y) => y.fecha.localeCompare(x.fecha))) if (!vistos.has(a.instrumento.id)) vistos.set(a.instrumento.id, a.instrumento);
    return [...vistos.values()];
  }, [meta.aportes]);
  const [instrumento, setInstrumento] = useState<InstrumentoMeta | null>(() => instrumentoInicial(meta.moneda, usados, opciones));
  const valido = monto > 0 && instrumento !== null && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha <= hoy;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (valido) onGuardar({ id: nuevoId(), fecha, monto: sentido === "pongo" ? monto : -monto, instrumento: instrumento!, cargado: new Date().toISOString() });
      }}
    >
      {usados.length > 0 && (
        <SegmentedControl
          etiqueta="Qué hiciste"
          ancho="lleno"
          valor={sentido}
          onChange={(v) => {
            setSentido(v);
            setInstrumento(instrumentoInicial(meta.moneda, usados, opciones));
          }}
          opciones={[
            { valor: "pongo", etiqueta: "Puse plata" },
            { valor: "saco", etiqueta: "Saqué plata" },
          ]}
        />
      )}
      <MoneyInput etiqueta={sentido === "pongo" ? "Cuánto pusiste" : "Cuánto sacaste"} moneda={simbolo(meta.moneda)} valor={monto} onChange={setMonto} tamano="lg" />
      <ElegirInstrumento key={sentido} moneda={meta.moneda} opciones={opciones} usados={usados} soloUsados={sentido === "saco"} onChange={setInstrumento} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idFecha} className="text-label">
          Cuándo
        </label>
        <input id={idFecha} type="date" value={fecha} max={hoy} onChange={(ev) => setFecha(ev.target.value)} className={claseFecha} />
      </div>
      <Button type="submit" variante="primario" disabled={!valido}>
        Guardar
      </Button>
    </form>
  );
}

function FormValores({ meta, estado, hoy, onGuardar }: { meta: Meta; estado: EstadoMeta; hoy: string; onGuardar: (m: Meta) => void }) {
  const editables = estado.tenencias.filter((t) => t.instrumento.tea > 0);
  const [valores, setValores] = useState<Record<string, number>>(() => Object.fromEntries(editables.map((t) => [t.instrumento.id, Math.round(t.valor)])));

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        const nuevos = editables
          .filter((t) => Math.abs((valores[t.instrumento.id] ?? 0) - Math.round(t.valor)) >= 1)
          .map((t) => ({ id: nuevoId(), fecha: hoy, instrumentoId: t.instrumento.id, valor: valores[t.instrumento.id] ?? 0, cargado: new Date().toISOString() }));
        // Un ajuste por instrumento y por día: el nuevo reemplaza al de hoy.
        const ajustes = [...meta.ajustes.filter((j) => !(j.fecha === hoy && nuevos.some((x) => x.instrumentoId === j.instrumentoId))), ...nuevos];
        onGuardar({ ...meta, ajustes });
      }}
    >
      {editables.map((t) => (
        <div key={t.instrumento.id} className="flex flex-col gap-1">
          <MoneyInput etiqueta={t.instrumento.nombre} moneda={simbolo(meta.moneda)} valor={valores[t.instrumento.id] ?? 0} onChange={(v) => setValores((x) => ({ ...x, [t.instrumento.id]: v }))} />
          <p className="text-micro text-text-3">Estimado hoy: {dinero(t.valor, meta.moneda, 0)}</p>
        </div>
      ))}
      <Button type="submit" variante="primario">
        Guardar
      </Button>
    </form>
  );
}

function HojaNuevaMeta({
  abierta,
  nombreInicial,
  hoy,
  contexto,
  referencia,
  opciones,
  onCerrar,
  onGuardar,
}: {
  abierta: boolean;
  nombreInicial: string;
  hoy: string;
  contexto: ContextoMeta;
  referencia: ReferenciaMeta;
  opciones: OpcionInstrumento[];
  onCerrar: () => void;
  onGuardar: (m: Meta) => void;
}) {
  return (
    <Sheet abierto={abierta} onCambio={(a) => !a && onCerrar()} titulo="Nueva meta" descripcion="Cuánto cuesta lo que querés y para cuándo.">
      <FormNuevaMeta key={nombreInicial} nombreInicial={nombreInicial} hoy={hoy} contexto={contexto} referencia={referencia} opciones={opciones} onGuardar={onGuardar} />
    </Sheet>
  );
}

function FormNuevaMeta({
  nombreInicial,
  hoy,
  contexto,
  referencia,
  opciones,
  onGuardar,
}: {
  nombreInicial: string;
  hoy: string;
  contexto: ContextoMeta;
  referencia: ReferenciaMeta;
  opciones: OpcionInstrumento[];
  onGuardar: (m: Meta) => void;
}) {
  const idNombre = useId();
  const [nombre, setNombre] = useState(nombreInicial);
  const [moneda, setMoneda] = useState<Meta["moneda"]>("ARS");
  const [objetivo, setObjetivo] = useState(0);
  const [tenes, setTenes] = useState(0);
  const [donde, setDonde] = useState<InstrumentoMeta | null>(SIN_INVERTIR);
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
      aportes: tenes > 0 && donde ? [{ id: "inicial", fecha: hoy, monto: tenes, instrumento: donde }] : [],
      ajustes: [],
    }),
    [nombre, moneda, objetivo, hoy, meses, aporte, rinde, teaPropia, tenes, donde],
  );
  const e = evaluarMeta(borrador, contexto, hoy);
  const $ = (x: number) => dinero(x, moneda, 0);
  const valida = borrador.nombre.length > 0 && objetivo > 0 && (tenes === 0 || donde !== null);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (valida) onGuardar({ ...borrador, id: nuevoId(), aportes: borrador.aportes.map((a) => ({ ...a, id: nuevoId(), cargado: new Date().toISOString() })) });
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
        onChange={(v) => {
          setMoneda(v);
          setDonde(v === "ARS" ? SIN_INVERTIR : DOLARES_GUARDADOS);
        }}
        opciones={[
          { valor: "ARS", etiqueta: "En pesos" },
          { valor: "USD", etiqueta: "En dólares" },
        ]}
      />
      <MoneyInput etiqueta={moneda === "ARS" ? "Cuánto cuesta hoy" : "Cuánto cuesta"} moneda={simbolo(moneda)} valor={objetivo} onChange={setObjetivo} />
      <MoneyInput etiqueta="Ya tenés juntado" moneda={simbolo(moneda)} valor={tenes} onChange={setTenes} />
      {tenes > 0 && <ElegirInstrumento key={moneda} moneda={moneda} opciones={opciones} usados={[]} onChange={setDonde} />}
      <Slider etiqueta="Para cuándo" valor={meses} onChange={setMeses} min={1} max={120} formato={(v) => `${v} ${v === 1 ? "mes" : "meses"} · ${mesAnio(sumarMeses(hoy, v))}`} />
      <MoneyInput etiqueta="Podés poner por mes (opcional)" moneda={simbolo(moneda)} valor={aporte} onChange={setAporte} />
      {moneda === "ARS" ? (
        <>
          <SegmentedControl
            etiqueta="Lo que pongas cada mes, ¿cuánto rinde?"
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
                {moneda === "ARS" && Math.round(e.objetivoFinal) !== Math.round(objetivo) && <>Con la inflación esperada, en {mesAnio(borrador.fechaObjetivo)} va a costar unos {$(e.objetivoFinal)}. </>}
                {aporte > 0 &&
                  (e.mesesConTuAporte === null
                    ? `Con ${$(aporte)} por mes no llegás.`
                    : e.llegaEnFecha
                      ? `Con ${$(aporte)} por mes llegás a tiempo.`
                      : `Con ${$(aporte)} por mes llegás el ${fechaCorta(sumarMeses(hoy, e.mesesConTuAporte), true)}, ${tarde(borrador.fechaObjetivo, sumarMeses(hoy, e.mesesConTuAporte))} más tarde.`)}
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
