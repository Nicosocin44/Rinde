/**
 * Si la sección `href` del menú es la de la página actual (`pathname`, de usePathname()).
 *
 * La portada puede llegar como "/index": cuando Next.js la regenera en segundo plano (revalidate), la versión nueva
 * trae esa ruta y usePathname() la devuelve así. Pasa en producción al entrar directo a la portada; sin esto, ni la
 * barra de arriba ni la de abajo marcaban Inicio (la de abajo marcaba "Más").
 */
export function rutaActiva(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "/index";
  return pathname === href || pathname.startsWith(`${href}/`);
}
