import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export default function NoEncontrado() {
  return (
    <div className="flex min-h-[60vh] flex-col justify-center gap-6 py-20">
      <p className="text-label">Error 404</p>
      <h1 className="text-display max-w-3xl text-balance">Esta página no rinde.</h1>
      <p className="max-w-lg text-[17px] leading-[27px] text-text-2">No existe o cambió de lugar. Probá con el buscador (⌘K) o empezá por lo más visitado:</p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/" variante="primario" tamano="lg">
          Ir al inicio
        </ButtonLink>
        <ButtonLink href="/dolar" tamano="lg">
          Dólar hoy
        </ButtonLink>
        <ButtonLink href="/pesos" tamano="lg">
          ¿Dónde rinde más?
        </ButtonLink>
      </div>
      <Link href="/metodologia" className="text-chico text-text-3 hover:text-text-2">
        ¿Encontraste un link roto? Avisanos.
      </Link>
    </div>
  );
}
