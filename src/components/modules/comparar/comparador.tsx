"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { CATEGORICOS } from "@/components/charts/colores";
import { GraficoComparado, type LineaComparada } from "@/components/charts/grafico-comparado";
import type { ItemBusqueda } from "@/components/shell/command-palette";
import { Delta } from "@/components/ui/delta";
import { SegmentedControl } from "@/components/ui/segmented";
import { DIAS_RANGO_COMPARAR, desdeCero, enMoneda, inicioComun, numerosDelPeriodo, type MonedaSerie, type RangoComparar } from "@/lib/calculos/comparar";
import { cn } from "@/lib/cn";
import type { Comparacion } from "@/lib/data/servicios/comparar";
import { dolares, fechaCorta, pesos, porcentaje } from "@/lib/format";

const MAXIMO = 5;
const RANGOS: RangoComparar[] = ["1M", "3M", "6M", "1A", "3A", "5A"];
const EJEMPLOS: { titulo: string; tickers: string[] }[] = [
  { titulo: "S&P 500 contra Nasdaq", tickers: ["SPY", "QQQ"] },
  { titulo: "Mercado Libre, Galicia e YPF", tickers: ["MELI", "GGAL", "YPFD"] },
  { titulo: "Bitcoin contra el S&P 500", tickers: ["BTC", "SPY"] },
  { titulo: "Apple, Microsoft y Nvidia", tickers: ["AAPL", "MSFT", "NVDA"] },
  { titulo: "Bonar 2030 contra Global 2030", tickers: ["AL30", "GD30"] },
];
/** Con un solo activo (se llega así desde su ficha): contra qué compararlo, de un toque. */
const SUGERIDOS: { ticker: string; etiqueta: string }[] = [
  { ticker: "SPY", etiqueta: "S&P 500" },
  { ticker: "BTC", etiqueta: "Bitcoin" },
  { ticker: "GGAL", etiqueta: "Galicia" },
  { ticker: "MELI", etiqueta: "Mercado Libre" },
  { ticker: "AL30", etiqueta: "Bonar 2030" },
];

/** Qué incluye el rendimiento de cada clase: los bonos, sus pagos (sin ellos cada pago parece una caída); las acciones, no los dividendos. */
function rendimientosQue(activos: Comparacion["activos"]): string {
  const partes = [
    activos.some((a) => a.clase === "bono") && "los bonos, con sus cupones y amortizaciones reinvertidos",
    activos.some((a) => a.clase === "cedear" || a.clase === "accion") && "las acciones y CEDEARs, sin dividendos",
  ].filter(Boolean);
  return `Rendimientos pasados${partes.length ? `: ${partes.join("; ")}` : ""}.`;
}

/** El color de cada activo sale de su lugar en la lista elegida: es el mismo en las etiquetas, el gráfico y la tabla. */
const colorDe = (tickers: string[], t: string) => CATEGORICOS[Math.max(0, tickers.indexOf(t)) % CATEGORICOS.length]!;

const url = (tickers: string[]) => (tickers.length ? `/mercados/comparar?t=${tickers.map(encodeURIComponent).join(",")}` : "/mercados/comparar");

/**
 * Comparar hasta 5 activos (CEDEARs, acciones, bonos y cripto) en el mismo gráfico: todos arrancan en 0 % el mismo día,
 * en pesos o en dólares MEP, y abajo sus números lado a lado. Los activos elegidos viven en la URL (se pueden compartir).
 */
export function Comparador({ tickers, datos, hoy }: { tickers: string[]; datos: Comparacion | null; hoy: string }) {
  const router = useRouter();
  const [cargando, startTransition] = useTransition();
  const [moneda, setMoneda] = useState<MonedaSerie>("ARS");
  const [rango, setRango] = useState<RangoComparar>("1A");
  const ir = (lista: string[]) => startTransition(() => router.replace(url(lista), { scroll: false }));

  const activos = useMemo(() => datos?.activos ?? [], [datos]);
  const enLaMoneda = useMemo(() => activos.map((a) => enMoneda(a.serie, a.moneda, moneda, datos?.mep ?? [])), [activos, moneda, datos]);
  const inicio = useMemo(() => inicioComun(enLaMoneda, rango, hoy), [enLaMoneda, rango, hoy]);
  const lineas: LineaComparada[] = useMemo(
    () => (inicio ? activos.map((a, i) => ({ id: a.ticker, etiqueta: a.ticker, color: colorDe(tickers, a.ticker), puntos: desdeCero(enLaMoneda[i]!, inicio) })).filter((l) => l.puntos.length > 1) : []),
    [activos, enLaMoneda, inicio, tickers],
  );
  const numeros = useMemo(() => (inicio ? activos.map((a, i) => numerosDelPeriodo(enLaMoneda[i]!, inicio, hoy, a.clase === "cripto" ? 365 : 252)) : []), [activos, enLaMoneda, inicio, hoy]);
  // Si el inicio es más tarde que el rango pedido, es porque algún activo empezó a cotizar después.
  const desdeRango = new Date(Date.parse(hoy) - DIAS_RANGO_COMPARAR[rango] * 86_400_000).toISOString().slice(0, 10);
  const recortado = inicio && inicio > desdeRango ? activos.find((a, i) => enLaMoneda[i]![0]?.[0] === inicio) : null;
  const formato = (x: number | null) => (x === null ? "—" : moneda === "USD" ? dolares(x, 2) : pesos(x, x < 1000 ? 2 : 0));

  return (
    <div className={cn("flex flex-col gap-8 transition-opacity", cargando && "opacity-60")}>
      <ElegirActivos elegidos={tickers} onCambio={ir} />

      {tickers.length === 1 && (
        <div className="-mt-4 flex flex-wrap items-center gap-2">
          <span className="text-chico text-text-2">Comparalo con</span>
          {SUGERIDOS.filter((s) => s.ticker !== tickers[0])
            .slice(0, 4)
            .map((s) => (
              <button key={s.ticker} type="button" onClick={() => ir([...tickers, s.ticker])} className="rounded-full border border-border px-3 py-1.5 text-chico font-medium hover:border-border-strong hover:bg-surface-2">
                + {s.etiqueta}
              </button>
            ))}
        </div>
      )}

      {tickers.length === 0 ? (
        <section aria-labelledby="ejemplos" className="flex flex-col gap-3">
          <h2 id="ejemplos" className="text-label">
            Para empezar
          </h2>
          <ul className="flex flex-wrap gap-2">
            {EJEMPLOS.map((e) => (
              <li key={e.titulo}>
                <button type="button" onClick={() => ir(e.tickers)} className="rounded-full border border-border px-4 py-2 text-chico font-medium hover:border-border-strong hover:bg-surface-2">
                  {e.titulo}
                </button>
              </li>
            ))}
          </ul>
          <p className="max-w-2xl text-chico text-text-2">Elegí hasta {MAXIMO} activos: CEDEARs, acciones argentinas, bonos en dólares, Bitcoin o Ether. Todos arrancan en 0 % el mismo día, así se ve cuál rindió más.</p>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              etiqueta="Moneda"
              tamano="sm"
              valor={moneda}
              onChange={setMoneda}
              opciones={[
                { valor: "ARS", etiqueta: "En pesos" },
                { valor: "USD", etiqueta: "En dólares" },
              ]}
            />
            <SegmentedControl etiqueta="Período" tamano="sm" valor={rango} onChange={setRango} opciones={RANGOS.map((r) => ({ valor: r, etiqueta: r }))} />
          </div>

          {lineas.length > 0 ? (
            <GraficoComparado lineas={lineas} />
          ) : (
            <p className="text-chico text-text-2">No hay precios para comparar en este período.</p>
          )}

          {activos.length > 0 && (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[560px] text-[15px] sm:min-w-[620px]">
                <caption className="sr-only">Números de cada activo en el período</caption>
                <thead>
                  <tr className="text-left text-micro text-text-3">
                    <th className="sticky left-0 z-10 bg-bg pb-2 font-normal">Activo</th>
                    <th className="pb-2 text-right font-normal">Rendimiento</th>
                    <th className="pb-2 text-right font-normal">Máxima caída</th>
                    <th className="pb-2 text-right font-normal">Volatilidad (1 año)</th>
                    <th className="pb-2 text-right font-normal">Precio hoy</th>
                  </tr>
                </thead>
                <tbody>
                  {activos.map((a, i) => {
                    const n = numeros[i];
                    return (
                      <tr key={a.ticker} className="border-t border-border">
                        <th scope="row" className="sticky left-0 z-10 max-w-[150px] bg-bg py-3 pr-3 text-left font-normal sm:max-w-none">
                          <Link href={`/activo/${encodeURIComponent(a.ticker)}`} className="flex items-center gap-2.5 hover:underline">
                            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: colorDe(tickers, a.ticker) }} />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{a.nombre}</span>
                              <span className="block font-mono text-[12px] text-text-3">{a.ticker}</span>
                            </span>
                          </Link>
                        </th>
                        <td className="tabular py-3 text-right">{n?.variacion != null ? <Delta valor={n.variacion} decimales={1} en="tabla" /> : <span className="text-text-3">—</span>}</td>
                        <td className="tabular py-3 text-right">{n?.maximaCaida != null ? <span className="text-loss">{porcentaje(n.maximaCaida, 1)}</span> : <span className="text-text-3">—</span>}</td>
                        <td className="tabular py-3 text-right">{n?.volatilidad != null ? porcentaje(n.volatilidad, 1) : <span className="text-text-3">—</span>}</td>
                        <td className="tabular py-3 text-right">{formato(n?.ultimo ?? null)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex max-w-3xl flex-col gap-1 text-micro text-text-3">
            {inicio && (
              <p>
                Desde el {fechaCorta(inicio, true)}
                {recortado ? `: la historia de ${recortado.nombre} que tenemos arranca ese día, así que todos arrancan juntos para comparar parejo (sacalo para ver más atrás)` : ""}.{" "}
                {moneda === "USD" ? "En dólares: los precios en pesos se dividen por el dólar MEP de cada día." : "En pesos: los precios en dólares se multiplican por el dólar MEP de cada día."} {rendimientosQue(activos)}
              </p>
            )}
            {activos
              .filter((a) => a.historiaEeuu)
              .map((a) => (
                <p key={a.ticker}>{a.ticker}: data912 no publica la historia de este CEDEAR, así que se usa la de la acción en Estados Unidos.</p>
              ))}
            {(datos?.sinDatos.length ?? 0) > 0 && <p>Sin historia para comparar: {datos!.sinDatos.join(", ")} (las LECAPs y los dólares cripto no tienen una historia de precios que sirva).</p>}
          </div>
        </>
      )}
    </div>
  );
}

/** Elegir los activos: un buscador (CEDEARs, acciones, bonos y cripto) y los elegidos como etiquetas que se pueden sacar. */
function ElegirActivos({ elegidos, onCambio }: { elegidos: string[]; onCambio: (lista: string[]) => void }) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [indice, setIndice] = useState<ItemBusqueda[] | null>(null);
  const pedido = useRef(false);
  const cargar = () => {
    if (pedido.current) return;
    pedido.current = true;
    fetch("/api/buscar")
      .then((r) => r.json())
      .then((items: ItemBusqueda[]) => setIndice(items.filter((x) => x.grupo === "Instrumentos" && !x.id.startsWith("l-") && x.id !== "k-USDT" && x.id !== "k-USDC")))
      .catch(() => setIndice([]));
  };
  const q = texto.trim().toLowerCase();
  const opciones = q && indice ? indice.filter((x) => !elegidos.includes(x.titulo) && `${x.titulo} ${x.detalle} ${x.claves}`.toLowerCase().includes(q)).slice(0, 8) : [];
  const lleno = elegidos.length >= MAXIMO;
  const agregar = (t: string) => {
    if (lleno || elegidos.includes(t)) return;
    onCambio([...elegidos, t]);
    setTexto("");
    setAbierto(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-xl">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-text-3" />
        <input
          value={texto}
          disabled={lleno}
          onFocus={() => {
            cargar();
            setAbierto(true);
          }}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onChange={(e) => {
            cargar();
            setTexto(e.target.value);
            setAbierto(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && opciones[0]) {
              e.preventDefault();
              agregar(opciones[0].titulo);
            }
          }}
          placeholder={lleno ? `Máximo ${MAXIMO} activos` : "Sumá un activo: Apple, GGAL, AL30, Bitcoin…"}
          aria-label="Buscar un activo para comparar"
          role="combobox"
          aria-expanded={abierto && opciones.length > 0}
          aria-controls="opciones-comparar"
          className="h-12 w-full rounded-full border border-border-strong bg-surface pr-4 pl-11 text-[16px] outline-none placeholder:text-text-3 focus:border-accent disabled:opacity-60"
        />
        {abierto && opciones.length > 0 && (
          <ul id="opciones-comparar" role="listbox" className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-(--radius-card) border border-border bg-surface p-1 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.45)]">
            {opciones.map((o) => (
              <li key={o.id} role="option" aria-selected={false}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => agregar(o.titulo)} className="flex w-full items-baseline gap-3 rounded-[10px] px-3 py-2 text-left hover:bg-surface-2">
                  <span className="font-mono text-[13px] font-semibold">{o.titulo}</span>
                  <span className="truncate text-chico text-text-2">{o.detalle}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {elegidos.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Activos elegidos">
          {elegidos.map((t) => (
            <li key={t} className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-1 pl-3">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: colorDe(elegidos, t) }} />
              <span className="font-mono text-[13px] font-semibold">{t}</span>
              <button type="button" onClick={() => onCambio(elegidos.filter((x) => x !== t))} aria-label={`Sacar ${t}`} className="grid size-7 place-items-center rounded-full text-text-3 hover:bg-surface-2 hover:text-text">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          {elegidos.length > 1 && (
            <li>
              <button type="button" onClick={() => onCambio([])} className="h-9 rounded-full px-3 text-chico text-text-2 hover:bg-surface-2 hover:text-text">
                Borrar todo
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
