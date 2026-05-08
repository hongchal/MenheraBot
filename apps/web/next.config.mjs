/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output bundles only what's needed into .next/standalone for
  // a slim production image. See apps/web/Dockerfile for the runtime stage.
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
