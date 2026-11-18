"use client";

import { Star, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Delta } from "@/components/ui/delta";
import { ProviderMark } from "@/components/ui/provider-mark";
import { Sheet } from "@/components/ui/sheet";
import { preciosDe } from "@/lib/alertas/foto";
import { cn } from "@/lib/cn";
import type { PrecioActivo } from "@/lib/data/servicios/precios";
import { alCambiarFavoritos, cambiarGrupo, dejarDeSeguir, listarFavoritos, type Favorito } from "@/lib/favoritos/almacen";
import { filtrarPorGrupo, filtrosDeGrupo, gruposDisponibles, TODOS } from "@/lib/favoritos/grupos";
import { dolares, pesos } from "@/lib/format";
import { ElegirGrupo } from "./elegir-grupo";

/**
 * "Siguiendo": los activos que la persona marcó con "Seguir" en su ficha, con el precio de hoy y en los grupos que ella
 * arme. Va al costado para no tapar lo importante: en pantallas grandes es una columna fija a la derecha; en el celular
 * y la tablet, un botón con una estrella al lado de las solapas que abre la lista. Todo se guarda en el navegador.
 */

const CLAVE_FILTRO = "rinde:siguiendo-filtro";

type Estado = {
  favoritos: Favorito[];
  precios: Record<string, PrecioActivo>;
  filtro: string;
  elegirFiltro: (id: string) => void;
  /** En Opciones (tablas anchas) no hay columna: solo el botón. */
  conColumna: boolean;
};

const Contexto = createContext<Estado | null>(null);

function useSiguiendo(): Estado {
  const estado = useContext(Contexto);
  if (!estado) throw new Error("Siguiendo va dentro de <MarcoSiguiendo>");
  return estado;
}

/** Envuelve las solapas y el contenido de Mercados: carga lo que se sigue una sola vez y arma la columna del costado. */
export function MarcoSiguiendo({ solapas, children }: { solapas: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [precios, setPrecios] = useState<Record<string, PrecioActivo>>({});
  const [filtro, setFiltro] = useState<string>(TODOS);

  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      const lista = await listarFavoritos();
      if (!vivo) return;
      setFavoritos(lista);
      const p = await preciosDe(lista.map((f) => f.ticker));
      if (vivo) setPrecios(p);
    };
    void leer();
    let guardado: string | null = null;
    try {
      guardado = localStorage.getItem(CLAVE_FILTRO);
    } catch {
      // Sin almacenamiento: arranca en "Todos".
    }
    if (guardado) queueMicrotask(() => vivo && setFiltro(guardado));
    const desuscribir = alCambiarFavoritos(() => void leer());
    return () => {
      vivo = false;
      desuscribir();
    };
  }, []);

  const elegirFiltro = (id: string) => {
    setFiltro(id);
    try {
      localStorage.setItem(CLAVE_FILTRO, id);
    } catch {
      // Se recuerda solo mientras la página está abierta.
    }
  };
  const conColumna = !pathname.startsWith("/mercados/opciones");

  return (
    <Contexto.Provider value={{ favoritos, precios, filtro, elegirFiltro, conColumna }}>
      {solapas}
      <div className={cn("pt-8 lg:pt-12", conColumna && "xl:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start xl:gap-12")}>
        <div className="min-w-0">{children}</div>
        {conColumna && (
          <aside aria-labelledby="siguiendo-columna" className="sticky top-[176px] hidden max-h-[calc(100svh-196px)] overflow-y-auto rounded-(--radius-card) border border-border bg-surface p-4 xl:block">
            <h2 id="siguiendo-columna" className="text-label">
              Siguiendo
            </h2>
            <PanelSiguiendo />
          </aside>
        )}
      </div>
    </Contexto.Provider>
  );
}

/** El botón con la estrella, al lado de las solapas. Abre la lista en una hoja. En pantallas grandes lo reemplaza la columna. */
export function BotonSiguiendo() {
  const { favoritos, conColumna } = useSiguiendo();
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Siguiendo (${favoritos.length})`}
        className={cn(
          "presionable flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-[15px] font-semibold text-text-2 hover:text-text",
          conColumna && "xl:hidden",
        )}
      >
        <Star className={cn("size-4", favoritos.length > 0 && "fill-current text-text")} />
        {favoritos.length > 0 && <span className="tabular text-text">{favoritos.length}</span>}
      </button>
      <Sheet abierto={abierto} onCambio={setAbierto} titulo="Siguiendo" descripcion="Los activos que seguís, con el precio de hoy.">
        {abierto && <PanelSiguiendo />}
      </Sheet>
    </>
  );
}

/** La lista con los filtros por grupo, o "Organizar" para elegir el grupo de cada uno. La usan la columna y la hoja. */
function PanelSiguiendo() {
  const { favoritos, precios, filtro, elegirFiltro } = useSiguiendo();
  const [organizando, setOrganizando] = useState(false);

  if (favoritos.length === 0) {
    return (
      <p className="mt-3 text-chico text-text-2">
        Todavía no seguís ningún activo. Entrá a la ficha de uno y tocá <span className="font-semibold text-text">Seguir</span>: aparece acá con su precio de hoy.
      </p>
    );
  }

  const filtros = filtrosDeGrupo(favoritos);
  const activo = filtros.some((f) => f.id === filtro) ? filtro : TODOS;
  const visibles = filtrarPorGrupo(favoritos, activo);

  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-micro text-text-3">{organizando ? "Elegí o creá un grupo para cada uno." : filtros.length > 0 ? "Por grupo" : "Podés armar tus grupos."}</p>
        <button type="button" onClick={() => setOrganizando(!organizando)} className="-mr-2 rounded-full px-2.5 py-1 text-[13px] font-semibold text-text-2 hover:bg-surface-2 hover:text-text">
          {organizando ? "Listo" : "Organizar"}
        </button>
      </div>

      {organizando ? (
        <Organizar favoritos={favoritos} />
      ) : (
        <>
          {filtros.length > 0 && (
            // En una columna angosta los grupos pasan al renglón de abajo en vez de cortarse.
            <div role="group" aria-label="Filtrar por grupo" className="flex flex-wrap gap-1.5">
              {filtros.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={f.id === activo}
                  onClick={() => elegirFiltro(f.id)}
                  className={cn(
                    "h-8 max-w-full truncate rounded-full px-3 text-[13px] font-semibold transition-colors duration-(--duration-short)",
                    f.id === activo ? "bg-inverse text-on-inverse" : "bg-surface-2 text-text-2 hover:text-text",
                  )}
                >
                  {f.etiqueta} <span className="tabular opacity-60">{f.cantidad}</span>
                </button>
              ))}
            </div>
          )}
          <ul className="flex flex-col divide-y divide-border">
            {visibles.map((f) => (
              <Fila key={f.ticker} favorito={f} precio={precios[f.ticker]} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Fila({ favorito: f, precio: p }: { favorito: Favorito; precio: PrecioActivo | undefined }) {
  const conLogo = !p || p.clase === "cedear" || p.clase === "accion" || p.clase === "cripto";
  return (
    <li>
      <Link href={`/activo/${encodeURIComponent(f.ticker)}`} className="-mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2.5 hover:bg-surface-2">
        {conLogo ? <ProviderMark activo={f.ticker} sigla={f.ticker.slice(0, 2)} /> : <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-surface-2 font-mono text-[11px] text-text-2">{f.ticker.slice(0, 2)}</span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium">{f.nombre}</span>
          <span className="block font-mono text-[11px] text-text-3">{f.ticker}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="tabular text-chico">{p ? (p.moneda === "USD" ? dolares(p.precio, 2) : pesos(p.precio, p.precio < 1000 ? 2 : 0)) : "—"}</span>
          {p && <Delta valor={p.variacion} className="text-micro" />}
        </span>
      </Link>
    </li>
  );
}

function Organizar({ favoritos }: { favoritos: Favorito[] }) {
  const grupos = gruposDisponibles(favoritos);
  return (
    <ul className="flex flex-col divide-y divide-border">
      {favoritos.map((f) => (
        <li key={f.ticker} className="flex flex-col gap-2 py-3">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{f.nombre}</span>
              <span className="block font-mono text-[11px] text-text-3">{f.ticker}</span>
            </span>
            <button
              type="button"
              onClick={() => void dejarDeSeguir(f.ticker)}
              aria-label={`Dejar de seguir ${f.nombre}`}
              className="grid size-9 shrink-0 place-items-center rounded-full text-text-3 hover:bg-surface-2 hover:text-loss"
            >
              <X className="size-4" />
            </button>
          </div>
          <ElegirGrupo compacto valor={f.grupo ?? null} grupos={grupos} etiqueta={`Grupo de ${f.nombre}`} onCambio={(g) => void cambiarGrupo(f.ticker, g)} className="w-full" />
        </li>
      ))}
    </ul>
  );
}
