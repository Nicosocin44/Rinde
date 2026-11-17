"use client";

import { useSyncExternalStore } from "react";

/**
 * Preferencias del usuario (tema, modo Simple/Pro, colores alternativos).
 * Viven como atributos en <html> (los fija un script antes de pintar, sin parpadeo) y en localStorage.
 * El CSS reacciona a los atributos; este store solo sirve para los controles que las cambian.
 */

export type Tema = "dark" | "light";
export type Modo = "simple" | "pro";
export type Preferencias = { tema: Tema; modo: Modo; coloresAlt: boolean };

const CLAVES = { tema: "rinde:tema", modo: "rinde:modo", colores: "rinde:colores" } as const;
const POR_DEFECTO: Preferencias = { tema: "dark", modo: "simple", coloresAlt: false };

/** Script inline para <head>: aplica las preferencias antes del primer pintado. */
export const SCRIPT_PREFERENCIAS = `(function(){try{var d=document.documentElement;d.dataset.js='';var q=new URLSearchParams(location.search);var t=q.get('tema')||localStorage.getItem('${CLAVES.tema}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}d.dataset.theme=t;var m=q.get('modo')||localStorage.getItem('${CLAVES.modo}');d.dataset.modo=m==='pro'?'pro':'simple';if(localStorage.getItem('${CLAVES.colores}')==='alt')d.dataset.colores='alt'}catch(e){document.documentElement.dataset.theme='dark'}})();`;

let cache: Preferencias = POR_DEFECTO;
let firma = "";

function leer(): Preferencias {
  const d = document.documentElement.dataset;
  const nueva = `${d.theme}|${d.modo}|${d.colores}`;
  if (nueva !== firma) {
    firma = nueva;
    cache = { tema: d.theme === "light" ? "light" : "dark", modo: d.modo === "pro" ? "pro" : "simple", coloresAlt: d.colores === "alt" };
  }
  return cache;
}

function suscribir(avisar: () => void): () => void {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-modo", "data-colores"] });
  return () => observador.disconnect();
}

export function usePreferencias(): Preferencias {
  return useSyncExternalStore(suscribir, leer, () => POR_DEFECTO);
}

function guardar(clave: string, valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch {
    // Navegación privada o almacenamiento bloqueado: la preferencia vale solo para esta visita.
  }
}

export function cambiarTema(tema: Tema) {
  const html = document.documentElement;
  const aplicar = () => {
    html.dataset.theme = tema;
  };
  // Transición de tema suave donde el navegador la soporta.
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (doc.startViewTransition && !reducido) doc.startViewTransition(aplicar);
  else aplicar();
  guardar(CLAVES.tema, tema);
}

export function cambiarModo(modo: Modo) {
  document.documentElement.dataset.modo = modo;
  guardar(CLAVES.modo, modo);
}

export function cambiarColoresAlt(activo: boolean) {
  if (activo) document.documentElement.dataset.colores = "alt";
  else delete document.documentElement.dataset.colores;
  guardar(CLAVES.colores, activo ? "alt" : null);
}
