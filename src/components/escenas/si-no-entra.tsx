"use client";

import { useLayoutEffect, useRef } from "react";

/** Avisa a los directores que una escena cambió de modo (fija ↔ fluida), para que recalculen su recorrido. */
export const EVENTO_ALTO_ESCENA = "escena:alto";

/** Margen para no pasar a fluida por un par de píxeles de redondeo. */
const TOLERANCIA = 8;

/**
 * Si el contenido de la escena no entra en la pantalla (una notebook con la barra del navegador, una ventana baja),
 * la escena deja de quedar fija: fluye como una página común y nada se corta. El diseño no cambia (mismos títulos y
 * espacios); solo se pierde el efecto de escena pegada en esa pantalla.
 *
 * Mide el alto natural del contenido y marca la sección con `data-bajo`, que leen el CSS (globals.css) y el director
 * (que reparte la coreografía en el recorrido, como en mobile). Vuelve a medir al cambiar el tamaño de la ventana.
 */
export function SiNoEntra() {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current?.closest<HTMLElement>("[data-escena]");
    const contenido = el?.querySelector<HTMLElement>(".escena-interior")?.firstElementChild;
    if (!el || !(contenido instanceof HTMLElement)) return;

    // En el celular, una escena con fluidoMobile ya fluye siempre: no hay nada que medir.
    const fluidaEnCelular = () => el.dataset.fluido === "true" && window.matchMedia("(max-width: 767px)").matches;
    const medir = () => {
      if (fluidaEnCelular()) return;
      // Por un instante (sin pintar), el interior suelta su alto de pantalla para medir lo que ocupa de verdad.
      el.dataset.midiendo = "true";
      const alto = contenido.getBoundingClientRect().height;
      delete el.dataset.midiendo;
      const bajo = alto > window.innerHeight + TOLERANCIA;
      if ((el.dataset.bajo === "true") === bajo) return;
      el.dataset.bajo = String(bajo);
      window.dispatchEvent(new Event(EVENTO_ALTO_ESCENA));
    };

    medir();
    let espera: number | undefined;
    // En pantallas táctiles, la barra del navegador se esconde y aparece al scrollear y cambia el alto de la ventana:
    // eso no cuenta (volver a medir en pleno scroll recalculaba todos los recorridos y la página se trababa). Sí cuenta
    // girar el teléfono o cambiar el ancho.
    const tactil = window.matchMedia("(pointer: coarse)").matches;
    let ancho = window.innerWidth;
    const alCambiar = () => {
      if (tactil && window.innerWidth === ancho) return;
      ancho = window.innerWidth;
      window.clearTimeout(espera);
      espera = window.setTimeout(medir, 150);
    };
    window.addEventListener("resize", alCambiar);
    // Con las tipografías finales el texto puede ocupar otro alto.
    void document.fonts?.ready.then(medir);
    return () => {
      window.removeEventListener("resize", alCambiar);
      window.clearTimeout(espera);
    };
  }, []);

  return <span ref={ref} hidden />;
}
