/** Une clases condicionales. Sin dependencias: alcanza para nuestro uso. */
export function cn(...clases: (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(" ");
}
