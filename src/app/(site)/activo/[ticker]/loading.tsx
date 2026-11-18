import { Skeleton } from "@/components/ui/estados";

/** Esqueleto de la ficha: mismo layout que la página (encabezado, gráfico y datos clave). */
export default function Cargando() {
  return (
    <div aria-busy className="flex flex-col gap-8 pt-6 lg:pt-14">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-5 w-56" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[320px] w-full" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
