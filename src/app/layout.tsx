import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { RegistroSW } from "@/components/shell/registro-sw";
import { site } from "@/config/site";
import { SCRIPT_PREFERENCIAS } from "@/lib/preferencias";
import "./globals.css";

// Bricolage Grotesque: titulares y cifras (pesada, con carácter, cifras tabulares).
// Instrument Sans: texto e interfaz. "optional" en el texto evita un segundo pintado que retrase el LCP.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "optional" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} · El dólar, las tasas y tu plata, claros`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: "website", locale: "es_AR", siteName: site.name },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
    { media: "(prefers-color-scheme: light)", color: "#f7f7f4" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" data-theme="dark" data-modo="simple" className={`${bricolage.variable} ${instrument.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Aplica tema y modo antes del primer pintado: sin parpadeo. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_PREFERENCIAS }} />
      </head>
      <body className="min-h-dvh">
        <MotionProvider>{children}</MotionProvider>
        <RegistroSW />
      </body>
    </html>
  );
}
