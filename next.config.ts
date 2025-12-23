import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Server actions configuration for Netlify
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Ensure proper output for Netlify
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/@prisma/client/**/*', './node_modules/.prisma/client/**/*'],
  },
};

export default nextConfig;
