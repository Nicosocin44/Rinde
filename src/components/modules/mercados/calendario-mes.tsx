"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Skeleton } from "@/components/ui/estados";
import { ProviderMark } from "@/components/ui/provider-mark";
import { SegmentedControl } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { filtrarDia, mesPermitido, sumarMesesISO, type DiaMes, type FiltroPais, type FiltroTipo, type MesCalendario, type MesISO } from "@/lib/calendario/mes";
import type { EventoCalendario, PaisEvento, TipoEvento } from "@/lib/calendario/semana";
import type { Cargado } from "@/lib/data/types";
import { cn } from "@/lib/cn";
import { useEsDesktop } from "@/lib/use-media";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const INICIALES = ["L", "M", "M", "J", "V"];
/** Lo que entra en cada día de la grilla (el resto, en "+N" y en el detalle del día). */
const LOGOS_POR_DIA = 3;
const EVENTOS_POR_DIA = 2;

/** Un color por tipo de evento (los categóricos del sitio, más oscuros en el tema claro): el mismo en los filtros, la grilla y el detalle. */
const COLOR: Record<TipoEvento, string> = { dato: "bg-(--cat-1)", tasa: "bg-(--cat-3)", empresa: "bg-(--cat-4)", bonos: "bg-(--cat-2)", lecap: "bg-(--cat-2)", opciones: "bg-(--cat-5)", feriado: "bg-(--cat-6)" };

const FILTROS: { valor: FiltroTipo; etiqueta: string; tipo?: TipoEvento }[] = [
  { valor: "todo", etiqueta: "Todo" },
  { valor: "dato", etiqueta: "Datos", tipo: "dato" },
  { valor: "tasa", etiqueta: "Tasas", tipo: "tasa" },
  { valor: "empresa", etiqueta: "Empresas", tipo: "empresa" },
  { valor: "bonos", etiqueta: "Bonos y letras", tipo: "bonos" },
  { valor: "opciones", etiqueta: "Opciones", tipo: "opciones" },
];

const PAISES: { valor: FiltroPais; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "AR", etiqueta: "Argentina" },
  { valor: "US", etiqueta: "EE.UU." },
];

const nombreMes = (mes: MesISO) => {
  const n = MESES[Number(mes.slice(5, 7)) - 1] ?? "";
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} ${mes.slice(0, 4)}`;
};
const indiceDia = (f: string) => (new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7; // 0 = lunes
const fechaLarga = (f: string) => `${DIAS[indiceDia(f)] ?? ""} ${Number(f.slice(8, 10))} de ${MESES[Number(f.slice(5, 7)) - 1] ?? ""}`;
const cuantosEn = (d: DiaMes) => d.eventos.length + d.empresas.length + d.masEmpresas;

/** Banderas chicas en SVG (los emojis de banderas no se ven en Windows). */
function Bandera({ pais }: { pais: PaisEvento }) {
  return pais === "AR" ? (
    <svg width="14" height="10" viewBox="0 0 14 10" aria-label="Argentina" role="img" className="shrink-0 rounded-[2px] ring-1 ring-border">
      <rect width="14" height="10" fill="#74acdf" />
      <rect y="3.33" width="14" height="3.34" fill="#fff" />
      <circle cx="7" cy="5" r="1.1" fill="#f6b40e" />
    </svg>
  ) : (
    <svg width="14" height="10" viewBox="0 0 14 10" aria-label="Estados Unidos" role="img" className="shrink-0 rounded-[2px] ring-1 ring-border">
      <rect width="14" height="10" fill="#fff" />
      {[0, 2, 4, 6, 8].map((y) => (
        <rect key={y} y={y} width="14" height="1" fill="#b22234" />
      ))}
      <rect width="6" height="5" fill="#3c3b6e" />
    </svg>
  );
}

const Punto = ({ tipo, className }: { tipo: TipoEvento; className?: string }) => <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", COLOR[tipo], className)} />;

/**
 * Calendario del mes de Mercados (punto 26). Un botón chico abre el mes: en la compu, una ventana grande en el medio con
 * la grilla y el detalle del día al costado; en el celular, un panel que sube desde abajo con el mes en puntos y la lista
 * del día. Mismo contenido que la semana (datos, tasas, empresas, bonos y letras, opciones, feriados), con filtros.
 */
export function CalendarioMes({ hoy, inicial, cuantos, cuando }: { hoy: string; inicial: MesISO; cuantos: number; cuando: string }) {
  const esDesktop = useEsDesktop();
  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState(inicial);
  const [meses, setMeses] = useState<Record<MesISO, MesCalendario>>({});
  const [fallo, setFallo] = useState<MesISO | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [tipo, setTipo] = useState<FiltroTipo>("todo");
  const [pais, setPais] = useState<FiltroPais>("todos");
  const pedidos = useRef(new Set<MesISO>());
  const boton = useRef<HTMLButtonElement>(null);

  const traer = async (destino: MesISO): Promise<boolean> => {
    if (meses[destino] || pedidos.current.has(destino) || !mesPermitido(destino, hoy)) return false;
    pedidos.current.add(destino);
    try {
      const r = (await (await fetch(`/api/calendario?mes=${destino}`)).json()) as Cargado<MesCalendario>;
      if (!r.ok) throw new Error(r.error);
      setMeses((x) => ({ ...x, [destino]: r.data }));
      return true;
    } finally {
      pedidos.current.delete(destino);
    }
  };
  // El mes pedido y, ya cargado, el siguiente de fondo: así pasar de mes no hace esperar (la primera vez tarda unos segundos).
  const cargar = async (destino: MesISO) => {
    setFallo(null);
    try {
      if (await traer(destino)) void traer(sumarMesesISO(destino, 1)).catch(() => undefined);
    } catch {
      setFallo(destino);
    }
  };

  const abrir = () => {
    setAbierto(true);
    void cargar(mes);
  };
  const ir = (destino: MesISO) => {
    setMes(destino);
    setElegido(null);
    void cargar(destino);
  };
  const anterior = sumarMesesISO(mes, -1);
  const siguiente = sumarMesesISO(mes, 1);

  const datos = meses[mes];
  const semanas = datos?.semanas.map((s) => s.map((d) => filtrarDia(d, tipo, pais))) ?? [];
  const delMes = semanas.flat().filter((d) => d.enMes);
  // El día que se ve al abrir: hoy (o el próximo hábil) si es de este mes; si no, el primero del mes.
  const dia = delMes.find((d) => d.fecha === elegido) ?? delMes.find((d) => d.fecha >= hoy) ?? delMes[0];
  const cerrar = () => setAbierto(false);

  const navegacion = (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => ir(anterior)} disabled={!mesPermitido(anterior, hoy)} aria-label={`Ver ${nombreMes(anterior)}`} className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-text-2 hover:text-text disabled:opacity-30">
        <ChevronLeft className="size-[18px]" />
      </button>
      <button type="button" onClick={() => ir(siguiente)} disabled={!mesPermitido(siguiente, hoy)} aria-label={`Ver ${nombreMes(siguiente)}`} className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-text-2 hover:text-text disabled:opacity-30">
        <ChevronRight className="size-[18px]" />
      </button>
    </div>
  );

  const filtros = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="sin-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Tipo de evento">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setTipo(f.valor)}
            aria-pressed={tipo === f.valor}
            className={cn("flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition-colors", tipo === f.valor ? "bg-inverse text-on-inverse" : "bg-surface-2 text-text hover:bg-border")}
          >
            {f.tipo && <Punto tipo={f.tipo} />}
            {f.etiqueta}
          </button>
        ))}
      </div>
      <SegmentedControl etiqueta="País" tamano="sm" valor={pais} onChange={setPais} opciones={PAISES.map((p) => ({ valor: p.valor, etiqueta: p.etiqueta }))} />
    </div>
  );

  const cargando = !datos && fallo !== mes;
  const error = !datos && fallo === mes && (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
      <p className="text-chico text-text-2">No pudimos traer el calendario de {nombreMes(mes).toLowerCase()}. Probá de nuevo en un rato.</p>
      <button type="button" onClick={() => void cargar(mes)} className="h-10 rounded-full bg-surface-2 px-4 text-[14px] font-semibold hover:bg-border">
        Reintentar
      </button>
    </div>
  );

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={abrir}
        onPointerEnter={() => void cargar(mes)}
        onFocus={() => void cargar(mes)}
        className="inline-flex h-11 items-center gap-2 self-start rounded-full border border-border-strong bg-surface px-4 text-[15px] font-semibold transition-colors hover:bg-surface-2 lg:self-auto"
      >
        <CalendarDays aria-hidden className="size-[18px]" />
        Calendario
        {cuantos > 0 && (
          <span className="font-medium text-text-2">
            · {cuantos} {cuando}
          </span>
        )}
      </button>

      {/* Compu: ventana grande en el medio. */}
      <Dialog.Root open={abierto && esDesktop} onOpenChange={setAbierto}>
        <AnimatePresence>
          {abierto && esDesktop && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <m.div className="fixed inset-0 z-50 bg-scrim backdrop-blur-[6px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.18 } }} />
              </Dialog.Overlay>
              <Dialog.Content
                asChild
                forceMount
                // Al cerrar, el foco vuelve al botón (el botón está fuera de Dialog.Trigger).
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                  boton.current?.focus();
                }}
              >
                <m.div
                  className="fixed inset-0 z-50 m-auto flex h-[min(800px,calc(100dvh-48px))] w-[min(1120px,calc(100vw-48px))] flex-col gap-4 rounded-(--radius-panel) bg-surface p-6 shadow-(--shadow-overlay) outline-none"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.16 } }}
                  transition={{ type: "spring", stiffness: 420, damping: 36, mass: 1 }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Dialog.Title className="text-h2">{nombreMes(mes)}</Dialog.Title>
                      {navegacion}
                    </div>
                    <Dialog.Close aria-label="Cerrar" className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-text-2 hover:text-text">
                      <X className="size-[18px]" />
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="sr-only">Datos, tasas, resultados de empresas, pagos de bonos y vencimientos del mes. Horarios de Argentina.</Dialog.Description>
                  {filtros}
                  <div className="flex min-h-0 flex-1 gap-5">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="grid grid-cols-5 px-1 text-micro text-text-3">
                        {DIAS.map((d) => (
                          <span key={d}>{d}</span>
                        ))}
                      </div>
                      {cargando ? (
                        <Skeleton className="flex-1 rounded-[20px]" />
                      ) : (
                        error || (
                          // Cada semana, al menos lo que ocupa un día con dos eventos y logos; si la pantalla es baja, la grilla se desliza en vez de cortar.
                          <div className="grid min-h-0 flex-1 grid-cols-5 overflow-y-auto overscroll-contain rounded-[20px] border border-border" style={{ gridTemplateRows: `repeat(${semanas.length}, minmax(100px, 1fr))` }}>
                            {semanas.flatMap((s, fila) =>
                              s.map((d, k) => {
                                const elegidoAca = d.fecha === dia?.fecha;
                                const n = cuantosEn(d);
                                return (
                                  <button
                                    key={d.fecha}
                                    type="button"
                                    onClick={() => setElegido(d.fecha)}
                                    disabled={!d.enMes}
                                    aria-pressed={elegidoAca}
                                    aria-label={`${fechaLarga(d.fecha)}: ${n === 0 ? "nada importante" : n === 1 ? "1 evento" : `${n} eventos`}`}
                                    className={cn(
                                      "flex min-h-0 min-w-0 flex-col items-stretch gap-1 overflow-hidden border-border p-2 text-left transition-colors",
                                      k > 0 && "border-l",
                                      fila > 0 && "border-t",
                                      d.enMes ? "hover:bg-surface-2" : "opacity-40",
                                      elegidoAca && "bg-surface-2 ring-2 ring-accent ring-inset",
                                    )}
                                  >
                                    {/* Arriba, el número y los logos de las empresas en la misma fila; abajo, hasta dos eventos. */}
                                    <span className="flex min-w-0 items-center justify-between gap-1">
                                      <span className={cn("shrink-0 rounded-full px-1.5 text-[13px] leading-5 font-semibold tabular", d.fecha === hoy ? "bg-accent text-surface" : "text-text-2")}>{Number(d.fecha.slice(8, 10))}</span>
                                      {d.empresas.length > 0 && (
                                        <span className="flex min-w-0 items-center gap-1">
                                          {d.empresas.slice(0, LOGOS_POR_DIA).map((e) => (
                                            <ProviderMark key={e.id} activo={e.ticker} sigla={e.etiqueta.slice(0, 2)} tamano={20} />
                                          ))}
                                          {d.empresas.length - LOGOS_POR_DIA + d.masEmpresas > 0 && <span className="text-micro text-text-3">+{Math.max(0, d.empresas.length - LOGOS_POR_DIA) + d.masEmpresas}</span>}
                                        </span>
                                      )}
                                    </span>
                                    {d.eventos.slice(0, EVENTOS_POR_DIA).map((e) => (
                                      <span key={e.id} className="flex min-w-0 items-center gap-1.5 text-[13px] leading-4 font-semibold">
                                        <Punto tipo={e.tipo} />
                                        <span className="truncate">{e.etiqueta}</span>
                                      </span>
                                    ))}
                                    {d.eventos.length > EVENTOS_POR_DIA && <span className="text-micro text-text-3">+{d.eventos.length - EVENTOS_POR_DIA} más</span>}
                                  </button>
                                );
                              }),
                            )}
                          </div>
                        )
                      )}
                    </div>
                    <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto rounded-[20px] bg-surface-2 p-5" aria-live="polite">
                      {dia ? <DetalleDia dia={dia} alNavegar={cerrar} /> : <p className="text-chico text-text-2">{cargando ? "Cargando el mes…" : "Elegí un día."}</p>}
                      <p className="mt-auto pt-4 text-micro text-text-3">Horarios de Argentina.</p>
                    </aside>
                  </div>
                </m.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      {/* Celular: sube desde abajo, con el mes en puntos y la lista del día. */}
      <Sheet abierto={abierto && !esDesktop} onCambio={setAbierto} titulo="Calendario" lado="abajo">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-h3">{nombreMes(mes)}</p>
            {navegacion}
          </div>
          {filtros}
          {cargando ? (
            <Skeleton className="h-64 rounded-[20px]" />
          ) : (
            error || (
              <div className="grid grid-cols-5 gap-y-1 text-center">
                {INICIALES.map((d, k) => (
                  <span key={k} aria-hidden className="pb-1 text-micro text-text-3">
                    {d}
                  </span>
                ))}
                {semanas.flat().map((d) => {
                  const elegidoAca = d.fecha === dia?.fecha;
                  const tipos = [...new Set([...d.eventos.map((e) => e.tipo), ...(d.empresas.length || d.masEmpresas ? (["empresa"] as const) : [])])].slice(0, 3);
                  const n = cuantosEn(d);
                  return (
                    <button
                      key={d.fecha}
                      type="button"
                      onClick={() => setElegido(d.fecha)}
                      disabled={!d.enMes}
                      aria-pressed={elegidoAca}
                      aria-label={`${fechaLarga(d.fecha)}: ${n === 0 ? "nada importante" : n === 1 ? "1 evento" : `${n} eventos`}`}
                      className={cn(
                        "mx-auto flex h-12 w-12 flex-col items-center justify-center gap-1 rounded-[14px] text-[15px] font-semibold tabular",
                        !d.enMes && "opacity-35",
                        elegidoAca ? "bg-inverse text-on-inverse" : d.fecha === hoy ? "ring-2 ring-accent ring-inset" : "",
                      )}
                    >
                      {Number(d.fecha.slice(8, 10))}
                      <span className="flex h-1.5 gap-0.5" aria-hidden>
                        {tipos.map((t) => (
                          <span key={t} className={cn("size-1.5 rounded-full", COLOR[t])} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          )}
          {dia && <DetalleDia dia={dia} alNavegar={cerrar} />}
          <p className="text-micro text-text-3">Horarios de Argentina.</p>
        </div>
      </Sheet>
    </>
  );
}

/** Lo que pasa el día elegido, en filas grandes: qué es, de dónde, a qué hora y, si tiene, el link a su página. */
function DetalleDia({ dia, alNavegar }: { dia: DiaMes; alNavegar: () => void }) {
  const vacio = cuantosEn(dia) === 0;
  return (
    <div className="flex flex-col">
      <p className="pb-2 text-label">{fechaLarga(dia.fecha)}</p>
      {vacio ? (
        <p className="border-t border-border py-3 text-chico text-text-2">Nada importante este día.</p>
      ) : (
        <ul className="flex flex-col">
          {[...dia.eventos, ...dia.empresas].map((e) => (
            <FilaEvento key={e.id} e={e} alNavegar={alNavegar} />
          ))}
        </ul>
      )}
      {dia.masEmpresas > 0 && <p className="pt-2 text-chico text-text-2">Y {dia.masEmpresas === 1 ? "1 empresa más presenta" : `${dia.masEmpresas} empresas más presentan`} resultados ese día.</p>}
    </div>
  );
}

function FilaEvento({ e, alNavegar }: { e: EventoCalendario; alNavegar: () => void }) {
  const contenido = (
    <>
      {e.tipo === "empresa" ? <ProviderMark activo={e.ticker} sigla={e.etiqueta.slice(0, 2)} tamano={28} /> : <Punto tipo={e.tipo} className="mt-[7px]" />}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <Bandera pais={e.pais} />
          <span className="min-w-0">{e.etiqueta}</span>
          {e.hora && <span className="ml-auto shrink-0 text-chico font-medium text-text-2 tabular">{e.hora} h</span>}
        </span>
        <span className="text-chico text-text-2">{e.detalle}</span>
      </span>
    </>
  );
  return (
    <li className="border-t border-border">
      {e.href ? (
        <Link href={e.href} onClick={alNavegar} className="-mx-2 flex gap-3 rounded-[12px] px-2 py-3 hover:bg-border">
          {contenido}
        </Link>
      ) : (
        <div className="flex gap-3 py-3">{contenido}</div>
      )}
    </li>
  );
}
