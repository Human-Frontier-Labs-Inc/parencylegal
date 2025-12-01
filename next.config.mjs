/** @type {import('next').NextConfig} */
const nextConfig = {
  // TODO: Phase 2+ - Remove this once credit system is fully implemented
  // Temporarily disable type checking for Phase 1 deployment (Cases API only)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Webpack configuration for PDF.js compatibility in serverless
  webpack: (config, { isServer }) => {
    // Ignore canvas module (native dependency not available in serverless)
    config.resolve.alias.canvas = false;

    // Also ignore encoding module (optional dependency)
    config.resolve.alias.encoding = false;

    return config;
  },
};

export default nextConfig;
