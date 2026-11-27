import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Bonos pasó a ser una solapa de Mercados y Metas una de Calculadoras: los links viejos siguen funcionando.
  async redirects() {
    return [
      { source: "/bonos", destination: "/mercados/bonos", permanent: true },
      { source: "/metas", destination: "/calculadoras/metas", permanent: true },
    ];
  },
  // View Transitions: desde Next 16.3 funcionan sin flag (componente <ViewTransition> de React 19.3).
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
