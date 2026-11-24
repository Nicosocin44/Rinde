/**
 * Fotos de los inversores con nombre de persona (por slug de data/inversores/lista.json). Todas de Wikimedia Commons, con
 * licencia libre: se bajaron en chico, se recortaron en un cuadrado centrado en la cara (192 × 192, webp) y viven en
 * public/inversores. Las licencias piden nombrar al autor: los créditos salen al pie de las páginas de inversores
 * (CreditosFotos). Las de CC BY-SA quedan, recortadas, bajo la misma licencia.
 *
 * Para sumar una: que tenga licencia libre (dominio público, CC BY o CC BY-SA), recortarla igual y cargarla acá.
 * Rob Citrone y Zach Schreiber no tienen foto libre en Commons (noviembre de 2026): siguen con sus iniciales.
 */
export type FotoInversor = {
  src: string;
  /** De quién es la foto (para el crédito). */
  persona: string;
  autor: string;
  licencia: string;
  /** Texto de la licencia (no hay para dominio público). */
  licenciaUrl?: string;
  /** Página de la foto en Wikimedia Commons. */
  fuente: string;
};

const commons = (archivo: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(archivo.replaceAll(" ", "_"))}`;
const CC_BY_2 = "https://creativecommons.org/licenses/by/2.0/";

export const FOTOS_INVERSORES: Record<string, FotoInversor> = {
  buffett: {
    src: "/inversores/buffett.webp",
    persona: "Warren Buffett",
    autor: "USA International Trade Administration",
    licencia: "dominio público",
    fuente: commons("Warren Buffett at the 2015 SelectUSA Investment Summit (cropped).jpg"),
  },
  gates: {
    src: "/inversores/gates.webp",
    persona: "Bill Gates",
    autor: "Bogdan Hoyaux / Unión Europea",
    licencia: "CC BY 4.0",
    licenciaUrl: "https://creativecommons.org/licenses/by/4.0/",
    fuente: commons("Bill Gates at the European Commission - P067383-987995 (cropped) 5.jpg"),
  },
  dalio: {
    src: "/inversores/dalio.webp",
    persona: "Ray Dalio",
    autor: "Web Summit",
    licencia: "CC BY 2.0",
    licenciaUrl: CC_BY_2,
    fuente: commons("Web Summit 2018 - Forum - Day 2, November 7 HM1 7481 (44858045925).jpg"),
  },
  "cathie-wood": {
    src: "/inversores/cathie-wood.webp",
    persona: "Cathie Wood",
    autor: "Caroline Wood",
    licencia: "CC BY-SA 4.0",
    licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    fuente: commons("Cathie Wood ARK Invest Photo.jpg"),
  },
  ackman: {
    src: "/inversores/ackman.webp",
    persona: "Bill Ackman",
    autor: "Senate Democrats",
    licencia: "CC BY 2.0",
    licenciaUrl: CC_BY_2,
    fuente: commons("Valeant Pharmaceuticals' Business Model (headshot).jpg"),
  },
  marks: {
    src: "/inversores/marks.webp",
    persona: "Howard Marks",
    autor: "kellywritershouse",
    licencia: "CC BY 2.0",
    licenciaUrl: CC_BY_2,
    fuente: commons("Howard Marks 2.17.12 (cropped).jpg"),
  },
  "thiel-macro": {
    src: "/inversores/thiel-macro.webp",
    persona: "Peter Thiel",
    autor: "Gage Skidmore",
    licencia: "CC BY-SA 3.0",
    licenciaUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    fuente: commons("Peter Thiel by Gage Skidmore.jpg"),
  },
};

/**
 * Logos de los fondos que no tienen una persona con foto: el de su propia web, recortado en un cuadrado de 192 × 192
 * (webp) con margen para que entre en el círculo, en public/inversores. Se usan solo para identificar al fondo, como
 * los logos de bancos y empresas del resto del sitio.
 *
 * Sin logo (noviembre de 2026): Aquamarine Financial, VR Advisory, Ping Capital, MAK Capital One, PointState,
 * Discovery Capital y Route One. No tienen web propia (o el dominio está estacionado), y Zach Schreiber y Rob Citrone
 * no tienen foto libre: siguen con sus iniciales.
 */
export type LogoInversor = { src: string; /** Web de donde salió el logo. */ fuente: string };

export const LOGOS_INVERSORES: Record<string, LogoInversor> = {
  "north-of-south": { src: "/inversores/north-of-south.webp", fuente: "https://www.northofsouth.com" },
  fundamenta: { src: "/inversores/fundamenta.webp", fuente: "https://fundamentacapital.com" },
  helikon: { src: "/inversores/helikon.webp", fuente: "https://www.helikoninvestments.com" },
  "westwood-global": { src: "/inversores/westwood-global.webp", fuente: "https://westwoodglobal.com" },
  "abu-dhabi-investment-council": { src: "/inversores/abu-dhabi-investment-council.webp", fuente: "https://www.adic.ae" },
  // RWC Asset Management hoy se llama Redwheel.
  "rwc-asset-management": { src: "/inversores/rwc-asset-management.webp", fuente: "https://www.redwheel.com" },
  gemsstock: { src: "/inversores/gemsstock.webp", fuente: "https://www.gemsstock.com" },
  "cape-ann-asset-management": { src: "/inversores/cape-ann-asset-management.webp", fuente: "https://capeannam.com" },
  "sagil-capital": { src: "/inversores/sagil-capital.webp", fuente: "https://www.sagilcap.com" },
  "equinox-partners-investment-management": { src: "/inversores/equinox-partners-investment-management.webp", fuente: "https://equinoxpartners.com" },
};
