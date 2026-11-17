import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variante = "primario" | "secundario" | "fantasma" | "sol";
type Tamano = "sm" | "md" | "lg";

/**
 * Botones píldora con movimiento: al pasar el mouse, un relleno sube desde abajo y cambia el color
 * (el primario se tiñe de sol); la flecha en su círculo se desliza en diagonal. Al apretar, baja a 0,97.
 */
const base =
  "group/boton relative isolate inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full font-display font-semibold tracking-[-0.01em] select-none " +
  "transition-[color,border-color,transform,box-shadow] duration-(--duration-base) ease-(--ease-standard) active:scale-[0.97] " +
  "disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0";

const variantes: Record<Variante, { boton: string; relleno: string }> = {
  primario: { boton: "bg-inverse text-on-inverse hover:text-tinta", relleno: "bg-sol" },
  sol: { boton: "bg-sol text-tinta hover:text-papel", relleno: "bg-tinta" },
  secundario: { boton: "border border-border-strong text-text hover:text-on-inverse hover:border-inverse", relleno: "bg-inverse" },
  fantasma: { boton: "text-text-2 hover:text-text", relleno: "bg-surface-2" },
};

const tamanos: Record<Tamano, string> = {
  sm: "h-10 px-4 text-[14px]",
  md: "h-12 px-5 text-[15px]",
  lg: "h-14 px-7 text-[17px]",
};

/** Solo las clases (para enlaces externos u otros elementos). Sin el relleno animado. */
export function estiloBoton(variante: Variante = "secundario", tamano: Tamano = "md", extra?: string) {
  return cn(base, variantes[variante].boton, tamanos[tamano], extra);
}

function Interior({ variante, flecha, children }: { variante: Variante; flecha?: boolean; children: ReactNode }) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 translate-y-[101%] rounded-full transition-transform duration-(--duration-base) ease-(--ease-standard) group-hover/boton:translate-y-0",
          variantes[variante].relleno,
        )}
      />
      {children}
      {flecha && (
        <span aria-hidden className="relative -mr-2 ml-1 inline-flex size-7 items-center justify-center overflow-hidden rounded-full bg-current/15">
          <ArrowUpRight className="transition-transform duration-(--duration-base) ease-(--ease-standard) group-hover/boton:translate-x-4 group-hover/boton:-translate-y-4" />
          <ArrowUpRight className="absolute -translate-x-4 translate-y-4 transition-transform duration-(--duration-base) ease-(--ease-standard) group-hover/boton:translate-x-0 group-hover/boton:translate-y-0" />
        </span>
      )}
    </>
  );
}

type PropsBoton = ComponentProps<"button"> & { variante?: Variante; tamano?: Tamano; flecha?: boolean };

export function Button({ variante = "secundario", tamano = "md", flecha, className, type = "button", children, ...props }: PropsBoton) {
  return (
    <button type={type} className={estiloBoton(variante, tamano, className)} {...props}>
      <Interior variante={variante} flecha={flecha}>
        {children}
      </Interior>
    </button>
  );
}

type PropsLink = ComponentProps<typeof Link> & { variante?: Variante; tamano?: Tamano; flecha?: boolean; children: ReactNode };

export function ButtonLink({ variante = "secundario", tamano = "md", flecha, className, children, ...props }: PropsLink) {
  return (
    <Link className={estiloBoton(variante, tamano, className)} {...props}>
      <Interior variante={variante} flecha={flecha}>
        {children}
      </Interior>
    </Link>
  );
}

/** Botón redondo solo con ícono. Siempre con `aria-label`. */
export function IconButton({ className, ...props }: ComponentProps<"button"> & { "aria-label": string }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full text-text-2 transition-[background-color,color,transform] duration-(--duration-short) active:scale-95",
        "hover:bg-surface-2 hover:text-text [&_svg]:size-[18px]",
        className,
      )}
      {...props}
    />
  );
}
