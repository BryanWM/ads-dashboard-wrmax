import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Entry point. A page calling redirect() during prerender breaks the `instant`
  // validation of Next 16.4; a config redirect never renders anything.
  // Phase 5: authenticated users go straight to /dashboard (proxy).
  async redirects() {
    return [{ source: "/", destination: "/login", permanent: false }];
  },
};

export default nextConfig;
