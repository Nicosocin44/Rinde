/** Una fila del archivo del broker que no se suma, con el motivo (se muestra en la vista previa, sin tilde). */
export type Omitida = { n: number; texto: string; fecha: string | null; motivo: string };

/**
 * Un archivo de broker pasado a nuestra planilla: `filas` con los títulos de `COLUMNAS` en la primera; `origen[k]` es el
 * número de fila en el archivo original de la fila k + 1 (para que la vista previa diga "Fila 12" como en el Excel).
 */
export type ArchivoConvertido = { filas: string[][]; origen: number[]; omitidas: Omitida[] };
