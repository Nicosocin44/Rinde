"use client";

import { useEffect, useState } from "react";
import { Cifra } from "@/components/ui/cifra";
import { Delta } from "@/components/ui/delta";
import { PuntoVivo } from "@/components/ui/frescura";
import type { Pulso } from "@/lib/data/types";
import { porcentaje } from "@/lib/format";

/**
 * Barra de pulso (desktop): MEP, oficial, riesgo país y la mejor tasa, con number ticker.
 * No es un marquee: son cuatro valores quietos que se actualizan cada minuto.
 */
export function PulseBar({ inicial }: { inicial: Pulso }) {
  const [pulso, setPulso] = useState(inicial);

  useEffect(() => {
    const actualizar = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/pulso", { cache: "no-store" });
        if (r.ok) setPulso((await r.json()) as Pulso);
      } catch {
        // Sin conexión: quedan los últimos valores.
      }
    };
    const id = setInterval(actualizar, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden border-b border-border lg:block">
      <div className="contenedor flex h-9 items-center justify-between gap-8 text-[13px]">
        <dl className="flex items-center gap-8">
          <Item etiqueta="MEP">
            {pulso.mep ? (
              <>
                <Cifra valor={pulso.mep.valor} animado compuesta={false} className="font-medium text-text" claseDecimales="text-text" />
                <Delta valor={pulso.mep.variacion} />
              </>
            ) : (
              <span className="text-text-3">—</span>
            )}
          </Item>
          <Item etiqueta="Oficial">
            {pulso.oficial ? <Cifra valor={pulso.oficial.valor} animado compuesta={false} className="font-medium text-text" claseDecimales="text-text" /> : <span className="text-text-3">—</span>}
          </Item>
          <Item etiqueta="Riesgo país">
            {pulso.riesgoPais ? (
              <>
                <span className="tabular font-medium text-text">{pulso.riesgoPais.valor}</span>
                <Delta valor={pulso.riesgoPais.variacion} />
              </>
            ) : (
              <span className="text-text-3">—</span>
            )}
          </Item>
          <Item etiqueta="Mejor tasa sin plazo">
            {pulso.mejorTasa ? (
              <span className="tabular font-medium text-text">
                {porcentaje(pulso.mejorTasa.tna, 1)} <span className="font-normal text-text-3">TNA</span>
              </span>
            ) : (
              <span className="text-text-3">—</span>
            )}
          </Item>
        </dl>
        <p className="flex items-center gap-2 text-text-3">
          <PuntoVivo estado={pulso.mercadoAbierto ? "live" : "close"} />
          {pulso.mercadoAbierto ? "Mercado abierto" : "Mercado cerrado"}
        </p>
      </div>
    </div>
  );
}

function Item({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-text-3">{etiqueta}</dt>
      <dd className="flex items-center gap-2">{children}</dd>
    </div>
  );
}
