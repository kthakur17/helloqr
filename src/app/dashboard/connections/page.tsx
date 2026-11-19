"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useAccount } from "@/components/dashboard/DashboardShell";
import { downloadBlob } from "@/lib/cards";
import { toCsv } from "@/lib/csv";
import { listConnections, removeConnection } from "@/lib/data";
import type { Connection } from "@/lib/types";

type Row = Connection & { username: string };

export default function ConnectionsPage() {
  const { user } = useAccount();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");

  useEffect(() => {
    listConnections(user.uid)
      .then(setRows)
      .catch(() => setError("Couldn't load your connections."));
  }, [user.uid]);

  const events = useMemo(() => {
    const map = new Map<string, string>();
    rows?.forEach((r) => r.eventId && map.set(r.eventId, r.eventName));
    return [...map];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (eventFilter === "all" || (eventFilter === "none" ? !r.eventId : r.eventId === eventFilter)) &&
        (!q || `${r.displayName} ${r.headline} ${r.username} ${r.note}`.toLowerCase().includes(q)),
    );
  }, [rows, search, eventFilter]);

  function exportCsv() {
    const origin = window.location.origin;
    const data = [
      ["Name", "Headline", "Card", "Met at", "Note", "Saved on"],
      ...filtered.map((r) => [r.displayName, r.headline, `${origin}/${r.username}`, r.eventName, r.note, new Date(r.savedAt).toLocaleDateString("en-IN")]),
    ];
    downloadBlob(new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" }), "helloqr-connections.csv");
  }

  async function remove(row: Row) {
    if (!window.confirm(`Remove ${row.displayName} from your connections?`)) {
      return;
    }
    try {
      await removeConnection(user.uid, row.username);
      setRows((list) => list?.filter((r) => r.username !== row.username) ?? null);
    } catch {
      setError("Couldn't remove that connection.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Connections</h1>
          <p className="mt-1 text-muted">People you saved from their HelloQR card or an event. Only you can see this list.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!filtered.length}>
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          className="field max-w-xs"
          placeholder="Search names, notes…"
          aria-label="Search connections"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="field w-auto" aria-label="Filter by event" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="all">All events</option>
          {events.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
          <option value="none">Not at an event</option>
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {rows === null && !error ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="font-semibold text-ink">{rows?.length ? "No matches" : "No connections yet"}</p>
          <p className="mt-1 text-sm text-muted">
            {rows?.length ? "Try another search or event." : "Scan someone's HelloQR and tap “Save to my HelloQR”, or join an event to see who's there."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <li key={r.username} className="panel flex gap-3 p-4">
              <Avatar src={r.thumb} name={r.displayName} className="size-12 text-sm" />
              <div className="min-w-0 flex-1">
                <Link href={`/${r.username}`} target="_blank" className="block truncate font-semibold text-ink hover:underline">
                  {r.displayName}
                </Link>
                {r.headline && <p className="truncate text-sm text-muted">{r.headline}</p>}
                <p className="mt-1 text-xs text-faint">
                  {r.eventName ? `Met at ${r.eventName} · ` : ""}
                  {new Date(r.savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                {r.note && <p className="mt-2 rounded-xl bg-surface-2 p-2 text-sm whitespace-pre-line text-text">{r.note}</p>}
              </div>
              <button type="button" onClick={() => remove(r)} className="self-start text-sm font-semibold text-faint hover:text-danger" aria-label={`Remove ${r.displayName}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
