import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/**
 * connect-src is pinned to the API origin baked in at build time (NEXT_PUBLIC_API_BASE_URL is
 * inlined into the client bundle, so the CSP must match the same value).
 */
function apiOrigin() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
  try {
    return new URL(raw).origin;
  } catch {
    return "*";
  }
}

function contentSecurityPolicy(dev) {
  // Next.js App Router emits inline bootstrap scripts and no nonce is configured, so
  // 'unsafe-inline' is required for scripts. The dev server additionally needs eval and HMR sockets.
  const script = ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])];
  const connect = ["'self'", apiOrigin(), ...(dev ? ["ws:", "wss:"] : [])];
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/** @type {(phase: string) => import('next').NextConfig} */
export default function nextConfig(phase) {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    // Standalone output is only for the Docker image (Dockerfile sets NEXT_OUTPUT=standalone);
    // the default output keeps `next start` and Vercel working.
    ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" } : {}),
    reactStrictMode: true,
    poweredByHeader: false,
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Content-Security-Policy", value: contentSecurityPolicy(dev) },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "no-referrer" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ],
        },
      ];
    },
  };
}
