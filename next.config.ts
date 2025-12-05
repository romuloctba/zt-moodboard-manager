import type { NextConfig } from "next";
import { execSync } from "child_process";
import withPWAInit from "next-pwa";

// Get git commit hash for versioning
function getGitHash(): string {
  try {
    return execSync('git rev-parse --short=4 HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

const gitHash = getGitHash();
const appVersion = `0.1.0-${gitHash}`;

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Cache strategies
  runtimeCaching: [
    {
      // Cache images
      urlPattern: /^https?:\/\/.*\.(png|jpg|jpeg|webp|svg|gif|ico)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "images-cache",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      // Cache fonts
      urlPattern: /^https?:\/\/fonts\.(googleapis|gstatic)\.com/,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
  ],
});

// Check if we're building for static export
const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  // Use webpack for builds (required for next-pwa)
  // Turbopack doesn't support next-pwa yet
  turbopack: {},
  // Inject version at build time
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  // Enable static export only when explicitly requested
  // Run with: STATIC_EXPORT=true pnpm build
  ...(isStaticExport && {
    output: 'export',
    distDir: 'moodboard-manager',
    basePath: '/moodboard-manager',
    trailingSlash: true,
  }),
  // Disable image optimization for easier deployment
  images: {
    unoptimized: true,
  },
};

export default withPWA(nextConfig);
