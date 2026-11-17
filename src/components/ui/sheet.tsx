"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import type { ReactNode } from "react";
import { useEsDesktop } from "@/lib/use-media";
import { cn } from "@/lib/cn";

const SPRING_UI = { type: "spring", stiffness: 420, damping: 36, mass: 1 } as const;

/**
 * Sheet. Mobile: desde abajo, con handle, arrastre para cerrar y radio 20 arriba.
 * Desktop: panel lateral derecho de 480 px. El fondo se oscurece con blur (interacción firma 8).
 */
export function Sheet({
  abierto,
  onCambio,
  titulo,
  descripcion,
  children,
  ancho = 480,
  lado,
}: {
  abierto: boolean;
  onCambio: (abierto: boolean) => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  ancho?: number;
  /** Forzar posición; por defecto abajo en mobile y a la derecha en desktop. */
  lado?: "abajo" | "derecha";
}) {
  const esDesktop = useEsDesktop();
  const posicion = lado ?? (esDesktop ? "derecha" : "abajo");

  const alSoltar = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onCambio(false);
  };

  return (
    <Dialog.Root open={abierto} onOpenChange={onCambio}>
      <AnimatePresence>
        {abierto && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-scrim backdrop-blur-[6px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  "fixed z-50 flex flex-col bg-surface shadow-(--shadow-overlay) outline-none",
                  posicion === "abajo"
                    ? "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-(--radius-panel) pb-[env(safe-area-inset-bottom)]"
                    : "inset-y-2 right-2 rounded-(--radius-panel)",
                )}
                style={posicion === "derecha" ? { width: `min(${ancho}px, calc(100vw - 16px))` } : undefined}
                initial={posicion === "abajo" ? { y: "100%" } : { x: 40, opacity: 0 }}
                animate={posicion === "abajo" ? { y: 0 } : { x: 0, opacity: 1 }}
                exit={posicion === "abajo" ? { y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } } : { x: 40, opacity: 0, transition: { duration: 0.18 } }}
                transition={SPRING_UI}
                drag={posicion === "abajo" ? "y" : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={alSoltar}
              >
                {posicion === "abajo" && (
                  <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
                    <span className="h-1 w-9 rounded-full bg-border-strong" />
                  </div>
                )}
                <header className={cn("flex items-start justify-between gap-4 px-5", posicion === "abajo" ? "pt-2 pb-3" : "pt-5 pb-4")}>
                  <div className="min-w-0">
                    <Dialog.Title className="text-h3">{titulo}</Dialog.Title>
                    {descripcion ? (
                      <Dialog.Description className="mt-1 text-chico text-text-2">{descripcion}</Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    aria-label="Cerrar"
                    className="-mt-1 -mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-(--radius-control) text-text-2 hover:bg-surface-2 hover:text-text"
                  >
                    <X className="size-[18px]" />
                  </Dialog.Close>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6" onPointerDown={(e) => e.stopPropagation()}>
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
