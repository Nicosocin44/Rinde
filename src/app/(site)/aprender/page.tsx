import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Aprender: glosario financiero en criollo", description: "Qué es la TNA, la TEA, una LECAP, el MEP, la TIR o la duration, explicado en una línea." };

const TERMINOS: { t: string; corto: string; largo: string; ver?: { href: string; etiqueta: string } }[] = [
  { t: "TNA", corto: "Tasa nominal anual.", largo: "La que publican los bancos. No incluye la reinversión de intereses, así que sirve para calcular, no para comparar.", ver: { href: "/calculadoras/tasas", etiqueta: "Conversor de tasas" } },
  { t: "TEA", corto: "Tasa efectiva anual.", largo: "Lo que rinde tu plata en un año si reinvertís los intereses. Es la forma justa de comparar opciones distintas.", ver: { href: "/pesos", etiqueta: "Comparador en TEA" } },
  { t: "TEM", corto: "Tasa efectiva mensual.", largo: "Lo que rinde en un mes. Las letras del Tesoro se suelen licitar por TEM." },
  { t: "Plazo fijo", corto: "Prestás pesos a un banco por un plazo fijo.", largo: "Cobrás intereses al vencimiento. Garantizado por SEDESA hasta un tope. No podés sacar la plata antes (salvo el precancelable).", ver: { href: "/pesos/plazo-fijo", etiqueta: "Tasas por banco" } },
  { t: "Cuenta remunerada", corto: "Una cuenta que paga intereses todos los días.", largo: "La plata está disponible siempre. Muchas tienen un tope: arriba de cierto monto, el resto no rinde.", ver: { href: "/pesos/billeteras", etiqueta: "Billeteras y cuentas" } },
  { t: "Fondo money market", corto: "Un fondo que invierte en cosas muy líquidas y de bajo riesgo.", largo: "Es lo que usan Mercado Pago o Ualá para que la plata rinda. No tiene tasa fija: rinde lo que rinden sus inversiones.", ver: { href: "/pesos/fci", etiqueta: "Fondos" } },
  { t: "Cuotaparte", corto: "Una “porción” de un fondo.", largo: "Su valor sube (o baja) todos los días. De su variación sale lo que rindió el fondo." },
  { t: "Caución", corto: "Un préstamo de corto plazo garantizado por el mercado.", largo: "Prestás pesos a otro inversor por días, desde un broker. El mercado garantiza que te devuelvan la plata.", ver: { href: "/pesos/caucion", etiqueta: "Tasas de caución" } },
  { t: "LECAP", corto: "Letra del Tesoro a tasa fija, en pesos.", largo: "Comprás hoy a un precio y al vencimiento cobrás un valor fijo. Sabés de antemano cuánto ganás si la tenés hasta el final.", ver: { href: "/pesos/lecaps", etiqueta: "Curva de LECAPs" } },
  { t: "BONCAP", corto: "Como una LECAP, pero de plazo más largo.", largo: "Bono capitalizable del Tesoro: misma lógica, vencimientos de más de un año desde su emisión." },
  { t: "CER", corto: "Coeficiente que sigue a la inflación.", largo: "Los bonos CER ajustan su capital por inflación: te protegen si los precios suben más de lo esperado." },
  { t: "Inflación breakeven", corto: "La inflación que el mercado descuenta.", largo: "Si la inflación termina por encima, convenía un bono CER; si termina por debajo, convenía uno a tasa fija." },
  { t: "MEP", corto: "Dólar bolsa: comprás un bono en pesos y lo vendés en dólares.", largo: "Es legal, se hace desde un broker y los dólares quedan en tu cuenta en Argentina.", ver: { href: "/dolar", etiqueta: "Dólar hoy" } },
  { t: "CCL", corto: "Contado con liquidación.", largo: "Como el MEP, pero los dólares terminan en una cuenta en el exterior. Suele ser un poco más caro." },
  { t: "Brecha", corto: "Cuánto más caro está un dólar que el oficial.", largo: "Brecha = dólar ÷ oficial − 1. Si es chica, comprar en el banco o en el broker cuesta parecido.", ver: { href: "/dolar/historico", etiqueta: "Histórico de la brecha" } },
  { t: "Spread", corto: "La diferencia entre el precio de compra y el de venta.", largo: "Es lo que perdés si comprás y vendés en el mismo momento. Cuanto más bajo, mejor.", ver: { href: "/dolar/comprar", etiqueta: "Dónde comprar dólares" } },
  { t: "TIR", corto: "Tasa interna de retorno.", largo: "Lo que rinde por año un bono si lo tenés hasta el final y cobrás todos los pagos a tiempo.", ver: { href: "/bonos", etiqueta: "Bonos" } },
  { t: "Duration", corto: "En cuántos años, en promedio, recuperás lo que pusiste.", largo: "También mide cuánto se mueve el precio si cambian las tasas: a más duration, más sensible." },
  { t: "Paridad", corto: "Precio del bono contra lo que “vale” según su contrato.", largo: "Paridad = precio ÷ valor técnico. Debajo de 100 % cotiza con descuento." },
  { t: "Riesgo país", corto: "Lo que paga Argentina por encima de EE.UU. para endeudarse.", largo: "Se mide en puntos básicos: 855 puntos son 8,55 % por año más que un bono del Tesoro estadounidense." },
  { t: "CEDEAR", corto: "Un certificado para invertir en empresas del exterior desde Argentina.", largo: "Comprás en pesos o dólares, y sigue el precio de la acción de afuera (y del dólar implícito).", ver: { href: "/mercados", etiqueta: "CEDEARs" } },
  { t: "ON", corto: "Obligación negociable: deuda de una empresa.", largo: "Le prestás a una empresa (YPF, Pampa…) y te paga intereses, casi siempre en dólares." },
  { t: "TWR", corto: "Rendimiento ponderado por tiempo.", largo: "Mide cómo le fue a tu cartera sin el efecto de cuándo pusiste o sacaste plata. Sirve para compararte con un índice." },
  { t: "XIRR", corto: "La tasa de retorno de tu plata.", largo: "Tiene en cuenta cuánto y cuándo pusiste. Es el rendimiento anual real de tus aportes." },
  { t: "REM", corto: "Relevamiento de Expectativas de Mercado del BCRA.", largo: "Una encuesta mensual a economistas sobre inflación, dólar y tasas. Usamos la mediana." },
];

export default function Aprender() {
  return (
    <>
      <PageHeader titulo="Aprender" bajada="Los términos que vas a ver en el sitio, explicados en una línea. Sin jerga." />
      <dl className="mt-10 grid border-t border-border lg:mt-14 lg:grid-cols-2 lg:gap-x-16">
        {TERMINOS.map((x) => (
          <div key={x.t} id={x.t.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-[120px] border-b border-border py-6">
            <dt className="text-h3">{x.t}</dt>
            <dd className="mt-2 text-[16px] leading-[25px]">
              <span className="font-medium">{x.corto}</span> <span className="text-text-2">{x.largo}</span>
              {x.ver && (
                <Link href={x.ver.href} className="mt-2 block text-chico font-medium text-accent hover:underline">
                  {x.ver.etiqueta} →
                </Link>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
