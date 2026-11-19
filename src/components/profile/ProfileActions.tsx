"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/track";

export function TrackedLink({
  href,
  username,
  linkId,
  preview,
  className,
  style,
  children,
}: {
  href: string;
  username: string;
  linkId: string;
  preview: boolean;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (preview) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  // Plain https links: the phone hands them to the installed app (LinkedIn, X, GitHub…) or the browser.
  return (
    <a
      href={href}
      target="_blank"
      rel="me noopener noreferrer"
      className={className}
      style={style}
      onClick={() => track(username, `click_${linkId}`)}
    >
      {children}
    </a>
  );
}

export function ShareButton({ title, username }: { title: string; username: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/${username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button type="button" onClick={share} className="btn btn-ghost">
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
        <path d="M12 15V4m0 0L8 8m4-4 4 4M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

/** Counts one view per browser session, plus a scan when the visit came from the printed QR (?s=qr). */
export function ViewBeacon({ username }: { username: string }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQr = params.get("s") === "qr";
    let seen = false;
    try {
      seen = sessionStorage.getItem(`hq:viewed:${username}`) === "1";
      sessionStorage.setItem(`hq:viewed:${username}`, "1");
    } catch {
      // Private mode: count every load.
    }
    if (!seen) {
      track(username, "views");
      if (fromQr) {
        track(username, "scans");
      }
    }
    if (fromQr) {
      // Keep the address clean when the visitor shares it on.
      params.delete("s");
      const qs = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
    }
  }, [username]);
  return null;
}
