import { Skeleton } from "@/components/ui/estados";

/** Mientras carga: el mismo esqueleto que la pantalla (precio, selector, volatilidad y cadena). */
export default function Cargando() {
  return (
    <div aria-busy className="flex flex-col">
      <section className="mb-12 flex flex-col gap-3 lg:mb-16">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-14 w-64" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </section>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-10 w-72" />
        </div>
        <Skeleton className="h-28 w-full" />
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
