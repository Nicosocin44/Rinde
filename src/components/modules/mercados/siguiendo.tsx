"use client";

import * as Popover from "@radix-ui/react-popover";
import { Star, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Delta } from "@/components/ui/delta";
import { ProviderMark } from "@/components/ui/provider-mark";
import { Sheet } from "@/components/ui/sheet";
import { preciosDe } from "@/lib/alertas/foto";
import type { PrecioActivo } from "@/lib/data/servicios/precios";
import { alCambiarFavoritos, dejarDeSeguir, listarFavoritos, type Favorito } from "@/lib/favoritos/almacen";
import { dolares, pesos } from "@/lib/format";
import { useEsDesktop } from "@/lib/use-media";

/** Mientras la lista está abierta, los precios se vuelven a pedir cada tanto (en vivo, como el resto de Mercados). */
const REFRESCO_MS = 30_000;

/** En la moneda en que se siguió; los que se siguieron antes de poder elegir, en la del activo. */
function enSuMoneda(p: PrecioActivo, f: Favorito): { texto: string; variacion: number | null } {
  const moneda = f.moneda ?? p.moneda;
  const enOtra = moneda !== p.moneda;
  const precio = enOtra ? (p.otra?.precio ?? null) : p.precio;
  const variacion = enOtra ? (p.otra?.variacion ?? null) : p.variacion;
  if (precio === null) return { texto: "—", variacion };
  return { texto: moneda === "USD" ? dolares(precio, 2) : pesos(precio, precio < 1000 ? 2 : 0), variacion };
}

/**
 * "★ Siguiendo" (punto 18): debajo del botón del calendario (sin la cantidad, pedido de Nico del 22/11/2026). Al tocarlo, la lista con el
 * precio y la variación de hoy de cada uno: en la compu, un panel debajo del botón; en el celular, sube desde abajo.
 * Los activos se siguen con "★ Seguir" en su ficha y se guardan en el navegador. Si no seguís ninguno, no aparece.
 */
export function SiguiendoMercados() {
  const esDesktop = useEsDesktop();
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [precios, setPrecios] = useState<Record<string, PrecioActivo>>({});
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let vivo = true;
    const leer = () => void listarFavoritos().then((lista) => vivo && setFavoritos(lista));
    leer();
    const desuscribir = alCambiarFavoritos(leer);
    return () => {
      vivo = false;
      desuscribir();
    };
  }, []);

  const tickers = favoritos.map((f) => f.ticker).join(",");
  const traerPrecios = () => {
    if (tickers) void preciosDe(tickers.split(",")).then(setPrecios);
  };
  useEffect(() => {
    if (!abierto || !tickers) return;
    let vivo = true;
    const traer = () => void preciosDe(tickers.split(",")).then((p) => vivo && setPrecios(p));
    traer();
    const id = window.setInterval(traer, REFRESCO_MS);
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, [abierto, tickers]);

  if (favoritos.length === 0) return null;

  const boton = (
    <button
      type="button"
      onClick={esDesktop ? undefined : () => setAbierto(true)}
      onPointerEnter={traerPrecios}
      className="inline-flex h-11 items-center gap-2 self-start rounded-full border border-border-strong bg-surface px-4 text-[15px] font-semibold transition-colors hover:bg-surface-2 lg:self-auto"
    >
      <Star aria-hidden className="size-[18px] fill-current" />
      Siguiendo
    </button>
  );
  const lista = <ListaSiguiendo favoritos={favoritos} precios={precios} alNavegar={() => setAbierto(false)} />;

  if (esDesktop) {
    return (
      // modal: mientras la lista está abierta la página no se mueve (como el calendario); si no, el panel se iba con la
      // página y la rueda, al llegar al final de la lista, seguía bajando la página de atrás.
      <Popover.Root open={abierto} onOpenChange={setAbierto} modal>
        <Popover.Trigger asChild>{boton}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="end" sideOffset={8} collisionPadding={16} aria-label="Tus seguidos" className="z-50 flex max-h-[min(520px,var(--radix-popover-content-available-height))] w-[380px] flex-col rounded-(--radius-card) border border-border bg-surface p-3 shadow-(--shadow-overlay) outline-none">
            <p className="px-2 pt-1 pb-2 text-label">Tus seguidos · hoy</p>
            <div className="min-h-0 overflow-y-auto overscroll-contain">{lista}</div>
            <p className="px-2 pt-2 text-micro text-text-3">Sumá o sacá activos con «Seguir» en su ficha.</p>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }
  return (
    <>
      {boton}
      <Sheet abierto={abierto} onCambio={setAbierto} titulo="Siguiendo" descripcion="Tus seguidos, con el precio y la variación de hoy." lado="abajo">
        {lista}
      </Sheet>
    </>
  );
}

/** Cada activo: logo, ticker y nombre, precio y variación de hoy. Toda la fila lleva a la ficha; la cruz lo deja de seguir. */
function ListaSiguiendo({ favoritos, precios, alNavegar }: { favoritos: Favorito[]; precios: Record<string, PrecioActivo>; alNavegar: () => void }) {
  return (
    <ul className="flex flex-col">
      {favoritos.map((f) => {
        const p = precios[f.ticker];
        const m = p ? enSuMoneda(p, f) : null;
        return (
          <li key={f.ticker} className="flex items-center gap-1 border-t border-border first:border-t-0">
            <Link href={`/activo/${encodeURIComponent(f.ticker)}`} onClick={alNavegar} className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] px-2 py-2.5 hover:bg-surface-2">
              <ProviderMark activo={f.ticker} sigla={f.ticker.slice(0, 2)} tamano={32} />
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[13px] font-semibold">{f.ticker}</span>
                <span className="block truncate text-chico text-text-2">{p?.nombre ?? f.nombre}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[15px] font-semibold tabular">{m ? m.texto : "—"}</span>
                {m?.variacion != null && <Delta valor={m.variacion} decimales={1} className="text-chico" />}
              </span>
            </Link>
            <button type="button" onClick={() => void dejarDeSeguir(f.ticker)} aria-label={`Dejar de seguir ${f.ticker}`} className="flex size-10 shrink-0 items-center justify-center rounded-full text-text-3 hover:bg-surface-2 hover:text-text">
              <X className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
