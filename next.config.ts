import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 1. Oculta la cabecera X-Powered-By para no exponer información del servidor
  poweredByHeader: false,
  // 2. Desactiva por completo los Source Maps en producción para que nadie pueda ver ni reconstruir el código fuente original (.tsx/.ts)
  productionBrowserSourceMaps: false,
  // 3. Limpia logs de depuración en el bundle de producción
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  // 4. Cabeceras HTTP de seguridad para producción (Impulso GP)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
