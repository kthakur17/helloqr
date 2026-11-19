"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandChip } from "@/components/BrandIcon";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { useAccount } from "@/components/dashboard/DashboardShell";
import { StatTile } from "@/components/dashboard/StatTile";
import { getCounters } from "@/lib/data";
import { displayValue, linkTitle } from "@/lib/links";
import { qrSvg } from "@/lib/qr";

export default function OverviewPage() {
  const { username, profile } = useAccount();
  const [counters, setCounters] = useState<Record<string, number> | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    getCounters(username)
      .then(setCounters)
      .catch(() => setLoadError(true));
  }, [username]);

  const origin = window.location.origin;
  const cardUrl = `${origin}/${username}`;
  const svg = useMemo(() => qrSvg(`${cardUrl}?s=qr`), [cardUrl]);

  const clicks = profile.links
    .map((link) => ({ link, n: counters?.[`click_${link.id}`] ?? 0 }))
    .sort((a, b) => b.n - a.n);
  const maxClicks = Math.max(1, ...clicks.map((c) => c.n));
  const firstName = profile.displayName.split(/\s+/)[0];

  const todo = [
    !profile.photo && { href: "/dashboard/profile", text: "Add a photo so people recognise you" },
    profile.links.length === 0 && { href: "/dashboard/profile", text: "Add your LinkedIn, GitHub and other profiles" },
    !profile.headline && { href: "/dashboard/profile", text: "Write a one-line headline" },
  ].filter(Boolean) as { href: string; text: string }[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Hi {firstName}</h1>
        <p className="mt-1 text-muted">Here&apos;s how your card is doing.</p>
      </div>

      <section className="panel flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <div
          className="mx-auto w-36 shrink-0 overflow-hidden rounded-2xl border border-line-soft bg-white p-1 sm:mx-0"
          aria-label="Your QR code"
          role="img"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-muted">Your link</p>
          <p className="mt-1 truncate text-xl font-semibold text-ink sm:text-2xl">{cardUrl.replace(/^https?:\/\//, "")}</p>
          <p className="mt-1 text-sm text-muted">Anyone who scans your QR or opens this link sees your card and can tap straight into your profiles.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton text={cardUrl} />
            <Link href={`/${username}`} target="_blank" className="btn btn-ghost btn-sm">
              Open card
            </Link>
            <Link href="/dashboard/qr" className="btn btn-primary btn-sm">
              Download &amp; print QR
            </Link>
          </div>
        </div>
      </section>

      {todo.length > 0 && (
        <section className="rounded-2xl border border-dashed border-line bg-surface-2/50 p-5">
          <p className="font-semibold text-ink">Finish your card</p>
          <ul className="mt-2 space-y-1.5">
            {todo.map((t) => (
              <li key={t.text}>
                <Link href={t.href} className="text-sm font-semibold text-accent hover:underline">
                  {t.text} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {loadError && (
        <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm font-semibold text-warn">
          Couldn&apos;t load your stats right now.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Card views" value={loadError ? 0 : (counters?.views ?? (counters ? 0 : null))} hint="Once per visitor session" />
        <StatTile label="QR scans" value={loadError ? 0 : (counters?.scans ?? (counters ? 0 : null))} hint="Views that came from your printed code" />
        <StatTile label="Contacts saved" value={loadError ? 0 : (counters?.vcard ?? (counters ? 0 : null))} hint="Downloads of your contact card" />
        <StatTile label="Saved on HelloQR" value={loadError ? 0 : (counters?.saves ?? (counters ? 0 : null))} hint="People who added you to their connections" />
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Link taps</h2>
          <Link href="/dashboard/profile" className="text-sm font-semibold text-accent hover:underline">
            Edit links
          </Link>
        </div>
        {profile.links.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No links yet. Add some and their taps show up here.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {clicks.map(({ link, n }) => (
              <li key={link.id} className="flex items-center gap-3">
                <BrandChip type={link.type} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-ink">
                      {linkTitle(link)} <span className="font-medium text-muted">{displayValue(link)}</span>
                    </p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">{counters ? n : "–"}</p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${(n / maxClicks) * 100}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-faint">Counts are approximate: they are kept for your own interest, and visitors with blockers may not be counted.</p>
    </div>
  );
}
