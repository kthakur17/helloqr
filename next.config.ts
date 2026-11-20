import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// Enforced after a signed-in run in report-only mode showed no violations. Next.js inline bootstrap
// scripts need 'unsafe-inline' without nonces.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://apis.google.com https://www.gstatic.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://avatars.githubusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self' https://*.googleapis.com https://apis.google.com${dev ? " ws:" : ""}`,
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Serves Firebase's sign-in handler from our own domain, so Google's sign-in screen names this
  // site instead of <project>.firebaseapp.com (and redirect sign-in survives third-party cookie blocking).
  async rewrites() {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!project) {
      return [];
    }
    return [{ source: "/__/auth/:path*", destination: `https://${project}.firebaseapp.com/__/auth/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Our own pages may frame each other (Firebase sign-in uses a same-site iframe); nobody else may.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
      {
        // The proxied Firebase sign-in pages bring their own scripts, so they're left out.
        source: "/((?!__/auth/).*)",
        headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }],
      },
    ];
  },
};

export default nextConfig;
