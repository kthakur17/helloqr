import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line-soft bg-bg/80 backdrop-blur">
        <div className="wrap flex h-14 items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-1">
            <Link href="/#how" className="hidden rounded-lg px-3 py-1.5 text-sm text-muted hover:text-ink sm:block">
              How it works
            </Link>
            <Link href="/#events" className="hidden rounded-lg px-3 py-1.5 text-sm text-muted hover:text-ink sm:block">
              Events
            </Link>
            <Link href="/dashboard" className="ml-2 rounded-lg px-3 py-1.5 text-sm text-ink hover:bg-surface-2">
              Sign in
            </Link>
            <Link href="/dashboard" className="btn btn-primary btn-sm hidden sm:inline-flex">
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line-soft">
        <div className="wrap flex flex-col items-center justify-between gap-3 py-8 text-sm text-muted sm:flex-row">
          <p>HelloQR. Your digital business card.</p>
          <nav className="flex gap-5" aria-label="Footer">
            <Link href="/about" className="hover:text-ink">
              About
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
