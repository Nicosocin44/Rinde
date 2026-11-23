"use client";

import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { terminoDeEtiqueta, type Termino } from "@/lib/glosario";

/** Cuánto esperar antes de abrir o cerrar con el mouse (así no se abre al pasar de largo). */
const ESPERA_ABRIR = 250;
const ESPERA_CERRAR = 150;

/**
 * Un concepto (PER, TIR, volatilidad…) subrayado con puntos: al pasar el mouse (compu) o al tocarlo (celular), se abre
 * un cuadro chico con lo que es, en dos líneas, y el link a /aprender. La explicación sale del glosario del sitio.
 */
export function Concepto({ termino, children, className }: { termino: Termino; children?: ReactNode; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  const espera = useRef<number | undefined>(undefined);
  // Si lo abrió el mouse al pasar, un clic lo deja abierto (si no, el clic lo cerraría apenas se abrió).
  const porMouse = useRef(false);
  const programar = (abrir: boolean) => {
    window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => {
      if (abrir) porMouse.current = true;
      if (!abrir && !porMouse.current) return; // abierto con un clic: se cierra con otro clic o tocando afuera
      setAbierto(abrir);
    }, abrir ? ESPERA_ABRIR : ESPERA_CERRAR);
  };
  // Solo el mouse abre al pasar; con el dedo o el teclado se abre al tocar.
  const alEntrar = (e: React.PointerEvent) => e.pointerType === "mouse" && programar(true);
  const alSalir = (e: React.PointerEvent) => e.pointerType === "mouse" && programar(false);
  const alTocar = (e: React.MouseEvent) => {
    e.preventDefault(); // en lugar del abrir/cerrar de Radix
    window.clearTimeout(espera.current);
    const cerrar = abierto && !porMouse.current;
    porMouse.current = false;
    setAbierto(!cerrar);
  };

  return (
    <Popover.Root
      open={abierto}
      onOpenChange={(v) => {
        if (!v) porMouse.current = false;
        setAbierto(v);
      }}
    >
      <Popover.Trigger
        onClick={alTocar}
        onPointerEnter={alEntrar}
        onPointerLeave={alSalir}
        className={cn("cursor-help rounded-[4px] text-left underline decoration-text-3 decoration-dotted underline-offset-[3px] hover:decoration-text-2", className)}
      >
        {children ?? termino.t}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onPointerEnter={alEntrar}
          onPointerLeave={alSalir}
          // Que el foco no salte al cuadro al abrirlo con el mouse: es una ayuda, no un formulario.
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 flex w-[min(300px,calc(100vw-24px))] flex-col gap-1.5 rounded-(--radius-control) border border-border bg-surface p-3.5 text-left shadow-(--shadow-overlay) outline-none"
        >
          <p className="text-[14px] font-semibold text-text">{termino.t}</p>
          <p className="text-chico text-text-2">
            <span className="font-medium text-text">{termino.corto}</span> {termino.largo}
          </p>
          <Link href={`/aprender#${termino.id}`} onClick={() => setAbierto(false)} className="text-chico font-medium text-accent hover:underline">
            Más en Aprender
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Un texto de pantalla ("Volatilidad anual"): si es un concepto del glosario, con su explicación; si no, tal cual. */
export function Etiqueta({ texto, className }: { texto: string; className?: string }) {
  const termino = terminoDeEtiqueta(texto);
  return termino ? (
    <Concepto termino={termino} className={className}>
      {texto}
    </Concepto>
  ) : (
    <>{texto}</>
  );
}
