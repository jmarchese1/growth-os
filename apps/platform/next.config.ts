import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Cache busting — public/ assets weren't being uploaded on the prior deploy.
  // Bumping this comment forces Vercel to redo the deploy step from scratch.
  // build-id: 2026-04-25-fal-assets
};

export default nextConfig;
