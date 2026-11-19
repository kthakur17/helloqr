"use client";

import dynamic from "next/dynamic";

// Reads the offline copy from localStorage on first render, so it must never render on the server.
const ShowQr = dynamic(() => import("@/components/dashboard/ShowQr").then((m) => m.ShowQr), {
  ssr: false,
  loading: () => <main className="min-h-dvh bg-white" />,
});

export default function ShowPage() {
  return <ShowQr />;
}
