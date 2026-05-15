import type { NextConfig } from "next";

// Note: Cloudflare D1 dev platform setup is in instrumentation.ts
// (supports async/await, runs before any routes are served)

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'petition.ph' },
    ],
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
