import type { gsap } from "gsap";
import { delta, pesos, porcentaje } from "@/lib/format";

/**
 * Coreografías de la historia de la home (narrativa en docs/PROGRESO.md). Cada una recibe una línea de
 * tiempo de duración 1 atada al recorrido de su escena y la llena leyendo el HTML que ya renderizó el
 * servidor (los valores viajan en atributos data-*). Lo que sobra hasta 1 es la pausa: todo quieto.
 */

type Selector = (sel: string) => Element[];
export type DatosMacizo = { monto: number; tope: number; meses: { quietaReal: number; rindeReal: number }[] };
type Contexto = { mobile: boolean; datos?: DatosMacizo };
type Coreografia = (tl: gsap.core.Timeline, q: Selector, ctx: Contexto) => void;

const num = (el: Element | undefined, clave: string) => Number((el as HTMLElement | undefined)?.dataset[clave] ?? 0);
const entrarTitulo = (tl: gsap.core.Timeline, q: Selector, d = 0.1) => tl.from(q("[data-titulo]"), { y: 40, opacity: 0, duration: d, ease: "power2.out" }, 0);

/** Dónde descansa cada ficha del problema y desde qué borde entra. */
const BORDES = [
  { dx: -1, dy: -1, r: -6 },
  { dx: 1, dy: -1, r: 4 },
  { dx: -1, dy: 0, r: 3 },
  { dx: 1, dy: 0, r: -5 },
  { dx: -1, dy: 1, r: 5 },
  { dx: 1, dy: 1, r: -3 },
];

const problema: Coreografia = (tl, q, { mobile }) => {
  q("[data-ficha]").forEach((f, i) => {
    const b = BORDES[i % BORDES.length]!;
    tl.from(f, { xPercent: b.dx * (mobile ? 110 : 160), yPercent: b.dy * (mobile ? 120 : 160) + 40, rotation: b.r * 4, opacity: 0, duration: 0.3, ease: "power2.out" }, 0.04 + i * 0.05);
  });
  tl.from(q("[data-cierre]"), { opacity: 0, y: 24, duration: 0.12, ease: "power1.out" }, 0.5);
};

const respuesta: Coreografia = (tl, q) => {
  const filas = q("[data-fila]");
  // Desorden inicial: cada fila arranca en la posición que tenía antes de compararse (data-desde).
  filas.forEach((f, i) => tl.set(f, { yPercent: (num(f, "desde") - i) * 100 }, 0));
  entrarTitulo(tl, q);
  // 1 · Las barras crecen hasta su TEA y el número cuenta junto con la barra.
  filas.forEach((f) => {
    const en = 0.1 + num(f, "desde") * 0.035;
    tl.from(f.querySelector("[data-barra]"), { scaleX: 0, duration: 0.2, ease: "power1.out" }, en);
    const cifra = f.querySelector<HTMLElement>("[data-cifra]");
    if (cifra) {
      const c = { v: 0 };
      const tea = num(f, "tea");
      tl.to(c, { v: tea, duration: 0.2, ease: "power1.out", onUpdate: () => void (cifra.textContent = porcentaje(c.v, 1)) }, en);
    }
  });
  // 2 · Se ordenan de mayor a menor.
  tl.to(filas, { yPercent: 0, duration: 0.24, ease: "power2.inOut", stagger: 0.01 }, 0.42);
  tl.from(q("[data-mejor]"), { scale: 0.6, opacity: 0, duration: 0.06, ease: "back.out(2)" }, 0.66);
  tl.from(q("[data-cierre]"), { y: 20, opacity: 0, duration: 0.08 }, 0.7);
};

const dolar: Coreografia = (tl, q) => {
  entrarTitulo(tl, q);
  const puntos = q("[data-punto]");
  puntos.forEach((p, i) => {
    tl.from(p, { xPercent: 100 - num(p, "pos"), duration: 0.22, ease: "power2.out" }, 0.1 + i * 0.03);
    tl.from(p.firstElementChild, { opacity: 0, duration: 0.05 }, 0.1 + i * 0.03);
  });
  const fin = 0.1 + puntos.length * 0.03 + 0.2;
  tl.from(q("[data-guia]"), { scaleY: 0, duration: 0.08, ease: "power2.out" }, fin);
  tl.from(q("[data-ganador]"), { opacity: 0, duration: 0.06 }, fin);
  const cifra = q("[data-ahorro]")[0] as HTMLElement | undefined;
  if (cifra) {
    const c = { v: 0 };
    const ahorro = num(cifra, "valor");
    tl.to(c, { v: ahorro, duration: 0.14, ease: "power1.out", onUpdate: () => void (cifra.textContent = pesos(Math.round(c.v), 0)) }, fin + 0.02);
  }
  tl.from(q("[data-cierre]"), { y: 20, opacity: 0, duration: 0.08 }, fin);
};

const cartera: Coreografia = (tl, q) => {
  entrarTitulo(tl, q);
  tl.from(q("[data-linea]"), { strokeDashoffset: 1, duration: 0.42, ease: "none", stagger: 0.04 }, 0.1);
  tl.from(q("[data-fin]"), { opacity: 0, scale: 0.5, duration: 0.05, stagger: 0.04, ease: "back.out(2)" }, 0.52);
  q("[data-veredicto]").forEach((el, i) => {
    tl.from(el, { y: 30, opacity: 0, duration: 0.08, ease: "power2.out" }, 0.62 + i * 0.04);
    const cifra = el.querySelector<HTMLElement>("[data-cifra]");
    if (cifra) {
      const c = { v: 0 };
      const objetivo = num(cifra, "valor");
      tl.to(c, { v: objetivo, duration: 0.12, ease: "power1.out", onUpdate: () => void (cifra.textContent = delta(c.v, 1)) }, 0.62 + i * 0.04);
    }
  });
};

const alertas: Coreografia = (tl, q) => {
  entrarTitulo(tl, q);
  q("[data-aviso]").forEach((el, i) => {
    const en = 0.14 + i * 0.16;
    tl.from(el, { yPercent: -70, y: -40, opacity: 0, scale: 0.94, duration: 0.12, ease: "back.out(1.4)" }, en);
    const marca = el.querySelector("[data-marca]");
    if (marca) tl.from(marca, { scale: 0, duration: 0.05, ease: "back.out(3)" }, en + 0.1);
  });
};

const macizo: Coreografia = (tl, q, { datos }) => {
  if (!datos) return;
  const { meses, monto, tope } = datos;
  const escala = (v: number) => v / monto / tope;
  const hueca = q("[data-hueca]")[0] as HTMLElement | undefined;
  const maciza = q("[data-maciza]")[0] as HTMLElement | undefined;
  const contadores = q("[data-mes]") as HTMLElement[];
  const vHueca = q("[data-valor-hueca]")[0] as HTMLElement | undefined;
  const vMaciza = q("[data-valor-maciza]")[0] as HTMLElement | undefined;
  if (!hueca || !maciza || !vHueca || !vMaciza) return;
  const pintar = (t: number) => {
    const i = Math.min(Math.floor(t), meses.length - 2);
    const f = t - i;
    const a = meses[i]!;
    const b = meses[i + 1]!;
    const quieta = a.quietaReal + (b.quietaReal - a.quietaReal) * f;
    const rinde = a.rindeReal + (b.rindeReal - a.rindeReal) * f;
    hueca.style.transform = `scaleY(${escala(quieta)})`;
    maciza.style.transform = `scaleY(${escala(rinde)})`;
    contadores.forEach((c) => (c.textContent = String(Math.round(t))));
    vHueca.textContent = pesos(Math.round(quieta / 100) * 100, 0);
    vMaciza.textContent = pesos(Math.round(rinde / 100) * 100, 0);
  };
  const tiempo = { t: 0 };
  pintar(0);
  entrarTitulo(tl, q, 0.08);
  tl.to(tiempo, { t: meses.length - 1, duration: 0.6, ease: "none", onUpdate: () => pintar(tiempo.t) }, 0.12);
  tl.from(q("[data-cierre]"), { y: 24, opacity: 0, duration: 0.08 }, 0.74);
};

const confianza: Coreografia = (tl, q) => {
  entrarTitulo(tl, q);
  q("[data-fuente]").forEach((f, i) => {
    tl.from(f, { y: 26, opacity: 0, duration: 0.08, ease: "power2.out" }, 0.1 + i * 0.05);
    tl.from(f.querySelector("[data-estado]"), { opacity: 0, x: 10, duration: 0.05 }, 0.16 + i * 0.05);
  });
  tl.from(q("[data-regla]"), { y: 24, opacity: 0, duration: 0.08, stagger: 0.05, ease: "power2.out" }, 0.18);
};

const cierre: Coreografia = (tl, q) => {
  tl.from(q(".escena-interior"), { yPercent: 18, duration: 0.6, ease: "power2.out" }, 0);
  tl.from(q("[data-gigante]"), { scale: 0.9, transformOrigin: "0% 100%", duration: 0.7, ease: "power2.out" }, 0.1);
  tl.from(q("[data-acciones]"), { y: 30, opacity: 0, duration: 0.25, ease: "power2.out" }, 0.55);
};

export const COREOGRAFIAS = { problema, respuesta, dolar, cartera, alertas, macizo, confianza, cierre } satisfies Record<string, Coreografia>;
export type NombreCoreografia = keyof typeof COREOGRAFIAS;
