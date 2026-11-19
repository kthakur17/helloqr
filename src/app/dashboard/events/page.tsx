"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "@/components/dashboard/DashboardShell";
import { formatDate } from "@/lib/cards";
import { createEvent, listJoined, listMyEvents } from "@/lib/data";
import type { EventDoc, JoinedEvent } from "@/lib/types";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EventsPage() {
  const { user } = useAccount();
  const router = useRouter();
  const [mine, setMine] = useState<(EventDoc & { id: string })[] | null>(null);
  const [joined, setJoined] = useState<(JoinedEvent & { id: string })[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", date: todayIso(), venue: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    Promise.all([listMyEvents(user.uid), listJoined(user.uid)])
      .then(([m, j]) => {
        setMine(m);
        setJoined(j);
      })
      .catch(() => setLoadError("Couldn't load your events."));
  }, [user.uid]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const event: EventDoc = {
        name: form.name.trim().slice(0, 80),
        date: form.date,
        venue: form.venue.trim().slice(0, 120),
        description: form.description.trim().slice(0, 500),
        organiserUid: user.uid,
        open: true,
        createdAt: Date.now(),
      };
      const id = await createEvent(event);
      router.push(`/e/${id}`);
    } catch {
      setCreateError("Couldn't create the event. Try again.");
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Events</h1>
          <p className="mt-1 max-w-2xl text-muted">
            Create an event and show its QR at the venue. Everyone who joins can see who else is there and save each other in one tap.
          </p>
        </div>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            + New event
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="panel space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">New event</h2>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
            <div>
              <label className="label" htmlFor="ev-name">
                Name
              </label>
              <input
                id="ev-name"
                className="field"
                required
                maxLength={80}
                placeholder="Founders Summit 2026"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="ev-date">
                Date
              </label>
              <input id="ev-date" type="date" className="field" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ev-venue">
              Venue <span className="font-medium text-muted">(optional)</span>
            </label>
            <input id="ev-venue" className="field" maxLength={120} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="ev-desc">
              Description <span className="font-medium text-muted">(optional)</span>
            </label>
            <textarea
              id="ev-desc"
              className="field min-h-20"
              maxLength={500}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {createError && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {createError}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
              {creating ? "Creating…" : "Create event"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loadError && (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">
          {loadError}
        </p>
      )}

      <EventList
        title="Organising"
        empty="You haven't created an event yet."
        items={mine?.map((e) => ({ id: e.id, name: e.name, date: e.date, extra: e.open ? "Open" : "Closed" })) ?? null}
      />
      <EventList title="Joined" empty="Events you join show up here." items={joined?.map((e) => ({ id: e.id, name: e.name, date: e.date })) ?? null} />
    </div>
  );
}

function EventList({ title, empty, items }: { title: string; empty: string; items: { id: string; name: string; date: string; extra?: string }[] | null }) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {items === null ? (
        <div className="mt-4 space-y-2">
          <div className="skeleton h-14" />
          <div className="skeleton h-14" />
        </div>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-line-soft">
          {items.map((ev) => (
            <li key={ev.id}>
              <Link href={`/e/${ev.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-ink">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{ev.name}</span>
                  <span className="block text-sm text-muted">{formatDate(ev.date)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {ev.extra && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        ev.extra === "Open" ? "bg-success-soft text-success" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {ev.extra}
                    </span>
                  )}
                  <span aria-hidden="true" className="text-faint">
                    →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
