import type { NextConfig } from "next";

// Note: Cloudflare D1 dev platform setup is in instrumentation.ts
// (supports async/await, runs before any routes are served)

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.vanguard.laet4x.com https://*.clerk.accounts.dev https://*.clerk.dev https://*.clerk.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://*.clerk.com https://*.clerk.dev https://petition.ph",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://api.clerk.com https://clerk.vanguard.laet4x.com https://clerk-telemetry.com https://*.clerk-telemetry.com https://*.clerk.accounts.dev https://*.clerk.dev https://*.clerk.com wss://*.clerk.accounts.dev wss://*.clerk.dev wss://*.clerk.com https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.dev https://*.clerk.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join('; ');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'petition.ph' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        ],
      },
    ];
  },
  // Prevent Turbopack/webpack from bundling native CF/wrangler packages —
  // they are Node.js-only and loaded at runtime via instrumentation.ts.
  serverExternalPackages: [
    'wrangler',
    'miniflare',
    'workerd',
  ],
};

export default nextConfig;
