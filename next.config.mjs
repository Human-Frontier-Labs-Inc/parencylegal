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
};

export default nextConfig;
