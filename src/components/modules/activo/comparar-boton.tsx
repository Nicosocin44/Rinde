import { ChartLine } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

/** "Comparar": abre la comparación de activos con este ya elegido, para sumarle otros. */
export function BotonComparar({ ticker }: { ticker: string }) {
  return (
    <ButtonLink href={`/mercados/comparar?t=${encodeURIComponent(ticker)}`} variante="secundario" tamano="sm">
      <ChartLine />
      Comparar
    </ButtonLink>
  );
}
