import { resolverProveedor } from "@data/ar/proveedores";
import { LOGOS_ACTIVOS, LOGOS_PROVEEDORES } from "@/config/logos";
import { cn } from "@/lib/cn";

/**
 * Marca de 28 px de un proveedor (banco, app, exchange) o de un activo (CEDEAR, acción, cripto).
 * Si hay logo en public/logos/ (ver scripts/logos.py), muestra el logo sobre un cuadrado blanco de radio 8;
 * si no, el monograma de dos letras. Mismo tamaño para todos.
 */
export function ProviderMark({ proveedorId, activo, sigla, tamano = 28, className }: { proveedorId?: string; activo?: string; sigla?: string; tamano?: 28 | 32 | 40; className?: string }) {
  const logo = activo && LOGOS_ACTIVOS.has(activo) ? `/logos/activos/${activo}.png` : proveedorId && LOGOS_PROVEEDORES.has(proveedorId) ? `/logos/proveedores/${proveedorId}.png` : null;
  if (logo) {
    return (
      <span aria-hidden className={cn("inline-flex shrink-0 overflow-hidden rounded-[8px] border border-border bg-white", className)} style={{ width: tamano, height: tamano }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- íconos de 64 px ya optimizados */}
        <img src={logo} alt="" width={tamano} height={tamano} loading="lazy" decoding="async" className="size-full object-contain" />
      </span>
    );
  }
  const letras = sigla ?? (proveedorId ? resolverProveedor(proveedorId).sigla : "··");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[8px] border border-border bg-surface-2 font-semibold tracking-[-0.01em] text-text-2",
        className,
      )}
      style={{ width: tamano, height: tamano, fontSize: tamano <= 28 ? 11 : tamano === 32 ? 12 : 14 }}
    >
      {letras}
    </span>
  );
}
