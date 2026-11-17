import { Escena } from "@/components/escenas/escena";
import { Director } from "./director";
import { ButtonLink } from "@/components/ui/button";

/**
 * Escena 8 · Cierre. Una lámina sol que sube desde abajo mientras entra; el titular se asienta
 * (de 0,9 a 1 de escala) cuando la lámina llega a su lugar. Termina quieta.
 */
export function EscenaCierre() {
  return (
    <Escena
      etiqueta="Empezá"
      alto={100}
      className="sobre-color a-lo-ancho lamina-cerrada mt-10 h-auto! bg-sol md:mt-16"
      claseInterior="static! h-auto! overflow-visible!"
      director={<Director coreografia="cierre" comienzo="top bottom" />}
    >
      <div className="flex flex-col gap-8 py-16 md:gap-12 md:py-24 lg:py-28">
        <h2 data-gigante className="font-display text-[68px] leading-[0.88] font-extrabold tracking-[-0.06em] md:text-[132px] xl:text-[176px]">
          Empezá
          <br />
          gratis.
        </h2>
        <div data-acciones className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-12">
          <p className="max-w-[42ch] text-[16px] leading-[24px] md:text-[19px] md:leading-[29px]">
            Sin registrarte: tu cartera y tus alertas se guardan en tu navegador. El dólar, las tasas y las calculadoras están abiertos para todos.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/cartera" variante="primario" tamano="lg" flecha>
              Armar mi cartera
            </ButtonLink>
            <ButtonLink href="/alertas" variante="secundario" tamano="lg">
              Crear una alerta
            </ButtonLink>
          </div>
        </div>
      </div>
    </Escena>
  );
}
