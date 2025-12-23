import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Server actions configuration for Netlify
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
