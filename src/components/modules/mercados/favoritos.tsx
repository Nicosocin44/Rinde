"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Delta } from "@/components/ui/delta";
import { ProviderMark } from "@/components/ui/provider-mark";
import { preciosDe } from "@/lib/alertas/foto";
import type { PrecioActivo } from "@/lib/data/servicios/precios";
import { alCambiarFavoritos, listarFavoritos, type Favorito } from "@/lib/favoritos/almacen";
import { dolares, pesos } from "@/lib/format";

/**
 * "Siguiendo": los activos que la persona marcó con "Seguir" en su ficha, con el precio de hoy. Si no sigue ninguno,
 * no ocupa lugar. Se guardan en el navegador.
 */
export function Favoritos() {
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [precios, setPrecios] = useState<Record<string, PrecioActivo>>({});

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
    const desuscribir = alCambiarFavoritos(() => void leer());
    return () => {
      vivo = false;
      desuscribir();
    };
  }, []);

  if (favoritos.length === 0) return null;

  return (
    <section aria-labelledby="siguiendo" className="mb-10 lg:mb-14">
      <h2 id="siguiendo" className="mb-3 text-label">
        Siguiendo
      </h2>
      <ul className="sin-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {favoritos.map((f) => {
          const p = precios[f.ticker];
          const conLogo = !p || p.clase === "cedear" || p.clase === "accion" || p.clase === "cripto";
          return (
            <li key={f.ticker} className="shrink-0">
              <Link href={`/activo/${encodeURIComponent(f.ticker)}`} className="presionable flex w-[200px] items-center gap-3 rounded-(--radius-card) border border-border bg-surface px-3.5 py-3 hover:border-border-strong">
                {conLogo ? <ProviderMark activo={f.ticker} sigla={f.ticker.slice(0, 2)} /> : <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-surface-2 font-mono text-[11px] text-text-2">{f.ticker.slice(0, 2)}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{f.nombre}</span>
                  <span className="tabular block text-chico">
                    {p ? (p.moneda === "USD" ? dolares(p.precio, 2) : pesos(p.precio, p.precio < 1000 ? 2 : 0)) : <span className="text-text-3">{f.ticker}</span>}
                  </span>
                </span>
                {p && <Delta valor={p.variacion} className="text-micro" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
