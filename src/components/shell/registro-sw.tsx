"use client";

import { useEffect } from "react";

/** Registra el service worker (solo en producción: en desarrollo interferiría con la recarga en caliente). */
export function RegistroSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const registrar = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
  }, []);
  return null;
}
