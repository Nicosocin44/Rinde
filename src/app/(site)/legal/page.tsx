import type { Metadata } from "next";
import { Documento, type Seccion } from "@/components/modules/contenido/documento";
import { PageHeader } from "@/components/shell/page-header";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Legal: términos, privacidad y aviso de afiliados" };

const secciones: Seccion[] = [
  {
    id: "borrador",
    titulo: "Antes de leer",
    contenido: <p>Este texto es un borrador de trabajo. Tiene que revisarlo un abogado antes del lanzamiento público (ver PRODUCTO.md §12).</p>,
  },
  {
    id: "asesoramiento",
    titulo: "No es asesoramiento financiero",
    contenido: (
      <>
        <p>
          {site.name} muestra información pública y comparaciones con la cuenta a la vista. <strong>No es un asesor financiero</strong> ni está registrado como tal ante la CNV, y nada de lo que publica es una recomendación de
          compra, venta o inversión.
        </p>
        <p>Las “ideas” de tu cartera son comparaciones genéricas a partir de datos de mercado: cada persona tiene objetivos, plazos y tolerancia al riesgo distintos. Antes de invertir, informate y consultá a un profesional.</p>
      </>
    ),
  },
  {
    id: "datos",
    titulo: "Sobre los datos",
    contenido: (
      <p>
        Los datos vienen de fuentes públicas y de terceros (ver Metodología) y pueden tener demoras, errores u omisiones. Validamos cada dato antes de mostrarlo, pero no garantizamos su exactitud. Verificá las condiciones con cada
        entidad antes de operar. Los rendimientos pasados no garantizan rendimientos futuros.
      </p>
    ),
  },
  {
    id: "afiliados",
    titulo: "Aviso de afiliados",
    contenido: (
      <>
        <p>
          En el futuro, {site.name} puede recibir una comisión cuando abrís una cuenta en un banco, billetera, broker o exchange a través de un enlace. Esos enlaces van siempre rotulados como <strong>“Enlace de afiliado”</strong> y
          solo aparecen en el detalle de cada proveedor.
        </p>
        <p>
          <strong>Los acuerdos comerciales nunca cambian el orden de los rankings</strong>: se ordenan solo por métricas objetivas, y el código que ordena no tiene acceso al registro de acuerdos. Hoy no hay ningún acuerdo activo.
        </p>
      </>
    ),
  },
  {
    id: "privacidad",
    titulo: "Privacidad",
    contenido: (
      <>
        <p>
          <strong>Sin cuenta, tu cartera, tus metas y tus alertas se guardan solo en tu navegador</strong> (IndexedDB). No las enviamos a ningún servidor. Para valuar tu cartera pedimos al servidor solo los precios de los
          instrumentos (por ejemplo, “AAPL”), nunca las cantidades ni los montos. Si borrás los datos del navegador, se borran: exportalas antes.
        </p>
        <p>
          <strong>Si entrás con tu mail (es opcional),</strong> guardamos tu mail y tu cartera para que la veas desde cualquier dispositivo. Se guardan en Supabase, nuestro proveedor de base de datos, en servidores de San Pablo
          (Brasil). Cada cuenta ve solo su cartera: lo controla la base de datos, no solo la web. No la compartimos con nadie, no la vendemos y no la usamos para otra cosa.
        </p>
        <p>Podés pedirnos ver, corregir o borrar tus datos cuando quieras, según la Ley 25.326 de Protección de Datos Personales.</p>
      </>
    ),
  },
  {
    id: "terminos",
    titulo: "Términos de uso",
    contenido: <p>Podés usar el sitio para fines personales. No está permitido extraer datos de forma automatizada ni presentar la información como propia. Las marcas mencionadas pertenecen a sus dueños; usamos monogramas propios.</p>,
  },
];

export default function Legal() {
  return (
    <>
      <PageHeader titulo="Legal" bajada="Lo que tenés que saber antes de usar el sitio, en castellano." />
      <Documento secciones={secciones} />
    </>
  );
}
