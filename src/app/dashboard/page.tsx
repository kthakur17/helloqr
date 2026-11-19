"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandChip } from "@/components/BrandIcon";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { useAccount } from "@/components/dashboard/DashboardShell";
import { StatTile } from "@/components/dashboard/StatTile";
import { countLeads, getCounters } from "@/lib/data";
import { displayValue, linkTitle } from "@/lib/links";
import { qrSvg } from "@/lib/qr";
import { ACCENT_HEX } from "@/lib/types";

function ArrowTile() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function OverviewPage() {
  const { username, profile } = useAccount();
  const [counters, setCounters] = useState<Record<string, number> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [shared, setShared] = useState<number | null>(null);

  useEffect(() => {
    getCounters(username)
      .then(setCounters)
      .catch(() => setLoadError(true));
    countLeads(username)
      .then(setShared)
      .catch(() => setShared(0));
  }, [username]);

  const origin = window.location.origin;
  const cardUrl = `${origin}/${username}`;
  const svg = useMemo(() => qrSvg(`${cardUrl}?s=qr`), [cardUrl]);

  const clicks = profile.links
    .map((link) => ({ link, n: counters?.[`click_${link.id}`] ?? 0 }))
    .sort((a, b) => b.n - a.n);
  const maxClicks = Math.max(1, ...clicks.map((c) => c.n));
  const firstName = profile.displayName.split(/\s+/)[0];
  const stat = (key: string) => (loadError ? 0 : (counters?.[key] ?? (counters ? 0 : null)));

  const todo = [
    !profile.photo && "Add a photo so people recognise you",
    profile.links.length === 0 && "Add your LinkedIn, GitHub and other profiles",
    !profile.headline && "Write a one-line headline",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-ink">Hi {firstName}</h1>
        <p className="mt-1 text-muted">Here&apos;s how your card is doing.</p>
      </div>

      {loadError && (
        <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm font-medium text-warn">
          Couldn&apos;t load your stats right now.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <section className="panel flex flex-col gap-6 p-6 md:col-span-2 lg:row-span-2 sm:p-7">
          <div>
            <p className="eyebrow">Your link</p>
            <p className="mt-1.5 truncate font-display text-2xl font-extrabold tracking-[-0.02em] text-ink">{cardUrl.replace(/^https?:\/\//, "")}</p>
            <p className="mt-1 text-sm text-muted">Anyone who scans your code or opens this link sees your card.</p>
          </div>
          <div className="flex flex-1 flex-col items-center gap-6 sm:flex-row sm:items-end">
            <div
              className="w-48 shrink-0 overflow-hidden rounded-2xl bg-white p-2 shadow-[var(--tile-shadow)]"
              aria-label="Your QR code"
              role="img"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <div className="grid w-full gap-2 sm:w-auto sm:flex-1">
              <CopyButton text={cardUrl} className="btn btn-ghost w-full" />
              <Link href={`/${username}`} target="_blank" className="btn btn-ghost w-full">
                Open card
              </Link>
              <Link href="/dashboard/qr" className="btn btn-primary w-full">
                Download &amp; print
              </Link>
            </div>
          </div>
        </section>

        <StatTile label="Card views" value={stat("views")} hint="Once per visitor session" />
        <StatTile label="QR scans" value={stat("scans")} hint="Views from your printed or shown code" tone="dark" />
        <StatTile label="Contacts saved" value={stat("vcard")} hint="Downloads of your contact card" />
        <StatTile label="Saved on HelloQR" value={stat("saves")} hint="People who added you to their connections" />

        <section className="panel p-6 md:col-span-2 lg:col-span-3 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">Link taps</h2>
            <Link href="/dashboard/profile" className="text-sm font-semibold text-muted hover:text-ink">
              Edit links
            </Link>
          </div>
          {profile.links.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No links yet. Add some and their taps show up here.</p>
          ) : (
            <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {clicks.map(({ link, n }) => (
                <li key={link.id} className="flex items-center gap-3">
                  <BrandChip type={link.type} size="sm" tone="brand" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-ink">
                        {linkTitle(link)} <span className="font-normal text-muted">{displayValue(link)}</span>
                      </p>
                      <p className="shrink-0 font-display text-sm font-bold tabular-nums text-ink">{counters ? n : "–"}</p>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${(n / maxClicks) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-4 md:col-span-2 md:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
          <Link
            href="/dashboard/show"
            className="tile-hover group flex min-h-40 flex-col justify-between rounded-[1.25rem] p-6 text-white"
            style={{ background: ACCENT_HEX[profile.accent] ?? ACCENT_HEX.blue }}
          >
            <span className="flex items-start justify-between">
              <span className="text-[0.8rem] font-medium tracking-[0.03em] uppercase opacity-75">Meeting someone?</span>
              <ArrowTile />
            </span>
            <span className="font-display text-2xl font-extrabold tracking-[-0.02em]">Show my QR</span>
          </Link>

          {shared !== null && shared > 0 ? (
            <Link
              href="/dashboard/connections?tab=shared"
              className="tile-hover group flex min-h-40 flex-col justify-between rounded-[1.25rem] bg-matcha/45 p-6 text-ink"
            >
              <span className="flex items-start justify-between">
                <span className="text-[0.8rem] font-medium tracking-[0.03em] uppercase opacity-70">Shared with you</span>
                <ArrowTile />
              </span>
              <span>
                <span className="block font-display text-[2.75rem] leading-none font-extrabold tracking-[-0.03em] tabular-nums">{shared}</span>
                <span className="mt-1 block text-sm opacity-75">{shared === 1 ? "person sent you their details" : "people sent you their details"}</span>
              </span>
            </Link>
          ) : todo.length > 0 ? (
            <Link href="/dashboard/profile" className="tile-hover group flex min-h-40 flex-col justify-between rounded-[1.25rem] bg-tamago/40 p-6 text-ink">
              <span className="flex items-start justify-between">
                <span className="text-[0.8rem] font-medium tracking-[0.03em] uppercase opacity-70">Finish your card</span>
                <ArrowTile />
              </span>
              <span className="text-sm font-medium">{todo[0]}</span>
            </Link>
          ) : (
            <Link href="/dashboard/qr" className="panel tile-hover group flex min-h-40 flex-col justify-between p-6 text-ink">
              <span className="flex items-start justify-between">
                <span className="text-[0.8rem] font-medium tracking-[0.03em] text-muted uppercase">Print</span>
                <ArrowTile />
              </span>
              <span className="font-display text-lg font-bold">Pick from 10 card designs</span>
            </Link>
          )}
        </div>
      </div>
      <p className="text-xs text-faint">Counts are approximate: they are kept for your own interest, and visitors with blockers may not be counted.</p>
    </div>
  );
}
