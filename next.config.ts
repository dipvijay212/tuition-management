import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every screen is per-user and permission-dependent, so pages render
  // dynamically per request. No cross-user caching of protected data.
  cacheComponents: false,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "26mb",
      allowedOrigins: [
        "localhost:3100",
        "127.0.0.1:3100",
        "localhost:3000",
        "127.0.0.1:3000",
        "*.localhost:3100",
        "*.localhost:3000",
      ],
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
