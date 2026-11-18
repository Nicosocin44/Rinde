"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { guardarAlerta, listarAlertas } from "@/lib/alertas/almacen";
import { describir, LIMITE_GRATIS } from "@/lib/alertas/evaluar";
import { FormAviso } from "../activo/seguir";

/**
 * "Avisame" de una prima: una alerta de precio como las de cualquier activo (se ve en /alertas y respeta el límite del
 * plan gratuito). El precio que se mira es la prima de referencia: punto medio de las puntas, o el último si operó.
 */
export function AvisarPrima({ simbolo, nombre, prima }: { simbolo: string; nombre: string; prima: number | null }) {
  const toast = useToast();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  if (!prima) return null;
  return (
    <>
      <Button variante="secundario" tamano="sm" onClick={() => setAbierto(true)}>
        <Bell />
        Avisame de esta prima
      </Button>
      <Sheet abierto={abierto} onCambio={setAbierto} titulo={`Avisame de ${nombre}`} descripcion="Te avisamos dentro de Rinde cuando la prima pase el valor que elijas. Miramos el punto medio entre compra y venta.">
        {abierto && (
          <FormAviso
            ticker={simbolo}
            nombre={nombre}
            precio={prima}
            moneda="ARS"
            onListo={async (a) => {
              const activas = (await listarAlertas()).filter((x) => x.activa).length;
              if (activas >= LIMITE_GRATIS) {
                toast(`Ya tenés ${LIMITE_GRATIS} alertas activas, el máximo del plan gratuito. Pausá una para crear otra.`, { etiqueta: "Ver alertas", onClick: () => router.push("/alertas") });
                return;
              }
              await guardarAlerta(a);
              setAbierto(false);
              toast(`Listo: ${describir(a).toLowerCase()}. Te avisamos mientras tengas Rinde abierto.`, { etiqueta: "Ver alertas", onClick: () => router.push("/alertas") });
            }}
          />
        )}
      </Sheet>
    </>
  );
}
