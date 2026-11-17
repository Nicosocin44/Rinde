import { ExternalLink } from "lucide-react";
import { partnerActivo } from "@/lib/partners";
import { estiloBoton } from "./button";

/**
 * "Abrir cuenta en X" + "Enlace de afiliado". Nunca dentro de la celda del ranking: va en el detalle del proveedor.
 * Si no hay acuerdo activo con el proveedor, no se muestra nada.
 */
export function PartnerCTA({ proveedorId, nombre }: { proveedorId: string; nombre: string }) {
  const partner = partnerActivo(proveedorId);
  if (!partner) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <a href={partner.urlReferido} target="_blank" rel="sponsored noopener noreferrer" className={estiloBoton("secundario", "lg", "w-full")}>
        Abrir cuenta en {nombre}
        <ExternalLink />
      </a>
      <p className="text-center text-micro">Enlace de afiliado: si abrís una cuenta, podemos recibir una comisión. No cambia el orden del ranking.</p>
    </div>
  );
}
