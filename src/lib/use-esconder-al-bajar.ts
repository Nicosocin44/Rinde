"use client";

import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent, useState, type RefObject } from "react";

/**
 * Cuánto hay que scrollear (px) para que cuente como bajar o subir: así un temblor del dedo no mueve nada. Más de 8: al
 * empezar a bajar, la barra de arriba se achica 8 px (de 64 a 56 en la compu) y el navegador corrige el scroll esos 8 px
 * para atrás; eso no tiene que contar como "subir".
 */
const UMBRAL_SCROLL = 12;

/**
 * Barras que se esconden mientras se baja leyendo y vuelven apenas se scrollea para arriba, como en Safari o Instagram
 * (pedido de Benja, 25/11/2026: las barras fijas tapaban el contenido). Devuelve si la barra tiene que estar escondida.
 *
 * - `ref`: la barra. Si el foco de teclado está adentro (se llegó con Tab) no se esconde, y al entrar ese foco vuelve.
 * - `puede()`: si ya se puede esconder (la barra de arriba, pasado su alto; las solapas, cuando ya quedaron pegadas).
 *   Antes de eso, siempre a la vista.
 *
 * Al cambiar de página vuelve a verse. Todas las barras que lo usan escuchan el mismo scroll con el mismo umbral, así
 * que se esconden y vuelven juntas. Directo en el evento de scroll (el navegador lo manda como mucho una vez por
 * cuadro): solo lee posiciones.
 */
export function useEsconderAlBajar(ref: RefObject<HTMLElement | null>, puede: () => boolean): boolean {
  const pathname = usePathname();
  // En qué página se escondió: al cambiar de página vuelve a verse sola.
  const [ocultaEn, setOcultaEn] = useState<string | null>(null);
  const sePuede = useEffectEvent(puede);
  const rutaActual = useEffectEvent(() => pathname);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ultimo = window.scrollY;
    const alScrollear = () => {
      const y = window.scrollY;
      const delta = y - ultimo;
      if (Math.abs(delta) < UMBRAL_SCROLL) return;
      ultimo = y;
      // Solo el foco de teclado la retiene (:focus-visible). Un clic con el mouse también deja el foco en el link (Chrome),
      // y entonces las solapas quedaban a la vista mientras la barra de arriba se escondía.
      const esconder = delta > 0 && sePuede() && !el.querySelector(":focus-visible");
      setOcultaEn(esconder ? rutaActual() : null);
    };
    const alEnfocar = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.matches(":focus-visible")) setOcultaEn(null);
    };
    window.addEventListener("scroll", alScrollear, { passive: true });
    el.addEventListener("focusin", alEnfocar);
    return () => {
      window.removeEventListener("scroll", alScrollear);
      el.removeEventListener("focusin", alEnfocar);
    };
  }, [ref]);

  return ocultaEn === pathname;
}
