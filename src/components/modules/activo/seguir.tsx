"use client";

import { Bell, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { SegmentedControl } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { guardarAlerta, listarAlertas } from "@/lib/alertas/almacen";
import { describir, LIMITE_GRATIS, type Alerta } from "@/lib/alertas/evaluar";
import { alCambiarFavoritos, dejarDeSeguir, listarFavoritos, seguir } from "@/lib/favoritos/almacen";
import { useMonedaVista } from "@/lib/favoritos/moneda-vista";
import { dolares, pesos } from "@/lib/format";

/**
 * "★ Seguir" (punto 18): marca el activo para verlo en Mercados, en "★ Siguiendo". Se guarda en el navegador. Antes de
 * leer el navegador el botón queda deshabilitado, para no mostrar "Seguir" a alguien que ya lo sigue.
 * Se sigue en la moneda que la persona está mirando en el gráfico ("En pesos" / "En dólares"); si la ficha no tiene
 * selector, en `moneda` (la del activo).
 */
export function SeguirActivo({ ticker, nombre, moneda }: { ticker: string; nombre: string; moneda: "ARS" | "USD" }) {
  const toast = useToast();
  const router = useRouter();
  const vista = useMonedaVista() ?? moneda;
  const [sigo, setSigo] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    const leer = () => void listarFavoritos().then((lista) => vivo && setSigo(lista.some((f) => f.ticker === ticker)));
    leer();
    const desuscribir = alCambiarFavoritos(leer);
    return () => {
      vivo = false;
      desuscribir();
    };
  }, [ticker]);

  const alternar = async () => {
    if (sigo) {
      await dejarDeSeguir(ticker);
      toast(`Dejaste de seguir ${nombre}.`);
    } else {
      await seguir({ ticker, nombre, moneda: vista });
      toast(`Seguís ${nombre} en ${vista === "USD" ? "dólares" : "pesos"}: lo ves en Mercados, en Siguiendo.`, { etiqueta: "Ver", onClick: () => router.push("/mercados") });
    }
  };

  return (
    <Button variante={sigo ? "primario" : "secundario"} tamano="sm" onClick={() => void alternar()} disabled={sigo === null} aria-pressed={sigo ?? false}>
      <Star className={sigo ? "fill-current" : undefined} />
      {sigo ? "Siguiendo" : "Seguir"}
    </Button>
  );
}

type Props = {
  ticker: string;
  nombre: string;
  /** Precio de hoy, para proponer el valor de la alerta. Bonos: US$ por 100 nominales. */
  precio: number;
  moneda: "ARS" | "USD";
};

/**
 * "Avisame": una alerta de precio del activo, que se suma a las de /alertas y respeta el límite del plan gratuito. Se
 * guarda en el navegador.
 */
export function AvisoActivo({ ticker, nombre, precio, moneda }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [aviso, setAviso] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button variante="secundario" tamano="sm" onClick={() => setAviso(true)}>
        <Bell />
        Avisame
      </Button>
      <Sheet abierto={aviso} onCambio={setAviso} titulo={`Avisame de ${nombre}`} descripcion="Te avisamos dentro de Rinde cuando el precio pase el valor que elijas.">
        {aviso && (
          <FormAviso
            ticker={ticker}
            nombre={nombre}
            precio={precio}
            moneda={moneda}
            onListo={async (a) => {
              const activas = (await listarAlertas()).filter((x) => x.activa).length;
              if (activas >= LIMITE_GRATIS) {
                toast(`Ya tenés ${LIMITE_GRATIS} alertas activas, el máximo del plan gratuito. Pausá una para crear otra.`, { etiqueta: "Ver alertas", onClick: () => router.push("/alertas") });
                return;
              }
              await guardarAlerta(a);
              setAviso(false);
              toast(`Listo: ${describir(a).toLowerCase()}. Te avisamos mientras tengas Rinde abierto.`, { etiqueta: "Ver alertas", onClick: () => router.push("/alertas") });
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

/** Formulario de una alerta de precio (lo usan las fichas y las opciones). */
export function FormAviso({ ticker, nombre, precio, moneda, onListo }: Props & { onListo: (a: Alerta) => void }) {
  const decimales = moneda === "USD" || precio < 1000 ? 2 : 0;
  const redondear = (x: number) => Number(x.toFixed(decimales));
  const [condicion, setCondicion] = useState<"menor" | "mayor">("menor");
  // Propuesta: un 5 % por debajo (o por encima) del precio de hoy.
  const [valor, setValor] = useState(() => redondear(precio * 0.95));
  const formato = (x: number) => (moneda === "USD" ? dolares(x, 2) : pesos(x, decimales));

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (valor > 0) onListo({ id: crypto.randomUUID(), tipo: "activo", ticker, nombre, moneda, condicion, valor, creada: new Date().toISOString(), activa: true });
      }}
    >
      <p className="text-chico text-text-2">
        Hoy está en <span className="tabular font-medium text-text">{formato(precio)}</span>
        {moneda === "USD" ? " por cada 100 nominales" : ""}.
      </p>
      <SegmentedControl
        etiqueta="Cuándo avisarte"
        ancho="lleno"
        valor={condicion}
        onChange={(c) => {
          setCondicion(c);
          setValor(redondear(precio * (c === "menor" ? 0.95 : 1.05)));
        }}
        opciones={[
          { valor: "menor", etiqueta: "Si baja de" },
          { valor: "mayor", etiqueta: "Si sube de" },
        ]}
      />
      <MoneyInput etiqueta={condicion === "menor" ? "Avisame si baja de" : "Avisame si sube de"} moneda={moneda === "USD" ? "US$" : "$"} valor={valor} onChange={setValor} decimales={decimales} tamano="lg" />
      <p className="text-micro text-text-3">Por ahora el aviso aparece mientras tengas Rinde abierto en alguna pestaña. Revisamos los precios cada 3 minutos.</p>
      <Button type="submit" variante="primario" disabled={!(valor > 0)}>
        Crear alerta
      </Button>
    </form>
  );
}
