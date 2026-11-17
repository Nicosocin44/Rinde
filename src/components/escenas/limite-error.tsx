"use client";

import { Component, type ReactNode } from "react";

/**
 * Error boundary por sección: si una escena falla, se cae sola y la página sigue entera.
 */
export class LimiteError extends Component<{ children: ReactNode; nombre: string }, { fallo: boolean }> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`La sección "${this.props.nombre}" falló:`, error);
  }

  render() {
    if (this.state.fallo) {
      return (
        <div role="status" className="py-16 text-center text-text-2">
          Esta sección no se pudo mostrar. El resto de la página sigue funcionando.
        </div>
      );
    }
    return this.props.children;
  }
}
