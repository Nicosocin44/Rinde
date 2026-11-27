"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ArchivoLeido } from "@/lib/cartera/brokers";
import {
  adivinarMapeo,
  adivinarOperacion,
  CAMPOS,
  camposQueFaltan,
  DESTINOS,
  firmaColumnas,
  valoresDeOperacion,
  type Campo,
  type Destino,
  type Mapeo,
  type TipoPorDefecto,
} from "@/lib/cartera/brokers/columnas";

const SELECT = "h-11 w-full min-w-0 rounded-(--radius-control) border border-border-strong bg-surface-2 px-3 text-[16px]";
const CLAVE_GUARDADOS = "rinde:importar-columnas";

/** El mapeo que se usó la última vez para un archivo con los mismos títulos (en este navegador), o null. */
export function mapeoGuardado(filas: string[][]): Mapeo | null {
  const encabezado = adivinarMapeo(filas).encabezado;
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_GUARDADOS) ?? "{}") as Record<string, Mapeo>;
    const m = guardados[firmaColumnas(filas, encabezado)];
    return m ? { ...m, encabezado } : null;
  } catch {
    return null;
  }
}

export function guardarMapeo(filas: string[][], mapeo: Mapeo) {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE_GUARDADOS) ?? "{}") as Record<string, Mapeo>;
    guardados[firmaColumnas(filas, mapeo.encabezado)] = mapeo;
    localStorage.setItem(CLAVE_GUARDADOS, JSON.stringify(guardados));
  } catch {
    // Sin almacenamiento (ventana privada): la próxima vez se vuelve a preguntar.
  }
}

const NOMBRE_CAMPO = Object.fromEntries(CAMPOS.map((c) => [c.id, c.etiqueta])) as Record<Campo, string>;

/**
 * "¿Qué es cada columna?": para el archivo de un broker que no conocemos. Viene con lo que adivinamos por los títulos;
 * el usuario corrige lo que haga falta y elige qué es cada operación. Lo que elige se recuerda (en este navegador) para
 * la próxima vez que suba un archivo con las mismas columnas.
 */
export function MapeoColumnas({ archivo, broker, onListo, onVolver }: { archivo: ArchivoLeido; broker: string; onListo: (m: Mapeo) => void; onVolver: () => void }) {
  const [mapeo, setMapeo] = useState<Mapeo>(() => adivinarMapeo(archivo.filas));
  const titulos = archivo.filas[mapeo.encabezado] ?? [];
  const ejemplo = archivo.filas.slice(mapeo.encabezado + 1).find((f) => f.filter((c) => c.trim()).length >= 3) ?? [];
  const operaciones = useMemo(() => valoresDeOperacion(archivo.filas, mapeo), [archivo.filas, mapeo]);
  const faltan = camposQueFaltan(mapeo);

  const elegirColumna = (campo: Campo, valor: string) =>
    setMapeo((m) => {
      const columnas = { ...m.columnas };
      if (valor === "") delete columnas[campo];
      else columnas[campo] = Number(valor);
      const siguiente = { ...m, columnas };
      // Las operaciones nuevas (si cambió la columna) arrancan con lo que adivinamos.
      const ops = { ...m.operaciones };
      for (const v of valoresDeOperacion(archivo.filas, siguiente)) if (!(v.clave in ops)) ops[v.clave] = adivinarOperacion(v.ejemplo) ?? "omitir";
      return { ...siguiente, operaciones: ops };
    });

  return (
    <div className="flex flex-col gap-6" data-testid="mapeo-columnas">
      <p className="text-chico text-text-2">
        Es la primera vez que vemos un archivo así de {broker} (<span className="font-medium text-text">{archivo.nombre}</span>). Decinos qué es cada columna: lo recordamos para la próxima.
      </p>

      <section aria-labelledby="titulo-columnas" className="flex flex-col gap-3">
        <h3 id="titulo-columnas" className="text-[15px] font-semibold">
          Columnas
        </h3>
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          {CAMPOS.map((c) => (
            <label key={c.id} className="flex min-w-0 flex-col gap-1">
              <span className="text-chico">
                <span className="font-medium text-text">{c.etiqueta}</span>
                <span className="text-text-3"> · {c.ayuda}</span>
              </span>
              <select className={SELECT} value={mapeo.columnas[c.id] ?? ""} onChange={(e) => elegirColumna(c.id, e.target.value)} aria-label={c.etiqueta}>
                <option value="">{c.obligatorio ? "Elegí una columna" : "No está en el archivo"}</option>
                {titulos.map((t, i) =>
                  t.trim() ? (
                    <option key={i} value={i}>
                      {t}
                      {ejemplo[i]?.trim() ? ` (ej.: ${ejemplo[i]!.trim().slice(0, 24)})` : ""}
                    </option>
                  ) : null,
                )}
              </select>
            </label>
          ))}
        </div>
      </section>

      {operaciones.length > 0 && (
        <section aria-labelledby="titulo-operaciones" className="flex flex-col gap-3">
          <h3 id="titulo-operaciones" className="text-[15px] font-semibold">
            ¿Qué es cada operación?
          </h3>
          <ul className="flex flex-col gap-3">
            {operaciones.slice(0, 20).map((o) => (
              <li key={o.clave} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_200px] sm:gap-4">
                <span className="min-w-0 text-chico">
                  <span className="block truncate font-medium text-text">{o.ejemplo}</span>
                  <span className="text-text-3">{o.filas === 1 ? "1 fila" : `${o.filas} filas`}</span>
                </span>
                <select
                  className={SELECT}
                  value={mapeo.operaciones[o.clave] ?? "omitir"}
                  onChange={(e) => setMapeo((m) => ({ ...m, operaciones: { ...m.operaciones, [o.clave]: e.target.value as Destino } }))}
                  aria-label={`Qué es ${o.ejemplo}`}
                >
                  {DESTINOS.map((d) => (
                    <option key={d.valor} value={d.valor}>
                      {d.etiqueta}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          {operaciones.length > 20 && <p className="text-micro">Hay {operaciones.length - 20} tipos más: van con lo que adivinamos por su texto.</p>}
        </section>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-chico">
          <span className="font-medium text-text">Los tickers que no reconocemos</span>
          <span className="text-text-3"> · si el archivo no dice el tipo de activo</span>
        </span>
        <select className={SELECT} value={mapeo.tipoPorDefecto} onChange={(e) => setMapeo((m) => ({ ...m, tipoPorDefecto: e.target.value as TipoPorDefecto }))}>
          <option value="omitir">No los sumes</option>
          <option value="cedear">Son CEDEARs</option>
          <option value="accion">Son acciones</option>
        </select>
      </label>

      <div className="sticky -bottom-6 -mb-6 flex flex-col gap-3 border-t border-border bg-surface pt-4 pb-6">
        {faltan.length > 0 && (
          <p className="text-chico text-warn" role="status">
            Falta elegir: {faltan.map((c) => (c === "precio" ? "precio o importe" : NOMBRE_CAMPO[c].toLowerCase())).join(", ")}.
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button variante="primario" onClick={() => onListo(mapeo)} disabled={faltan.length > 0} data-testid="confirmar-columnas">
            Ver la vista previa
          </Button>
          <Button variante="fantasma" onClick={onVolver}>
            Volver
          </Button>
        </div>
      </div>
    </div>
  );
}
