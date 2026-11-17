import Link from "next/link";
import { navPrincipal, navSecundaria, site } from "@/config/site";
import { Wordmark } from "./wordmark";

/** Footer con el disclaimer siempre visible. */
export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-bg-raised pb-[calc(84px+env(safe-area-inset-bottom))] lg:mt-32 lg:pb-0">
      <div className="contenedor grid gap-10 py-12 lg:grid-cols-12 lg:py-16">
        <div className="flex flex-col gap-4 lg:col-span-5">
          <Wordmark />
          <p className="max-w-sm text-chico text-text-2">
            Comparadores neutrales del dólar, las tasas y los instrumentos argentinos, con tu cartera contra la inflación. El orden de los rankings nunca depende de acuerdos comerciales.
          </p>
        </div>
        <nav aria-label="Secciones" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
          <ListaLinks titulo="Mercado" items={navPrincipal.slice(1).filter((n) => n.href !== "/metas")} />
          <ListaLinks titulo="Tus herramientas" items={[{ href: "/metas", label: "Mis metas" }, ...navSecundaria.slice(0, 3)]} />
          <ListaLinks titulo="Confianza" items={[navSecundaria[3]!, navSecundaria[4]!, { href: "/legal#afiliados", label: "Aviso de afiliados" }]} />
        </nav>
      </div>
      <div className="contenedor flex flex-col gap-3 border-t border-border py-6 text-micro lg:flex-row lg:items-start lg:justify-between">
        <p className="max-w-3xl leading-[18px]">
          {site.name} no es un asesor financiero y nada de lo que ves acá es una recomendación de inversión. Mostramos comparaciones con la cuenta a la vista, a partir de datos públicos que
          pueden tener demoras o errores. Verificá las condiciones con cada entidad antes de operar.
        </p>
        <p className="shrink-0">
          Gráficos de precio con{" "}
          <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-text-2">
            TradingView Lightweight Charts
          </a>
        </p>
      </div>
    </footer>
  );
}

function ListaLinks({ titulo, items }: { titulo: string; items: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-3 text-label">{titulo}</p>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="text-chico text-text-2 transition-colors hover:text-text">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
