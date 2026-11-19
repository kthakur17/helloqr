"use client";

import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="panel w-full max-w-sm p-8 text-center">
        <div className="mx-auto w-fit">
          <LogoMark size={44} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">We couldn&apos;t load this page. It&apos;s usually a network blip, so try again.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className="btn btn-ghost btn-sm">
            Home
          </Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={reset}>
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
