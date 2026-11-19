import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="panel w-full max-w-sm p-8 text-center">
        <div className="mx-auto w-fit">
          <LogoMark size={44} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-ink">Nobody here yet</h1>
        <p className="mt-2 text-sm text-muted">This card doesn&apos;t exist, or the link was typed wrong.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className="btn btn-ghost btn-sm">
            Home
          </Link>
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            Claim this name
          </Link>
        </div>
      </div>
    </main>
  );
}
