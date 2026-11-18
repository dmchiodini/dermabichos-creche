import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy.
 * - 'unsafe-inline' em scripts é necessário para a hidratação do Next sem nonce.
 * - Imagens: fotos do Supabase Storage, data-URLs (modo demonstração) e URLs https
 *   cadastradas para foto de perfil dos pets.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https:${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // Fotos são comprimidas no navegador (~200–400 KB cada); um registro do dia
      // pode carregar até 10 delas de uma vez.
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Áreas restritas e portal nunca devem ir para cache compartilhado nem indexação.
      {
        source: "/(admin|monitora|portal)/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  async redirects() {
    // Rotas antigas que duplicavam as páginas administrativas sem proteção.
    return [
      // O endereço principal é o que se compartilha com os responsáveis: vai direto ao
      // login do portal. A equipe entra por /equipe.
      { source: "/", destination: "/portal", permanent: false },
      { source: "/admin", destination: "/admin/dashboard", permanent: false },
      { source: "/rotina", destination: "/monitora", permanent: true },
      { source: "/dashboard", destination: "/admin/dashboard", permanent: true },
      { source: "/pets", destination: "/admin/pets", permanent: true },
      { source: "/responsaveis", destination: "/admin/responsaveis", permanent: true },
      { source: "/funcionarios", destination: "/admin/funcionarios", permanent: true },
      { source: "/historico", destination: "/admin/historico", permanent: true },
    ];
  },
};

export default nextConfig;
