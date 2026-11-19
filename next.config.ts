import type { NextConfig } from "next";

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
        ],
      },
    ];
  },
};

export default nextConfig;
