import type { NextConfig } from "next";

/**
 * Static security headers (ADR-015). Static, so Partial Prerendering keeps working:
 * a nonce-based CSP would make every page dynamic, hence 'unsafe-inline' scripts
 * (Next's inline RSC payload + the theme boot script). The browser never calls
 * Supabase or Meta directly, so connect-src stays 'self'.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Ad thumbnails come from Meta's CDNs (shown unoptimized).
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  // Dev keeps React's eval-based debugging tools working; production gets the CSP.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Content-Security-Policy", value: CSP }]
    : []),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
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
