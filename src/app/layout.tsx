import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import localFont from "next/font/local";
import { RegistroSW } from "@/components/shell/registro-sw";
import { site } from "@/config/site";
import { SCRIPT_PREFERENCIAS } from "@/lib/preferencias";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", axes: ["opsz"], display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap", preload: false });
const satoshi = localFont({ src: "../fonts/Satoshi-Variable.woff2", variable: "--font-satoshi", weight: "300 900", display: "swap" });

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
    <html lang="es-AR" data-theme="dark" data-modo="simple" className={`${inter.variable} ${geistMono.variable} ${satoshi.variable}`} suppressHydrationWarning>
      <head>
        {/* Aplica tema y modo antes del primer pintado: sin parpadeo. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_PREFERENCIAS }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <RegistroSW />
      </body>
    </html>
  );
}
