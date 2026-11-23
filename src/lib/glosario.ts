/**
 * El glosario del sitio (punto 24): lo usan /aprender y los cuadros que se abren al tocar (o pasar el mouse por) un
 * concepto en cualquier pantalla. Una sola fuente, así la explicación es la misma en todos lados.
 *
 * `etiquetas`: los textos exactos con los que el concepto aparece en las pantallas ("Volatilidad anual", "Máxima caída
 * (1 año)"…). Si una etiqueta coincide, se le pone la explicación sola (ver `terminoDeEtiqueta`).
 */
export type Termino = {
  /** Ancla en /aprender (#per). */
  id: string;
  t: string;
  corto: string;
  largo: string;
  ver?: { href: string; etiqueta: string };
  etiquetas?: string[];
};

export const GLOSARIO: Termino[] = [
  // ───── Pesos ─────
  { id: "tna", t: "TNA", corto: "Tasa nominal anual.", largo: "La que publican los bancos. No incluye la reinversión de intereses, así que sirve para calcular, no para comparar.", ver: { href: "/calculadoras/tasas", etiqueta: "Conversor de tasas" } },
  { id: "tea", t: "TEA", corto: "Tasa efectiva anual.", largo: "Lo que rinde tu plata en un año si reinvertís los intereses. Es la forma justa de comparar opciones distintas.", ver: { href: "/pesos", etiqueta: "Comparador en TEA" } },
  { id: "tem", t: "TEM", corto: "Tasa efectiva mensual.", largo: "Lo que rinde en un mes. Las letras del Tesoro se suelen licitar por TEM." },
  { id: "plazo-fijo", t: "Plazo fijo", corto: "Prestás pesos a un banco por un plazo fijo.", largo: "Cobrás intereses al vencimiento. Garantizado por SEDESA hasta un tope. No podés sacar la plata antes (salvo el precancelable).", ver: { href: "/pesos/plazo-fijo", etiqueta: "Tasas por banco" } },
  { id: "cuenta-remunerada", t: "Cuenta remunerada", corto: "Una cuenta que paga intereses todos los días.", largo: "La plata está disponible siempre. Muchas tienen un tope: arriba de cierto monto, el resto no rinde.", ver: { href: "/pesos/billeteras", etiqueta: "Billeteras y cuentas" } },
  { id: "fondo-money-market", t: "Fondo money market", corto: "Un fondo que invierte en cosas muy líquidas y de bajo riesgo.", largo: "Es lo que usan Mercado Pago o Ualá para que la plata rinda. No tiene tasa fija: rinde lo que rinden sus inversiones.", ver: { href: "/pesos/fci", etiqueta: "Fondos" } },
  { id: "cuotaparte", t: "Cuotaparte", corto: "Una “porción” de un fondo.", largo: "Su valor sube (o baja) todos los días. De su variación sale lo que rindió el fondo." },
  { id: "caución", t: "Caución", corto: "Un préstamo de corto plazo garantizado por el mercado.", largo: "Prestás pesos a otro inversor por días, desde un broker. El mercado garantiza que te devuelvan la plata.", ver: { href: "/pesos/caucion", etiqueta: "Tasas de caución" } },
  { id: "lecap", t: "LECAP", corto: "Letra del Tesoro a tasa fija, en pesos.", largo: "Comprás hoy a un precio y al vencimiento cobrás un valor fijo. Sabés de antemano cuánto ganás si la tenés hasta el final.", ver: { href: "/pesos/lecaps", etiqueta: "Curva de LECAPs" } },
  { id: "boncap", t: "BONCAP", corto: "Como una LECAP, pero de plazo más largo.", largo: "Bono capitalizable del Tesoro: misma lógica, vencimientos de más de un año desde su emisión." },
  { id: "cer", t: "CER", corto: "Coeficiente que sigue a la inflación.", largo: "Los bonos CER ajustan su capital por inflación: te protegen si los precios suben más de lo esperado." },
  { id: "inflación-breakeven", t: "Inflación breakeven", corto: "La inflación que el mercado descuenta.", largo: "Si la inflación termina por encima, convenía un bono CER; si termina por debajo, convenía uno a tasa fija." },

  // ───── Dólar ─────
  { id: "mep", t: "MEP", corto: "Dólar bolsa: comprás un bono en pesos y lo vendés en dólares.", largo: "Es legal, se hace desde un broker y los dólares quedan en tu cuenta en Argentina.", ver: { href: "/dolar", etiqueta: "Dólar hoy" } },
  { id: "ccl", t: "CCL", corto: "Contado con liquidación.", largo: "Como el MEP, pero los dólares terminan en una cuenta en el exterior. Suele ser un poco más caro." },
  { id: "brecha", t: "Brecha", corto: "Cuánto más caro está un dólar que el oficial.", largo: "Brecha = dólar ÷ oficial − 1. Si es chica, comprar en el banco o en el broker cuesta parecido.", ver: { href: "/dolar/historico", etiqueta: "Histórico de la brecha" } },
  { id: "spread", t: "Spread", corto: "La diferencia entre el precio de compra y el de venta.", largo: "Es lo que perdés si comprás y vendés en el mismo momento. Cuanto más bajo, mejor.", ver: { href: "/dolar/comprar", etiqueta: "Dónde comprar dólares" } },

  // ───── Bonos ─────
  { id: "tir", t: "TIR", corto: "Tasa interna de retorno.", largo: "Lo que rinde por año un bono si lo tenés hasta el final y cobrás todos los pagos a tiempo.", ver: { href: "/mercados/bonos", etiqueta: "Bonos" } },
  { id: "duration", t: "Duration", corto: "En cuántos años, en promedio, recuperás lo que pusiste.", largo: "También mide cuánto se mueve el precio si cambian las tasas: a más duration, más sensible." },
  { id: "paridad", t: "Paridad", corto: "Precio del bono contra lo que “vale” según su contrato.", largo: "Paridad = precio ÷ valor técnico. Debajo de 100 % cotiza con descuento." },
  { id: "valor-técnico", t: "Valor técnico", corto: "Lo que vale el bono hoy según su contrato.", largo: "El capital que falta devolver más los intereses que se fueron acumulando desde el último pago. La paridad compara el precio contra este valor." },
  { id: "cupón", t: "Cupón", corto: "El interés que paga un bono.", largo: "Es una tasa anual sobre el capital que falta devolver. Los Bonares y Globales pagan dos veces por año, en enero y en julio.", etiquetas: ["Cupón de hoy"] },
  { id: "rendimiento-corriente", t: "Rendimiento corriente", corto: "Los intereses de un año sobre el precio del bono.", largo: "Cupones de un año ÷ precio. No cuenta la devolución del capital: para eso está la TIR." },
  { id: "valor-residual", t: "Valor residual", corto: "Cuánto del capital original del bono falta devolver.", largo: "Si el bono ya pagó parte del capital, baja: 64 % quiere decir que ya devolvió 36 de cada 100 originales.", etiquetas: ["Capital que queda"] },
  { id: "riesgo-país", t: "Riesgo país", corto: "Lo que paga Argentina por encima de EE.UU. para endeudarse.", largo: "Se mide en puntos básicos: 855 puntos son 8,55 % por año más que un bono del Tesoro estadounidense." },
  { id: "on", t: "ON", corto: "Obligación negociable: deuda de una empresa.", largo: "Le prestás a una empresa (YPF, Pampa…) y te paga intereses, casi siempre en dólares." },

  // ───── Acciones y CEDEARs ─────
  { id: "cedear", t: "CEDEAR", corto: "Un certificado para invertir en empresas del exterior desde Argentina.", largo: "Comprás en pesos o dólares, y sigue el precio de la acción de afuera (y del dólar implícito).", ver: { href: "/mercados", etiqueta: "CEDEARs" } },
  { id: "ratio", t: "Ratio", corto: "Cuántos CEDEARs equivalen a una acción del exterior.", largo: "Con un ratio de 20 hacen falta 20 CEDEARs para tener una acción entera. Por eso un CEDEAR cuesta mucho menos que la acción.", etiquetas: ["Ratio (aproximado)"] },
  { id: "dólar-implícito", t: "Dólar implícito", corto: "El dólar que surge del precio de los CEDEARs.", largo: "Precio del CEDEAR en pesos × ratio ÷ precio de la acción en dólares. Si está debajo del MEP, comprar CEDEARs en pesos sale más barato que pasar a dólares primero.", etiquetas: ["Dólar implícito (MEP)", "Dólar implícito (CCL)"] },
  { id: "puntas", t: "Puntas", corto: "El mejor precio de compra y de venta que hay ahora.", largo: "La punta compradora es lo máximo que alguien ofrece pagar; la vendedora, lo mínimo por lo que alguien vende. La diferencia es el spread.", etiquetas: ["Puntas: compra / venta"] },
  { id: "volatilidad", t: "Volatilidad", corto: "Cuánto se mueve el precio.", largo: "El desvío de las variaciones diarias, llevado a un año. Más volatilidad quiere decir subas y bajas más grandes, para los dos lados.", etiquetas: ["Volatilidad anual", "Volatilidad anual (en EE.UU.)", "Volatilidad (1 año)"] },
  { id: "máxima-caída", t: "Máxima caída", corto: "La peor baja desde un máximo.", largo: "Cuánto perdió quien compró en el punto más alto del período y vendió en el más bajo que vino después.", etiquetas: ["Máxima caída (1 año)", "Máxima caída en 1 año (en EE.UU.)"] },
  { id: "capitalización", t: "Capitalización", corto: "Lo que vale la empresa en la bolsa.", largo: "Precio de la acción × cantidad de acciones. Es lo que costaría comprar la empresa entera al precio de hoy." },
  { id: "valor-de-empresa", t: "Valor de empresa", corto: "La capitalización más la deuda neta.", largo: "Lo que costaría comprar la empresa entera haciéndose cargo de su deuda y quedándose con su caja. Sirve para comparar empresas con distinta deuda." },

  // ───── Balances ─────
  { id: "per", t: "PER", corto: "Precio sobre ganancia.", largo: "Cuántos años de ganancias estás pagando con el precio de hoy: precio de la acción ÷ ganancia por acción de los últimos 12 meses. Más bajo suele querer decir más barata, pero conviene ver por qué.", etiquetas: ["PER (precio / ganancia)"] },
  { id: "ebitda", t: "EBITDA", corto: "La ganancia del negocio antes de intereses, impuestos y amortizaciones.", largo: "Muestra cuánta plata genera la operación en sí, sin importar cómo se financia la empresa. Sirve para comparar empresas del mismo sector." },
  { id: "precio-ventas", t: "Precio / ventas", corto: "Lo que vale la empresa en la bolsa sobre lo que vende en un año.", largo: "Capitalización ÷ ventas de los últimos 12 meses. Sirve cuando la empresa todavía no gana plata y el PER no se puede calcular." },
  { id: "precio-valor-libro", t: "Precio / valor libro", corto: "Lo que vale en la bolsa sobre su patrimonio contable.", largo: "Capitalización ÷ patrimonio. Debajo de 1, la acción cotiza por menos de lo que dicen sus balances." },
  { id: "valor-de-empresa-ebitda", t: "Valor de empresa / EBITDA", corto: "Cuántos años de EBITDA vale la empresa, contando su deuda.", largo: "Valor de empresa ÷ EBITDA de los últimos 12 meses. Como el PER, pero sin que lo cambien la deuda ni los impuestos. Más bajo suele querer decir más barata." },
  { id: "rendimiento-del-dividendo", t: "Rendimiento del dividendo", corto: "Los dividendos de un año sobre el precio de la acción.", largo: "Si una acción vale $ 100 y pagó $ 3 de dividendos en el último año, rinde 3 % por dividendo.", etiquetas: ["Dividendo"] },
  { id: "rendimiento-del-flujo-libre", t: "Rendimiento del flujo libre", corto: "La plata que genera el negocio en un año sobre lo que vale en la bolsa.", largo: "Flujo de fondos libre ÷ capitalización. El flujo libre es lo que queda después de pagar las inversiones que necesita la empresa para seguir funcionando." },
  { id: "payout", t: "Payout", corto: "Qué parte de la ganancia se reparte como dividendo.", largo: "Dividendos ÷ ganancia neta. Un payout de 40 % quiere decir que reparte $ 40 de cada $ 100 que gana y reinvierte el resto." },
  { id: "roe", t: "ROE", corto: "Rentabilidad sobre el patrimonio.", largo: "Cuánto gana la empresa por cada peso que pusieron los accionistas: ganancia ÷ patrimonio. Un ROE de 15 % son $ 15 de ganancia por cada $ 100 de patrimonio.", etiquetas: ["Rentabilidad sobre el patrimonio", "Rentabilidad sobre el patrimonio (ROE)", "Rentabilidad (ROE)"] },
  { id: "roa", t: "ROA", corto: "Rentabilidad sobre los activos.", largo: "Cuánto gana la empresa por cada peso de activos, todo lo que tiene: ganancia ÷ activos. Muestra qué tan bien usa lo que tiene.", etiquetas: ["Rentabilidad sobre los activos (ROA)"] },
  { id: "margen-bruto", t: "Margen bruto", corto: "Lo que queda de cada venta después del costo de lo vendido.", largo: "(Ventas − costo de lo vendido) ÷ ventas. Todavía no descuenta los gastos de administración y comercialización, ni intereses ni impuestos." },
  { id: "margen-operativo", t: "Margen operativo", corto: "Lo que deja el negocio antes de intereses e impuestos.", largo: "Resultado operativo ÷ ventas. Ya descuenta todos los gastos de funcionar, pero no cómo se financia la empresa." },
  { id: "margen-ebitda", t: "Margen EBITDA", corto: "El EBITDA como porcentaje de las ventas.", largo: "EBITDA ÷ ventas. Permite comparar la rentabilidad de la operación entre empresas de distinto tamaño." },
  { id: "margen-neto", t: "Margen neto", corto: "Lo que queda de ganancia de cada venta.", largo: "Ganancia neta ÷ ventas. Un margen neto de 10 % son $ 10 de ganancia por cada $ 100 que vende la empresa." },
  { id: "deuda-neta", t: "Deuda neta", corto: "La deuda menos la caja.", largo: "Lo que debe la empresa menos la plata que tiene en caja e inversiones de corto plazo. Si da negativa, tiene más caja que deuda." },
  { id: "deuda-neta-ebitda", t: "Deuda neta / EBITDA", corto: "Cuántos años de EBITDA harían falta para pagar la deuda.", largo: "Mide qué tan endeudada está la empresa: cuanto más alto, más pesa la deuda. Lo razonable depende del sector." },
  { id: "deuda-patrimonio", t: "Deuda / patrimonio", corto: "La deuda financiera sobre el patrimonio.", largo: "Cuánta deuda (préstamos, bonos, ON) tiene la empresa por cada peso que pusieron los accionistas." },
  { id: "pasivos-patrimonio", t: "Pasivos / patrimonio", corto: "Todo lo que debe la empresa sobre su patrimonio.", largo: "Pasivos ÷ patrimonio. Más alto quiere decir que se financia más con plata de terceros que con la de sus accionistas. En los bancos es normal que sea alto: los depósitos son pasivos." },
  { id: "liquidez-corriente", t: "Liquidez corriente", corto: "Activos corrientes sobre pasivos corrientes.", largo: "Si da más de 1, lo que la empresa tiene o va a cobrar en el próximo año alcanza para pagar lo que vence en ese plazo." },
  { id: "prueba-ácida", t: "Prueba ácida", corto: "La liquidez corriente sin contar el stock.", largo: "Una medida más exigente: muestra si la empresa puede pagar lo que vence pronto sin tener que vender su mercadería." },
  { id: "cobertura-de-intereses", t: "Cobertura de intereses", corto: "Cuántas veces el resultado operativo cubre los intereses.", largo: "Resultado operativo ÷ intereses de la deuda. Debajo de 1, lo que gana el negocio no alcanza para pagar los intereses." },

  // ───── Opciones ─────
  { id: "base", t: "Base", corto: "El precio de ejercicio de la opción.", largo: "El precio al que un call te deja comprar la acción (o un put te deja venderla) hasta el vencimiento." },
  { id: "delta", t: "Delta", corto: "Cuánto se mueve la prima si la acción sube $ 1.", largo: "Va de 0 a 1 en los calls y de −1 a 0 en los puts. Una delta de 0,5 quiere decir que la prima sube unos $ 0,50 si la acción sube $ 1." },
  { id: "volatilidad-implícita", t: "Volatilidad implícita", corto: "La volatilidad que el mercado le pone a la acción a través del precio de las opciones.", largo: "Se calcula al revés, a partir de la prima. Más alta quiere decir opciones más caras: el mercado espera movimientos más grandes.", etiquetas: ["VI"] },

  // ───── Tu cartera ─────
  { id: "twr", t: "TWR", corto: "Rendimiento ponderado por tiempo.", largo: "Mide cómo le fue a tu cartera sin el efecto de cuándo pusiste o sacaste plata. Sirve para compararte con un índice." },
  { id: "xirr", t: "XIRR", corto: "La tasa de retorno de tu plata.", largo: "Tiene en cuenta cuánto y cuándo pusiste. Es el rendimiento anual real de tus aportes." },
  { id: "rem", t: "REM", corto: "Relevamiento de Expectativas de Mercado del BCRA.", largo: "Una encuesta mensual a economistas sobre inflación, dólar y tasas. Usamos la mediana." },
];

const normalizar = (s: string) => s.trim().toLowerCase();
const PorEtiqueta = new Map(GLOSARIO.flatMap((x) => [x.t, ...(x.etiquetas ?? [])].map((e) => [normalizar(e), x] as const)));

/** El término que corresponde a un texto tal como aparece en pantalla ("Volatilidad anual" → Volatilidad), si hay. */
export function terminoDeEtiqueta(etiqueta: string): Termino | undefined {
  return PorEtiqueta.get(normalizar(etiqueta));
}

export function terminoPorId(id: string): Termino | undefined {
  return GLOSARIO.find((x) => x.id === id);
}
