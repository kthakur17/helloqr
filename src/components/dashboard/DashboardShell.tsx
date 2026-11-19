"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth, type AuthState } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { SetupNotice } from "@/components/SetupNotice";
import { Onboarding } from "./Onboarding";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/qr", label: "QR & print" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/connections", label: "Connections" },
  { href: "/dashboard/account", label: "Account" },
] as const;

export type ReadyState = Extract<AuthState, { status: "ready" }>;

/** For pages inside the shell, which only renders them once the account is ready. */
export function useAccount(): ReadyState & { setProfile: ReturnType<typeof useAuth>["setProfile"] } {
  const { state, setProfile } = useAuth();
  if (state.status !== "ready") {
    throw new Error("useAccount used outside a ready dashboard");
  }
  return { ...state, setProfile };
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { state, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status === "signedOut") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [state.status, pathname, router]);

  // Full-screen QR: no chrome, and it renders from its offline copy even before the account loads.
  if (pathname === "/dashboard/show") {
    return <>{children}</>;
  }

  if (state.status === "unconfigured") {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <SetupNotice />
      </main>
    );
  }

  if (state.status === "loading" || state.status === "signedOut") {
    return (
      <main className="wrap py-10" aria-busy="true">
        <div className="skeleton h-9 w-40" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
        <div className="skeleton mt-6 h-64" />
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="panel max-w-md p-6 text-center">
          <p className="font-semibold text-ink">We couldn&apos;t load your account</p>
          <p className="mt-2 text-sm text-muted">{state.message}</p>
          <button type="button" className="btn btn-primary btn-sm mt-4" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (state.status === "needsProfile") {
    return (
      <main className="min-h-dvh px-4 py-10">
        <Onboarding user={state.user} />
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line-soft bg-bg/85 backdrop-blur">
        <div className="wrap flex h-16 items-center justify-between gap-3">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-2">
            <Link href={`/${state.username}`} className="btn btn-ghost btn-sm hidden sm:inline-flex" target="_blank">
              View my card
            </Link>
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center rounded-full" aria-label="Account menu">
                <Avatar src={state.profile.thumb || state.profile.photo} name={state.profile.displayName} accent={state.profile.accent} className="size-9 text-sm" />
              </summary>
              <div className="panel absolute right-0 mt-2 w-56 p-2 text-sm">
                <p className="truncate px-3 pt-2 font-semibold text-ink">{state.profile.displayName}</p>
                <p className="truncate px-3 pb-2 text-muted">{state.user.email}</p>
                <Link href={`/${state.username}`} target="_blank" className="block rounded-xl px-3 py-2 hover:bg-surface-2 sm:hidden">
                  View my card
                </Link>
                <button type="button" onClick={() => logout()} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-surface-2">
                  Sign out
                </button>
              </div>
            </details>
          </div>
        </div>
        <nav className="wrap -mb-px flex gap-1 overflow-x-auto" aria-label="Dashboard">
          {NAV.map((item) => {
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
                  active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main id="main" className="wrap flex-1 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
