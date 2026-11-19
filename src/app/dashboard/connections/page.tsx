"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useAccount } from "@/components/dashboard/DashboardShell";
import { downloadBlob } from "@/lib/cards";
import { toCsv } from "@/lib/csv";
import { deleteLead, listConnections, listLeads, removeConnection } from "@/lib/data";
import { hrefFor } from "@/lib/links";
import type { Connection, Lead } from "@/lib/types";
import { buildLeadVCard } from "@/lib/vcard";

type Saved = Connection & { username: string };
type Shared = Lead & { id: string };
type Tab = "saved" | "shared";

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function ConnectionsPage() {
  const { user, username } = useAccount();
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "shared" ? "shared" : "saved",
  );
  const [saved, setSaved] = useState<Saved[] | null>(null);
  const [shared, setShared] = useState<Shared[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    listConnections(user.uid)
      .then(setSaved)
      .catch(() => setError("Couldn't load your connections."));
    listLeads(username)
      .then(setShared)
      .catch(() => setError("Couldn't load the details people shared with you."));
  }, [user.uid, username]);

  const q = search.trim().toLowerCase();
  const savedRows = useMemo(
    () => (saved ?? []).filter((r) => !q || `${r.displayName} ${r.headline} ${r.username} ${r.note}`.toLowerCase().includes(q)),
    [saved, q],
  );
  const sharedRows = useMemo(
    () => (shared ?? []).filter((r) => !q || `${r.name} ${r.company} ${r.email} ${r.phone} ${r.note}`.toLowerCase().includes(q)),
    [shared, q],
  );

  function exportCsv() {
    const origin = window.location.origin;
    if (tab === "saved") {
      const data = [
        ["Name", "Headline", "Card", "Met at", "Note", "Saved on"],
        ...savedRows.map((r) => [r.displayName, r.headline, `${origin}/${r.username}`, r.eventName, r.note, fmtDate(r.savedAt)]),
      ];
      downloadBlob(new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" }), "helloqr-connections.csv");
    } else {
      const data = [
        ["Name", "Company or role", "Email", "Phone", "LinkedIn", "Note", "Shared on"],
        ...sharedRows.map((r) => [r.name, r.company, r.email, r.phone, hrefFor({ type: "linkedin", value: r.linkedin }) ?? "", r.note, fmtDate(r.createdAt)]),
      ];
      downloadBlob(new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" }), "helloqr-shared-with-me.csv");
    }
  }

  async function removeSaved(row: Saved) {
    if (!window.confirm(`Remove ${row.displayName} from your connections?`)) {
      return;
    }
    try {
      await removeConnection(user.uid, row.username);
      setSaved((list) => list?.filter((r) => r.username !== row.username) ?? null);
    } catch {
      setError("Couldn't remove that connection.");
    }
  }

  async function removeShared(row: Shared) {
    if (!window.confirm(`Delete the details ${row.name} shared with you?`)) {
      return;
    }
    try {
      await deleteLead(username, row.id);
      setShared((list) => list?.filter((r) => r.id !== row.id) ?? null);
    } catch {
      setError("Couldn't delete that entry.");
    }
  }

  const rows = tab === "saved" ? savedRows : sharedRows;
  const loading = tab === "saved" ? saved === null : shared === null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Connections</h1>
          <p className="mt-1 text-muted">Only you can see these lists.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!rows.length}>
          Export CSV
        </button>
      </div>

      <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1" role="tablist" aria-label="Connection lists">
        {(
          [
            ["saved", "Saved by you", saved?.length],
            ["shared", "Shared with you", shared?.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {label}
            {count !== undefined && <span className="ml-1.5 text-faint tabular-nums">{count}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          className="field max-w-xs"
          placeholder={tab === "saved" ? "Search names, notes…" : "Search names, companies, notes…"}
          aria-label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {loading && !error ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="font-medium text-ink">{search ? "No matches" : tab === "saved" ? "No saved connections yet" : "Nobody has shared their details yet"}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            {search
              ? "Try another search."
              : tab === "saved"
                ? "Scan someone's HelloQR and tap “Save to my HelloQR”."
                : "When someone opens your card, they can tap “Share your details” to send you their name and contact. You can turn this off under Profile → Contact card."}
          </p>
        </div>
      ) : tab === "saved" ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {savedRows.map((r) => (
            <li key={r.username} className="panel flex gap-3 p-4">
              <Avatar src={r.thumb} name={r.displayName} className="size-12 text-sm" />
              <div className="min-w-0 flex-1">
                <Link href={`/${r.username}`} target="_blank" className="block truncate font-medium text-ink hover:underline">
                  {r.displayName}
                </Link>
                {r.headline && <p className="truncate text-sm text-muted">{r.headline}</p>}
                <p className="mt-1 text-xs text-faint">
                  {r.eventName ? `Met at ${r.eventName} · ` : ""}
                  {fmtDate(r.savedAt)}
                </p>
                {r.note && <p className="mt-2 rounded-lg bg-surface-2 p-2 text-sm whitespace-pre-line text-text">{r.note}</p>}
              </div>
              <button type="button" onClick={() => removeSaved(r)} className="self-start text-sm text-faint hover:text-danger" aria-label={`Remove ${r.displayName}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {sharedRows.map((r) => {
            const linkedin = r.linkedin ? hrefFor({ type: "linkedin", value: r.linkedin }) : null;
            return (
              <li key={r.id} className="panel flex gap-3 p-4">
                <Avatar name={r.name} className="size-12 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{r.name}</p>
                  {r.company && <p className="truncate text-sm text-muted">{r.company}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    {r.email && (
                      <a href={`mailto:${r.email}`} className="truncate text-ink underline-offset-2 hover:underline">
                        {r.email}
                      </a>
                    )}
                    {r.phone && (
                      <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="text-ink underline-offset-2 hover:underline">
                        {r.phone}
                      </a>
                    )}
                    {linkedin && (
                      <a href={linkedin} target="_blank" rel="noopener noreferrer" className="text-ink underline-offset-2 hover:underline">
                        LinkedIn
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-faint">Shared {fmtDate(r.createdAt)}</p>
                  {r.note && <p className="mt-2 rounded-lg bg-surface-2 p-2 text-sm whitespace-pre-line text-text">{r.note}</p>}
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-muted hover:text-ink"
                    onClick={() =>
                      downloadBlob(new Blob([buildLeadVCard(r)], { type: "text/vcard;charset=utf-8" }), `${r.name.replace(/[^\w-]+/g, "-") || "contact"}.vcf`)
                    }
                  >
                    Save to phone contacts
                  </button>
                </div>
                <button type="button" onClick={() => removeShared(r)} className="self-start text-sm text-faint hover:text-danger" aria-label={`Delete ${r.name}`}>
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
