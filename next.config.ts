import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: {
      // Default 1 MB body limit rejects phone photos before our own
      // 5 MB check in adminUploadImage runs, surfacing as a generic
      // "unexpected response" error on the client.
      bodySizeLimit: '6mb',
    },
  },
  // Turbopack's HMR WebSocket tries to reconnect to `localhost` when the
  // page is opened from a phone on the same LAN. The failed connection causes
  // Next.js to render an invisible fixed-inset-0 error overlay that silently
  // swallows every tap on Android. Disabling devIndicators removes it.
  devIndicators: false,
};

export default nextConfig;
