import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every screen is per-user and permission-dependent, so pages render
  // dynamically per request. No cross-user caching of protected data.
  cacheComponents: false,
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "26mb" }, // file uploads (limit also enforced per setting)
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
