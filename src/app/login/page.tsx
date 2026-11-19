"use client";

import {
  type AuthProvider as FirebaseAuthProvider,
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { safeNext } from "@/components/auth/AuthProvider";
import { Logo } from "@/components/Logo";
import { SetupNotice } from "@/components/SetupNotice";
import { auth, githubSignInEnabled, isFirebaseConfigured } from "@/lib/firebase/client";

function friendlyError(code: string): string {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/account-exists-with-different-credential":
      return "You already signed up with the other button using this email. Use that one.";
    case "auth/unauthorized-domain":
      return "This web address isn't on the Firebase authorised-domains list yet.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    default:
      return "Sign-in didn't work. Please try again.";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }
    return onAuthStateChanged(auth(), (user) => {
      if (user) {
        router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
      }
    });
  }, [router]);

  async function signIn(provider: FirebaseAuthProvider) {
    setBusy(true);
    setError("");
    try {
      await signInWithPopup(auth(), provider);
      // onAuthStateChanged above handles the redirect.
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code === "auth/popup-blocked") {
        await signInWithRedirect(auth(), provider);
        return;
      }
      setError(friendlyError(code));
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      {!isFirebaseConfigured ? (
        <SetupNotice />
      ) : (
        <div className="panel w-full max-w-sm p-7 text-center sm:p-8">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-ink">Sign in to HelloQR</h1>
          <p className="mt-2 text-sm text-muted">Make your card, print your QR, and keep track of the people you meet.</p>
          <div className="mt-7 space-y-3">
            <button type="button" disabled={busy} onClick={() => signIn(new GoogleAuthProvider())} className="btn btn-ghost w-full">
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84Z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
              </svg>
              Continue with Google
            </button>
            {githubSignInEnabled && (
              <button type="button" disabled={busy} onClick={() => signIn(new GithubAuthProvider())} className="btn btn-ghost w-full">
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
                  <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
                </svg>
                Continue with GitHub
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="mt-6 rounded-xl bg-surface-2 p-3 text-left text-xs leading-relaxed text-muted">
            <p className="font-medium text-ink">What HelloQR receives</p>
            <p className="mt-1">
              Your name, email address and profile photo, nothing else. HelloQR can&apos;t read your email, contacts or files, and never
              sees your password. You choose what appears on your card.
            </p>
          </div>
          <p className="mt-4 text-xs text-faint">
            By continuing you agree to the{" "}
            <Link href="/terms" className="underline hover:text-ink">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-ink">
              Privacy Policy
            </Link>
            .{" "}
            <Link href="/about" className="underline hover:text-ink">
              Who runs HelloQR?
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
