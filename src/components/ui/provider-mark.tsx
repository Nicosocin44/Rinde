import { resolverProveedor } from "@data/ar/proveedores";
import { cn } from "@/lib/cn";

/**
 * Monograma de 28 px: cuadrado de radio 8, fondo neutro y dos letras en peso 600. Mismo tamaño para todos.
 * Los logos reales llegan después, con permiso y normalizados.
 */
export function ProviderMark({ proveedorId, sigla, tamano = 28, className }: { proveedorId?: string; sigla?: string; tamano?: 28 | 32 | 40; className?: string }) {
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
