import Link from "next/link";
import { site } from "@/config/site";
import { cn } from "@/lib/cn";

/** Wordmark tipográfico. El nombre sale de config/site.ts. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label={`${site.name}, inicio`} className={cn("group inline-flex items-center gap-[7px] rounded-md", className)}>
      <span aria-hidden className="relative inline-flex size-[18px] items-end gap-[2px]">
        {/* Tres barras crecientes: el "rinde" mínimo. La última, en el color de marca. */}
        <span className="h-[7px] w-[4px] rounded-[1.5px] bg-text-3" />
        <span className="h-[11px] w-[4px] rounded-[1.5px] bg-text-2" />
        <span className="h-[16px] w-[4px] rounded-[1.5px] bg-accent transition-[height] duration-(--duration-base) ease-(--ease-standard) group-hover:h-[18px]" />
      </span>
      <span className="font-display text-[19px] leading-none font-bold tracking-[-0.035em] text-text">{site.name}</span>
    </Link>
  );
}
