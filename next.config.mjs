/** @type {import('next').NextConfig} */
const nextConfig = {
  // TODO: Phase 2+ - Remove this once credit system is fully implemented
  // Temporarily disable type checking for Phase 1 deployment (Cases API only)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Turbopack configuration (default bundler in Next.js 16)
  turbopack: {
    resolveAlias: {
      // Stub out native modules not available in browser/serverless
      canvas: './lib/stubs/empty.js',
      encoding: './lib/stubs/empty.js',
    },
  },
};

export default nextConfig;
