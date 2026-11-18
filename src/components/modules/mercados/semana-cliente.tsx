"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProviderMark } from "@/components/ui/provider-mark";
import { semanaPermitida, type EventoCalendario, type PaisEvento, type SemanaCalendario } from "@/lib/calendario/semana";
import { sumarDias } from "@/lib/calculos/fechas";
import type { Cargado } from "@/lib/data/types";
import { cn } from "@/lib/cn";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie"];
const DIAS_LARGOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const dd = (f: string) => f.slice(8, 10);
const ddmm = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;

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

/**
 * La semana de Mercados, de lunes a viernes, en pocas palabras: datos y tasas con su bandera, vencimientos, y los logos
 * de las empresas que presentan resultados. Al tocar algo, abajo aparece una línea con el detalle.
 */
export function SemanaInteractiva({ inicial, hoy, base }: { inicial: SemanaCalendario; hoy: string; base: string }) {
  const [semanas, setSemanas] = useState<Record<string, SemanaCalendario>>({ [inicial.lunes]: inicial });
  const [lunes, setLunes] = useState(inicial.lunes);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const [elegido, setElegido] = useState<EventoCalendario | null>(null);
  const semana = semanas[lunes] ?? inicial;
  // En el celular la semana se desliza de costado: que arranque mostrando el día de hoy.
  const carril = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = carril.current;
    const dia = c?.querySelector<HTMLElement>("[data-hoy]");
    if (c && dia && c.scrollWidth > c.clientWidth) c.scrollLeft = Math.max(0, dia.offsetLeft - 16);
  }, [lunes]);

  const ir = async (destino: string) => {
    setElegido(null);
    setError(false);
    if (semanas[destino]) return setLunes(destino);
    setCargando(true);
    try {
      const r = (await (await fetch(`/api/calendario?semana=${destino}`)).json()) as Cargado<SemanaCalendario>;
      if (!r.ok) throw new Error(r.error);
      setSemanas((s) => ({ ...s, [destino]: r.data }));
      setLunes(destino);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  };

  const titulo = lunes === base ? "Esta semana" : lunes === sumarDias(base, 7) ? "La semana que viene" : lunes === sumarDias(base, -7) ? "La semana pasada" : `Semana del ${ddmm(lunes)}`;
  const anterior = sumarDias(lunes, -7);
  const siguiente = sumarDias(lunes, 7);

  return (
    <section aria-label="Calendario de la semana" className="w-full lg:w-[540px]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-label">{titulo}</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void ir(anterior)} disabled={cargando || !semanaPermitida(anterior, hoy)} aria-label="Semana anterior" className="flex size-8 items-center justify-center rounded-full text-text-2 hover:bg-surface-2 hover:text-text disabled:opacity-30">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => void ir(siguiente)} disabled={cargando || !semanaPermitida(siguiente, hoy)} aria-label="Semana siguiente" className="flex size-8 items-center justify-center rounded-full text-text-2 hover:bg-surface-2 hover:text-text disabled:opacity-30">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div ref={carril} className="sin-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <ol className={cn("grid min-w-[520px] grid-cols-5 overflow-hidden rounded-(--radius-card) border border-border bg-surface transition-opacity", cargando && "opacity-50")}>
          {semana.dias.map((d, k) => {
            const esHoy = d.fecha === hoy;
            const paso = d.fecha < hoy;
            const vacio = d.eventos.length === 0 && d.empresas.length === 0;
            return (
              <li key={d.fecha} data-hoy={esHoy || undefined} className={cn("flex min-h-[112px] flex-col gap-1.5 px-2 py-2", k > 0 && "border-l border-border", esHoy && "bg-surface-2", paso && "opacity-55")}>
                <p className={cn("text-[12px]", esHoy ? "font-semibold text-text" : "text-text-3")}>
                  {DIAS[k]} {dd(d.fecha)}
                  {esHoy && <span className="ml-1 inline-block size-1.5 rounded-full bg-accent align-middle" aria-label="hoy" />}
                </p>
                {d.eventos.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setElegido(elegido?.id === e.id ? null : e)}
                    aria-pressed={elegido?.id === e.id}
                    className={cn("flex items-center gap-1.5 rounded-[6px] text-left text-[12.5px] leading-[16px] font-semibold hover:text-accent", elegido?.id === e.id && "text-accent", e.tipo === "feriado" && "text-text-3")}
                  >
                    <Bandera pais={e.pais} />
                    <span className="min-w-0">{e.etiqueta}</span>
                  </button>
                ))}
                {d.empresas.length > 0 && (
                  <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                    {d.empresas.map((e) => (
                      <button key={e.id} type="button" onClick={() => setElegido(elegido?.id === e.id ? null : e)} aria-label={`${e.etiqueta}: resultados`} aria-pressed={elegido?.id === e.id} className={cn("rounded-[8px]", elegido?.id === e.id && "ring-2 ring-accent")}>
                        <ProviderMark activo={e.ticker} sigla={e.etiqueta.slice(0, 2)} tamano={20} />
                      </button>
                    ))}
                    {d.masEmpresas > 0 && <span className="text-[11px] text-text-3">+{d.masEmpresas}</span>}
                  </div>
                )}
                {vacio && <span className="text-[12px] text-text-3">—</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <p className="mt-2 min-h-5 text-micro" aria-live="polite">
        {error ? (
          "No pudimos traer esa semana. Probá de nuevo en un rato."
        ) : elegido ? (
          <>
            <span className="font-medium text-text">
              {DIAS_LARGOS[semana.dias.findIndex((d) => d.fecha === elegido.fecha)] ?? ""} {dd(elegido.fecha)}
              {elegido.hora ? ` · ${elegido.hora} h` : ""} · {elegido.etiqueta}
            </span>
            {": "}
            {elegido.detalle}
            {elegido.href && (
              <>
                {" · "}
                <Link href={elegido.href} className="font-medium text-accent hover:underline">
                  Ver
                </Link>
              </>
            )}
          </>
        ) : (
          <span className="text-text-3">Tocá un evento o un logo para ver el detalle. Horarios de Argentina.</span>
        )}
      </p>
    </section>
  );
}
