import { estadoDolarImplicito, primaContraMep } from "@/lib/calculos";
import { cn } from "@/lib/cn";
import { pesos, porcentaje } from "@/lib/format";

/**
 * El dólar implícito de los CEDEARs (mediana de los 30 más operados) contra el MEP. Casi siempre es casi igual al MEP,
 * así que va en una línea chica arriba de la tabla. Solo se destaca, con un aviso de color, cuando se separa 2 % o más:
 * ahí comprar CEDEARs en pesos sale bastante más caro (o más barato) que hacerlo con dólares MEP.
 */
export function DolarImplicito({ implicito, mep }: { implicito: number | null; mep: number | null }) {
  if (!implicito) return null;
  const prima = mep ? primaContraMep(implicito, mep) : null;
  const estado = estadoDolarImplicito(prima);
  const diferencia = prima === null ? null : porcentaje(Math.abs(prima), 1);

  if (estado === "caro" || estado === "barato") {
    return (
      <p
        className={cn(
          "mb-5 max-w-3xl rounded-(--radius-card) border px-4 py-3 text-chico text-text-2",
          estado === "caro" ? "border-loss/30 bg-loss/10" : "border-gain/30 bg-gain/10",
        )}
      >
        <span className={cn("font-semibold", estado === "caro" ? "text-loss" : "text-gain")}>
          Hoy comprar CEDEARs en pesos sale {diferencia} {estado === "caro" ? "más caro" : "más barato"} que el dólar MEP.
        </span>{" "}
        Su dólar implícito es <span className="tabular font-medium text-text">{pesos(implicito, 2)}</span> y el MEP con bonos, <span className="tabular font-medium text-text">{pesos(mep!, 2)}</span>.
        {estado === "caro" ? " Conviene comparar antes de comprar." : ""} En modo Pro ves el de cada CEDEAR.
      </p>
    );
  }

  return (
    <p className="mb-4 text-chico text-text-2">
      Dólar implícito de los CEDEARs: <span className="tabular font-medium text-text">{pesos(implicito, 2)}</span>
      {prima !== null && (
        <>
          {" "}
          · {Math.abs(prima) < 0.0005 ? "igual que el MEP" : `${diferencia} ${prima < 0 ? "menos" : "más"} que el MEP`}
        </>
      )}
      <span className="text-text-3"> · mediana de los 30 más operados</span>
    </p>
  );
}
