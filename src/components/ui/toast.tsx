"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

/** Toast: abajo al centro en mobile y abajo a la derecha en desktop. Una línea. Sin íconos de colores. */
type Toast = { id: number; texto: string; accion?: { etiqueta: string; onClick: () => void } };

const Contexto = createContext<(texto: string, accion?: Toast["accion"]) => void>(() => {});

export function useToast() {
  return useContext(Contexto);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const siguiente = useRef(1);
  const mostrar = useCallback((texto: string, accion?: Toast["accion"]) => {
    const id = siguiente.current++;
    setToasts((t) => [...t.slice(-2), { id, texto, accion }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const valor = useMemo(() => mostrar, [mostrar]);
  return (
    <Contexto.Provider value={valor}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, transition: { duration: 0.16 } }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              className="pointer-events-auto flex max-w-[min(440px,100%)] items-center gap-4 rounded-full bg-inverse py-2.5 pr-2.5 pl-4 text-chico font-medium text-on-inverse shadow-(--shadow-overlay)"
            >
              <span className="truncate">{t.texto}</span>
              {t.accion ? (
                <button
                  type="button"
                  onClick={() => {
                    t.accion?.onClick();
                    setToasts((x) => x.filter((y) => y.id !== t.id));
                  }}
                  className="shrink-0 rounded-full px-2.5 py-1 font-semibold opacity-80 hover:opacity-100"
                >
                  {t.accion.etiqueta}
                </button>
              ) : (
                <span className="w-1" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Contexto.Provider>
  );
}
