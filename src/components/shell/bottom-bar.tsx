"use client";

import { BadgeDollarSign, ChartPie, House, LayoutGrid, Landmark } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navPrincipal, navSecundaria } from "@/config/site";
import dynamic from "next/dynamic";

// El menú "Más" se baja recién cuando se abre por primera vez.
const Sheet = dynamic(() => import("@/components/ui/sheet").then((m) => m.Sheet), { ssr: false });
import { cn } from "@/lib/cn";
import { ToggleModo } from "./preferencias-controles";
import { useShell } from "./shell-context";
import { rutaActiva } from "./top-nav";
import { cambiarColoresAlt, cambiarTema, usePreferencias } from "@/lib/preferencias";

const ITEMS = [
  { href: "/", label: "Inicio", Icono: House },
  { href: "/dolar", label: "Dólar", Icono: BadgeDollarSign },
  { href: "/pesos", label: "Pesos", Icono: Landmark },
  { href: "/cartera", label: "Cartera", Icono: ChartPie },
] as const;

/** Barra inferior mobile: una cápsula flotante. La sección activa se marca con una píldora tinta/papel. */
export function BottomBar() {
  const pathname = usePathname();
  const { masAbierto, setMasAbierto } = useShell();
  const [montado, setMontado] = useState(false);
  if (masAbierto && !montado) setMontado(true);
  const enMas = !ITEMS.some((i) => rutaActiva(pathname, i.href));

  return (
    <>
      <nav
        aria-label="Principal"
        className="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-40 lg:hidden"
        style={{ viewTransitionName: "barra-inferior" }}
      >
        <ul className="vidrio mx-auto grid h-16 max-w-md grid-cols-5 rounded-full border border-border p-1.5 shadow-(--shadow-overlay)">
          {ITEMS.map(({ href, label, Icono }) => {
            const activo = rutaActiva(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "presionable flex h-full flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-(--duration-short)",
                    activo ? "bg-inverse text-on-inverse" : "text-text-3",
                  )}
                >
                  <Icono className="size-5" strokeWidth={1.75} />
                  <span className="text-[10px] leading-none font-semibold">{label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMasAbierto(true)}
              aria-haspopup="dialog"
              className={cn(
                "presionable flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-(--duration-short)",
                enMas ? "bg-inverse text-on-inverse" : "text-text-3",
              )}
            >
              <LayoutGrid className="size-5" strokeWidth={1.75} />
              <span className="text-[10px] leading-none font-semibold">Más</span>
            </button>
          </li>
        </ul>
      </nav>
      {(masAbierto || montado) && (
        <Sheet abierto={masAbierto} onCambio={setMasAbierto} titulo="Más" lado="abajo">
          <MenuMas onElegir={() => setMasAbierto(false)} />
        </Sheet>
      )}
    </>
  );
}

function MenuMas({ onElegir }: { onElegir: () => void }) {
  const pathname = usePathname();
  const { tema, coloresAlt } = usePreferencias();
  const secciones = [...navPrincipal.filter((n) => !ITEMS.some((i) => i.href === n.href)), ...navSecundaria.filter((n) => n.href !== "/cartera")];
  return (
    <div className="flex flex-col gap-6">
      <ul className="grid grid-cols-2 gap-2">
        {secciones.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              onClick={onElegir}
              className={cn(
                "presionable flex h-12 items-center rounded-(--radius-control) border border-border px-4 text-[15px] font-medium",
                rutaActiva(pathname, s.href) ? "bg-surface-2 text-text" : "text-text-2",
              )}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-4 border-t border-border pt-5">
        <Fila etiqueta="Nivel de detalle" ayuda="Pro muestra TEM, TIR, duration e implícitos.">
          <ToggleModo tamano="md" />
        </Fila>
        <Fila etiqueta="Tema">
          <button type="button" onClick={() => cambiarTema(tema === "dark" ? "light" : "dark")} className="h-9 rounded-(--radius-control) bg-surface-2 px-3.5 text-[14px] font-medium">
            {tema === "dark" ? "Oscuro" : "Claro"}
          </button>
        </Fila>
        <Fila etiqueta="Colores alternativos" ayuda="Suba en azul y baja en naranja.">
          <button
            type="button"
            role="switch"
            aria-checked={coloresAlt}
            onClick={() => cambiarColoresAlt(!coloresAlt)}
            className={cn("relative h-[31px] w-[51px] rounded-full transition-colors", coloresAlt ? "bg-accent" : "bg-surface-2 ring-1 ring-border-strong")}
          >
            <span className={cn("absolute top-[2px] size-[27px] rounded-full bg-white shadow-(--shadow-thumb) transition-transform duration-(--duration-short)", coloresAlt ? "translate-x-[22px]" : "translate-x-[2px]")} />
            <span className="sr-only">Colores alternativos</span>
          </button>
        </Fila>
      </div>
    </div>
  );
}

function Fila({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-[15px] font-medium">{etiqueta}</p>
        {ayuda && <p className="text-chico text-text-3">{ayuda}</p>}
      </div>
      {children}
    </div>
  );
}
