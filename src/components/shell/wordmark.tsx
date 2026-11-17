import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";

/** Logotipo: el nombre en Bricolage extra negrita, en minúscula, con un punto de sol que late al pasar el mouse. */
export function Wordmark({ className, tamano = "md" }: { className?: string; tamano?: "md" | "lg" }) {
  return (
    <Link href="/" aria-label={`${site.name}, inicio`} className={cn("group inline-flex items-baseline rounded-full", className)}>
      <span className={cn("font-display leading-none font-extrabold tracking-[-0.06em] text-text", tamano === "lg" ? "text-[44px]" : "text-[24px]")}>
        {site.name.toLowerCase()}
      </span>
      <span
        aria-hidden
        className={cn(
          "ml-[0.06em] inline-block rounded-full bg-sol transition-transform duration-(--duration-base) ease-(--ease-rebote) group-hover:scale-150",
          tamano === "lg" ? "size-[11px]" : "size-[7px]",
        )}
      />
    </Link>
  );
}
