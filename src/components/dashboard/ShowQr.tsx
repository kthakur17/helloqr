"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { initials, safeImageSrc } from "@/components/Avatar";
import { qrSvg } from "@/lib/qr";
import { ACCENT_HEX, type Accent } from "@/lib/types";

export const SHOW_CACHE_KEY = "hq:show";

interface ShowData {
  username: string;
  displayName: string;
  headline: string;
  thumb: string;
  accent: Accent;
  origin: string;
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function readCache(): ShowData | null {
  try {
    const raw = window.localStorage.getItem(SHOW_CACHE_KEY);
    return raw ? (JSON.parse(raw) as ShowData) : null;
  } catch {
    return null;
  }
}

/** Full-screen code to hold up to someone's camera; keeps working from the offline copy. */
export function ShowQr() {
  const { state } = useAuth();
  const [cached] = useState(readCache);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [copied, setCopied] = useState(false);

  const live = useMemo<ShowData | null>(
    () =>
      state.status === "ready"
        ? {
            username: state.username,
            displayName: state.profile.displayName,
            headline: state.profile.headline,
            thumb: state.profile.thumb || state.profile.photo,
            accent: state.profile.accent,
            origin: window.location.origin,
          }
        : null,
    [state],
  );
  const data = live ?? cached;

  useEffect(() => {
    if (live) {
      try {
        window.localStorage.setItem(SHOW_CACHE_KEY, JSON.stringify(live));
      } catch {
        // No offline copy in private mode; the page still works online.
      }
    }
  }, [live]);

  useEffect(() => {
    // Keep the screen on while someone scans.
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        // Not supported or denied: the screen just follows its normal timeout.
      }
    };
    void request();
    const onVisible = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVisible);
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("beforeinstallprompt", onInstall);
      void lock?.release().catch(() => {});
    };
  }, []);

  const cardUrl = data ? `${data.origin}/${data.username}` : "";
  const svg = useMemo(() => (data ? qrSvg(`${cardUrl}?s=qr`) : ""), [data, cardUrl]);
  const standalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);

  if (!data) {
    return (
      <main className="grid min-h-dvh place-items-center bg-white px-6 text-center text-[#09090b]">
        {state.status === "loading" ? (
          <div className="size-64 animate-pulse rounded-2xl bg-[#f4f4f5]" />
        ) : (
          <div>
            <p className="font-medium">Your QR isn&apos;t available offline yet.</p>
            <p className="mt-1 text-sm text-[#71717a]">Open this page once while you&apos;re online and it will be saved on this phone.</p>
            <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
              Back to dashboard
            </Link>
          </div>
        )}
      </main>
    );
  }

  const photo = safeImageSrc(data.thumb);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${data!.displayName} · HelloQR`, url: cardUrl });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy your link", cardUrl);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-between gap-6 bg-white px-6 py-8 text-center text-[#09090b]">
      <header className="flex flex-col items-center">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- small cached data URL
          <img src={photo} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <span
            className="grid size-16 place-items-center rounded-full text-xl font-medium text-white"
            style={{ background: ACCENT_HEX[data.accent] ?? ACCENT_HEX.blue }}
          >
            {initials(data.displayName)}
          </span>
        )}
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{data.displayName}</h1>
        {data.headline && <p className="mt-1 max-w-xs text-sm text-[#52525b]">{data.headline}</p>}
      </header>

      <div className="flex flex-col items-center">
        <div
          role="img"
          aria-label={`QR code for ${cardUrl}`}
          className="w-[min(84vw,56dvh)] max-w-[480px]"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="mt-4 text-xs font-medium tracking-[0.14em] text-[#a1a1aa] uppercase">Scan to connect</p>
        <p className="mt-1 font-mono text-sm text-[#52525b]">{cardUrl.replace(/^https?:\/\//, "")}</p>
      </div>

      <footer className="flex w-full max-w-xs flex-col items-center gap-3">
        <div className="grid w-full grid-cols-2 gap-2">
          <button type="button" onClick={share} className="rounded-xl bg-[#09090b] px-4 py-2.5 text-sm font-medium text-white">
            {copied ? "Link copied" : "Share link"}
          </button>
          <Link href="/dashboard" className="rounded-xl border border-[#e4e4e7] px-4 py-2.5 text-sm font-medium">
            Done
          </Link>
        </div>
        {installEvent && !standalone && (
          <button type="button" onClick={() => void installEvent.prompt()} className="text-sm font-medium underline">
            Add to home screen
          </button>
        )}
        {!installEvent && !standalone && ios && (
          <p className="text-xs text-[#71717a]">Tip: tap Share → Add to Home Screen to open this in one tap.</p>
        )}
        <p className="text-xs text-[#a1a1aa]">Turn your screen brightness up for faster scans.</p>
      </footer>
    </main>
  );
}
