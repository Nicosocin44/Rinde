"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Search } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { cambiarModo, cambiarTema, usePreferencias } from "@/lib/preferencias";
import { useShell } from "./shell-context";

export type ItemBusqueda = {
  id: string;
  titulo: string;
  detalle?: string;
  grupo: "Secciones" | "Instrumentos" | "Proveedores" | "Calculadoras" | "Acciones";
  href?: string;
  /** Palabras extra para la búsqueda. */
  claves?: string;
};

const BASE: ItemBusqueda[] = [
  { id: "s-inicio", titulo: "Inicio", detalle: "La foto de hoy", grupo: "Secciones", href: "/" },
  { id: "s-dolar", titulo: "Dólar hoy", detalle: "Cotizaciones, dónde comprar e histórico", grupo: "Secciones", href: "/dolar", claves: "mep blue oficial ccl cripto tarjeta" },
  { id: "s-dolar-comprar", titulo: "Dónde comprar dólares", detalle: "Ranking por app y banco", grupo: "Secciones", href: "/dolar/comprar", claves: "usdt usdc ranking" },
  { id: "s-pesos", titulo: "¿Dónde rinde más tu plata?", detalle: "Comparador de tasas en pesos", grupo: "Secciones", href: "/pesos", claves: "tasas billeteras" },
  { id: "s-pf", titulo: "Plazo fijo por banco", grupo: "Secciones", href: "/pesos/plazo-fijo" },
  { id: "s-billeteras", titulo: "Billeteras y cuentas remuneradas", grupo: "Secciones", href: "/pesos/billeteras", claves: "mercado pago uala naranja" },
  { id: "s-fci", titulo: "Fondos money market", grupo: "Secciones", href: "/pesos/fci", claves: "fci cuotaparte" },
  { id: "s-lecaps", titulo: "LECAPs y BONCAPs", detalle: "Curva y calculadora", grupo: "Secciones", href: "/pesos/lecaps", claves: "letras tasa fija" },
  { id: "s-caucion", titulo: "Caución", grupo: "Secciones", href: "/pesos/caucion" },
  { id: "s-simulador", titulo: "Simulador: pongo $X a N días", grupo: "Secciones", href: "/pesos/simulador" },
  { id: "s-bonos", titulo: "Bonos soberanos y ONs", grupo: "Secciones", href: "/bonos", claves: "bonares globales tir" },
  { id: "s-mercados", titulo: "CEDEARs, acciones y cripto", grupo: "Secciones", href: "/mercados" },
  { id: "s-cartera", titulo: "Mi cartera", grupo: "Secciones", href: "/cartera", claves: "portfolio rendimiento" },
  { id: "s-alertas", titulo: "Alertas", grupo: "Secciones", href: "/alertas" },
  { id: "s-metas", titulo: "Mis metas de ahorro", detalle: "Un viaje, un auto, un depto", grupo: "Secciones", href: "/metas", claves: "objetivo ahorrar plan" },
  { id: "s-aprender", titulo: "Aprender: glosario", grupo: "Secciones", href: "/aprender", claves: "tna tea tem que es" },
  { id: "s-metodologia", titulo: "Metodología y fuentes", grupo: "Secciones", href: "/metodologia" },
  { id: "c-ic", titulo: "Interés compuesto", grupo: "Calculadoras", href: "/calculadoras/interes-compuesto" },
  { id: "c-jub", titulo: "Jubilación", grupo: "Calculadoras", href: "/calculadoras/jubilacion" },
  { id: "c-pf", titulo: "Calculadora de plazo fijo", grupo: "Calculadoras", href: "/calculadoras/plazo-fijo" },
  { id: "c-tasas", titulo: "Conversor de tasas", detalle: "TNA ↔ TEA ↔ TEM", grupo: "Calculadoras", href: "/calculadoras/tasas" },
  { id: "c-infl", titulo: "Inflación: ¿cuánto valen hoy?", grupo: "Calculadoras", href: "/calculadoras/inflacion", claves: "ipc" },
  { id: "c-conv", titulo: "Conversor de dólares", grupo: "Calculadoras", href: "/dolar/conversor" },
  { id: "a-alerta", titulo: "Crear una alerta", grupo: "Acciones", href: "/alertas?nueva=1" },
  { id: "a-posicion", titulo: "Cargar una posición en mi cartera", grupo: "Acciones", href: "/cartera?cargar=1" },
];

function normalizar(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Paleta ⌘K: busca instrumentos, bancos, billeteras, calculadoras y acciones. Navegable con teclado. */
export function CommandPalette() {
  const { paletaAbierta, setPaletaAbierta } = useShell();
  const router = useRouter();
  const { modo, tema } = usePreferencias();
  const [consulta, setConsulta] = useState("");
  const [indice, setIndice] = useState(0);
  const [extras, setExtras] = useState<ItemBusqueda[] | null>(null);
  const lista = useRef<HTMLUListElement>(null);

  // El índice de instrumentos se carga recién la primera vez que se abre la paleta.
  useEffect(() => {
    if (!paletaAbierta || extras) return;
    let vivo = true;
    fetch("/api/buscar")
      .then((r) => (r.ok ? r.json() : []))
      .then((items: ItemBusqueda[]) => vivo && setExtras(items))
      .catch(() => vivo && setExtras([]));
    return () => {
      vivo = false;
    };
  }, [paletaAbierta, extras]);

  const acciones: (ItemBusqueda & { ejecutar?: () => void })[] = useMemo(
    () => [
      { id: "a-modo", titulo: modo === "pro" ? "Pasar a modo Simple" : "Pasar a modo Pro", detalle: "Más o menos detalle técnico", grupo: "Acciones", ejecutar: () => cambiarModo(modo === "pro" ? "simple" : "pro") },
      { id: "a-tema", titulo: tema === "dark" ? "Tema claro" : "Tema oscuro", grupo: "Acciones", ejecutar: () => cambiarTema(tema === "dark" ? "light" : "dark") },
    ],
    [modo, tema],
  );

  const resultados = useMemo(() => {
    const todos = [...BASE, ...acciones, ...(extras ?? [])];
    const q = normalizar(consulta.trim());
    if (!q) return todos.filter((i) => i.grupo !== "Instrumentos" && i.grupo !== "Proveedores").slice(0, 12);
    const palabras = q.split(/\s+/);
    return todos
      .map((i) => {
        const texto = normalizar(`${i.titulo} ${i.detalle ?? ""} ${i.claves ?? ""}`);
        const titulo = normalizar(i.titulo);
        if (!palabras.every((p) => texto.includes(p))) return null;
        const puntaje = (titulo.startsWith(q) ? 3 : 0) + (titulo.includes(q) ? 1 : 0) + (i.grupo === "Instrumentos" && titulo === q ? 5 : 0);
        return { i, puntaje };
      })
      .filter((x): x is { i: (typeof todos)[number]; puntaje: number } => x !== null)
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, 30)
      .map((x) => x.i);
  }, [consulta, extras, acciones]);

  const elegir = (item: (typeof resultados)[number]) => {
    setPaletaAbierta(false);
    setConsulta("");
    if ("ejecutar" in item && typeof item.ejecutar === "function") item.ejecutar();
    else if (item.href) router.push(item.href);
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => Math.min(resultados.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = resultados[indice];
      if (item) elegir(item);
    }
  };

  useEffect(() => {
    lista.current?.querySelector(`[data-indice="${indice}"]`)?.scrollIntoView({ block: "nearest" });
  }, [indice]);

  return (
    <Dialog.Root
      open={paletaAbierta}
      onOpenChange={(v) => {
        setPaletaAbierta(v);
        if (!v) setConsulta("");
      }}
    >
      <AnimatePresence>
        {paletaAbierta && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <m.div className="fixed inset-0 z-50 bg-scrim backdrop-blur-[6px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <m.div
                className="fixed inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-50 mx-auto flex max-h-[min(560px,80dvh)] max-w-[620px] flex-col overflow-hidden rounded-(--radius-panel) border border-border bg-surface shadow-(--shadow-overlay) sm:top-[12vh]"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              >
                <Dialog.Title className="sr-only">Buscar</Dialog.Title>
                <div className="flex items-center gap-3 border-b border-border px-4">
                  <Search className="size-[18px] shrink-0 text-text-3" />
                  <input
                    autoFocus
                    value={consulta}
                    onChange={(e) => {
                      setConsulta(e.target.value);
                      setIndice(0);
                    }}
                    onKeyDown={alTeclear}
                    placeholder="Buscá AL30, T15E7, Mercado Pago, plazo fijo…"
                    aria-label="Buscar"
                    aria-controls="resultados-busqueda"
                    aria-activedescendant={resultados[indice] ? `r-${resultados[indice]!.id}` : undefined}
                    className="h-14 w-full bg-transparent text-[16px] outline-none placeholder:text-text-3"
                  />
                </div>
                <ul ref={lista} id="resultados-busqueda" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
                  {resultados.length === 0 && (
                    <li className="px-3 py-8 text-chico text-text-2">
                      No encontramos “{consulta}”. Probá con un ticker (AL30), un banco o una calculadora.
                    </li>
                  )}
                  {resultados.map((r, i) => {
                    const encabezado = i === 0 || resultados[i - 1]!.grupo !== r.grupo ? r.grupo : null;
                    return (
                      <li key={r.id} role="presentation">
                        {encabezado && <p className="px-3 pt-3 pb-1.5 text-label">{encabezado}</p>}
                        <div
                          id={`r-${r.id}`}
                          role="option"
                          aria-selected={i === indice}
                          data-indice={i}
                          onMouseMove={() => setIndice(i)}
                          onClick={() => elegir(r)}
                          className={cn("flex h-11 cursor-pointer items-center justify-between gap-3 rounded-(--radius-control) px-3", i === indice && "bg-surface-2")}
                        >
                          <span className="min-w-0 truncate text-[15px]">
                            {r.titulo}
                            {r.detalle && <span className="ml-2 text-chico text-text-3">{r.detalle}</span>}
                          </span>
                          <ArrowRight className={cn("size-4 shrink-0", i === indice ? "text-text-3" : "text-transparent")} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </m.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
