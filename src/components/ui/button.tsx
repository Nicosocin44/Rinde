import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variante = "primario" | "secundario" | "fantasma";
type Tamano = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none presionable " +
  "transition-[background-color,border-color,color,transform] duration-(--duration-micro) ease-(--ease-standard) " +
  "disabled:opacity-40 disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const variantes: Record<Variante, string> = {
  // Sólido con el color de texto invertido, en forma de píldora.
  primario: "rounded-full bg-inverse text-on-inverse hover:opacity-90",
  secundario: "rounded-(--radius-control) bg-surface-2 text-text border border-border hover:border-border-strong",
  fantasma: "rounded-(--radius-control) text-text-2 hover:text-text hover:bg-surface-2",
};

const tamanos: Record<Tamano, string> = {
  sm: "h-9 px-3.5 text-[14px]",
  md: "h-10 px-4 text-[14px]",
  lg: "h-11 px-5 text-[15px]",
};

export function estiloBoton(variante: Variante = "secundario", tamano: Tamano = "md", extra?: string) {
  return cn(base, variantes[variante], tamanos[tamano], extra);
}

type PropsBoton = ComponentProps<"button"> & { variante?: Variante; tamano?: Tamano };

export function Button({ variante = "secundario", tamano = "md", className, type = "button", ...props }: PropsBoton) {
  return <button type={type} className={estiloBoton(variante, tamano, className)} {...props} />;
}

type PropsLink = ComponentProps<typeof Link> & { variante?: Variante; tamano?: Tamano; children: ReactNode };

export function ButtonLink({ variante = "secundario", tamano = "md", className, ...props }: PropsLink) {
  return <Link className={estiloBoton(variante, tamano, className)} {...props} />;
}

/** Botón cuadrado solo con ícono. Siempre con `aria-label`. */
export function IconButton({ className, ...props }: ComponentProps<"button"> & { "aria-label": string }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-(--radius-control) text-text-2 presionable",
        "transition-colors duration-(--duration-micro) hover:bg-surface-2 hover:text-text [&_svg]:size-[18px]",
        className,
      )}
      {...props}
    />
  );
}
