import type { MetadataRoute } from "next";

/** Installed from "Show my QR", the app opens straight to the full-screen code. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HelloQR",
    short_name: "HelloQR",
    description: "Your digital business card. Show your QR, share your profiles.",
    start_url: "/dashboard/show",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
