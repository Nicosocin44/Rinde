import { cn } from "@/lib/cn";

/**
 * Flecha en un círculo de tinta: el remate de toda tarjeta clickeable. Gira 45° cuando el mouse entra
 * a la tarjeta (el padre tiene que tener la clase `group`).
 */
export function FlechaCirculo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-inverse text-on-inverse transition-transform duration-(--duration-base) ease-(--ease-rebote) group-hover:rotate-45",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12 12 4M6 4h6v6" />
      </svg>
    </span>
  );
}
