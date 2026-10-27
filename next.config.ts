import type { NextConfig } from "next";
const remotePatterns = process.env.R2_PUBLIC_URL
  ? [
      {
        protocol: "https" as const,
        hostname: new URL(process.env.R2_PUBLIC_URL).hostname,
        pathname: "/**",
      },
    ]
  : [];
const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: { remotePatterns },
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
