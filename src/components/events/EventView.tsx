"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/Avatar";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { SetupNotice } from "@/components/SetupNotice";
import { downloadBlob, downloadCanvas, formatDate, loadCardFonts, renderEventPoster } from "@/lib/cards";
import { toCsv } from "@/lib/csv";
import {
  getEvent,
  isJoined,
  joinEvent,
  leaveEvent,
  listAttendees,
  listConnections,
  removeAttendee,
  saveConnection,
  updateEvent,
} from "@/lib/data";
import { track } from "@/lib/track";
import type { Attendee, EventDoc } from "@/lib/types";

type Member = Attendee & { uid: string };

export function EventView({ eventId, initialEvent }: { eventId: string; initialEvent: EventDoc }) {
  const { state } = useAuth();
  const [event, setEvent] = useState(initialEvent);
  const [joined, setJoined] = useState<boolean | null>(null);
  const [attendees, setAttendees] = useState<Member[] | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const uid = state.status === "ready" || state.status === "needsProfile" ? state.user.uid : null;
  const isOrganiser = uid !== null && uid === event.organiserUid;
  const canSeeList = joined === true || isOrganiser;
  const eventUrl = typeof window === "undefined" ? "" : `${window.location.origin}/e/${eventId}`;

  useEffect(() => {
    if (!uid) {
      return;
    }
    isJoined(uid, eventId)
      .then(setJoined)
      .catch(() => setJoined(false));
    // The server copy may be a few seconds old; the organiser needs the live open/closed flag.
    getEvent(eventId)
      .then((e) => e && setEvent(e))
      .catch(() => {});
  }, [uid, eventId]);

  const loadAttendees = useCallback(async () => {
    try {
      setAttendees(await listAttendees(eventId));
    } catch {
      setError("You can't see this event's list. You may have been removed by the organiser.");
      setAttendees([]);
    }
  }, [eventId]);

  useEffect(() => {
    if (!canSeeList || !uid) {
      return;
    }
    listAttendees(eventId)
      .then(setAttendees)
      .catch(() => {
        setError("You can't see this event's list. You may have been removed by the organiser.");
        setAttendees([]);
      });
    listConnections(uid)
      .then((list) => setSaved(new Set(list.map((c) => c.username))))
      .catch(() => {});
  }, [canSeeList, uid, eventId]);

  async function join() {
    if (state.status !== "ready") {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await joinEvent(state.user.uid, eventId, event, state.username, state.profile);
      setJoined(true);
    } catch {
      setError(event.open ? "Couldn't join. Try again." : "This event isn't accepting new people.");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!uid || !window.confirm("Leave this event? You'll disappear from its list.")) {
      return;
    }
    setBusy(true);
    try {
      await leaveEvent(uid, eventId);
      setJoined(false);
      setAttendees(null);
    } catch {
      setError("Couldn't leave. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function save(member: Member) {
    if (!uid) {
      return;
    }
    try {
      await saveConnection(uid, member.username, {
        displayName: member.displayName,
        headline: member.headline,
        thumb: member.thumb,
        eventId,
        eventName: event.name,
        note: "",
      });
      track(member.username, "saves");
      setSaved((s) => new Set(s).add(member.username));
    } catch {
      setError(`Couldn't save ${member.displayName}.`);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = attendees ?? [];
    return q ? list.filter((a) => `${a.displayName} ${a.headline} ${a.username}`.toLowerCase().includes(q)) : list;
  }, [attendees, search]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="panel p-6 sm:p-8">
        <p className="eyebrow text-muted">Event</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{event.name}</h1>
        <p className="mt-2 font-semibold text-text">
          {formatDate(event.date)}
          {event.venue && ` · ${event.venue}`}
        </p>
        {event.description && <p className="mt-3 max-w-2xl text-sm whitespace-pre-line text-muted">{event.description}</p>}
        {!event.open && <p className="mt-4 inline-block rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">Closed to new joins</p>}

        <div className="mt-6">
          <JoinArea
            state={state.status}
            eventId={eventId}
            open={event.open}
            joined={joined}
            isOrganiser={isOrganiser}
            busy={busy}
            onJoin={join}
            onLeave={leave}
          />
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </section>

      {isOrganiser && (
        <OrganiserPanel
          eventId={eventId}
          event={event}
          eventUrl={eventUrl}
          attendees={attendees}
          onToggle={async () => {
            const open = !event.open;
            try {
              await updateEvent(eventId, { open });
              setEvent({ ...event, open });
            } catch {
              setError("Couldn't update the event.");
            }
          }}
        />
      )}

      {canSeeList && (
        <section className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">
              Who&apos;s here {attendees && <span className="text-muted">· {attendees.length}</span>}
            </h2>
            <div className="flex gap-2">
              <input
                type="search"
                className="field w-48 sm:w-64"
                placeholder="Search names, roles…"
                aria-label="Search attendees"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadAttendees()} aria-label="Refresh list">
                ↻
              </button>
            </div>
          </div>
          {attendees === null ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-20" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{attendees.length ? "No one matches that search." : "No one has joined yet. Share the event QR!"}</p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {filtered.map((a) => (
                <li key={a.uid} className="flex items-center gap-3 rounded-2xl border border-line-soft bg-surface p-3">
                  <Avatar src={a.thumb} name={a.displayName} className="size-12 text-sm" />
                  <Link href={`/${a.username}`} target="_blank" className="min-w-0 flex-1 hover:underline">
                    <span className="block truncate font-semibold text-ink">{a.displayName}</span>
                    <span className="block truncate text-sm text-muted">{a.headline || `@${a.username}`}</span>
                  </Link>
                  {a.uid === uid ? (
                    <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">You</span>
                  ) : saved.has(a.username) ? (
                    <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">Saved</span>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => save(a)}>
                      Save
                    </button>
                  )}
                  {isOrganiser && a.uid !== uid && (
                    <button
                      type="button"
                      aria-label={`Remove ${a.displayName}`}
                      title="Remove from event"
                      className="shrink-0 rounded-lg px-2 text-faint hover:text-danger"
                      onClick={async () => {
                        if (!window.confirm(`Remove ${a.displayName} from this event?`)) {
                          return;
                        }
                        try {
                          await removeAttendee(eventId, a.uid);
                          setAttendees((list) => list?.filter((x) => x.uid !== a.uid) ?? null);
                        } catch {
                          setError("Couldn't remove them.");
                        }
                      }}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function JoinArea({
  state,
  eventId,
  open,
  joined,
  isOrganiser,
  busy,
  onJoin,
  onLeave,
}: {
  state: string;
  eventId: string;
  open: boolean;
  joined: boolean | null;
  isOrganiser: boolean;
  busy: boolean;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const next = encodeURIComponent(`/e/${eventId}`);
  if (state === "unconfigured") {
    return <SetupNotice />;
  }
  if (state === "loading" || (state === "ready" && joined === null)) {
    return <div className="skeleton h-11 w-40 rounded-full" />;
  }
  if (state === "signedOut") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/login?next=${next}`} className="btn btn-primary">
          Sign in to join
        </Link>
        <p className="text-sm text-muted">Join to see everyone here and save them in one tap.</p>
      </div>
    );
  }
  if (state === "needsProfile") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/dashboard?next=${next}`} className="btn btn-primary">
          Create your card to join
        </Link>
        <p className="text-sm text-muted">It takes a minute. You&apos;ll come straight back here.</p>
      </div>
    );
  }
  if (state === "error") {
    return <p className="text-sm text-danger">Couldn&apos;t load your account. Refresh to try again.</p>;
  }
  if (joined) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-success-soft px-3 py-1.5 text-sm font-semibold text-success">You&apos;re in</span>
        <button type="button" className="text-sm font-semibold text-muted hover:text-danger" disabled={busy} onClick={onLeave}>
          Leave event
        </button>
      </div>
    );
  }
  if (!open) {
    return isOrganiser ? null : <p className="text-sm text-muted">The organiser has closed this event to new people.</p>;
  }
  return (
    <button type="button" className="btn btn-primary" disabled={busy} onClick={onJoin}>
      {busy ? "Joining…" : isOrganiser ? "Join your own event" : "Join event"}
    </button>
  );
}

function OrganiserPanel({
  eventId,
  event,
  eventUrl,
  attendees,
  onToggle,
}: {
  eventId: string;
  event: EventDoc;
  eventUrl: string;
  attendees: Member[] | null;
  onToggle: () => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [posterBusy, setPosterBusy] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function poster() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    setPosterBusy(true);
    try {
      await loadCardFonts();
      renderEventPoster(canvas, {
        name: event.name,
        date: event.date,
        venue: event.venue,
        url: eventUrl,
        displayUrl: eventUrl.replace(/^https?:\/\//, ""),
        style: "light",
      });
      await downloadCanvas(canvas, `helloqr-event-${eventId}.png`);
    } finally {
      setPosterBusy(false);
    }
  }

  function exportCsv() {
    const origin = window.location.origin;
    const rows = [
      ["Name", "Headline", "Username", "Card", "Joined at"],
      ...(attendees ?? []).map((a) => [a.displayName, a.headline, a.username, `${origin}/${a.username}`, new Date(a.joinedAt).toISOString()]),
    ];
    downloadBlob(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }), `helloqr-${eventId}-attendees.csv`);
  }

  return (
    <section className="panel p-5 sm:p-6">
      <p className="eyebrow text-muted">Organiser tools</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary btn-sm" disabled={posterBusy} onClick={poster}>
          {posterBusy ? "Preparing…" : "Download event QR poster"}
        </button>
        <CopyButton text={eventUrl} label="Copy event link" />
        <button type="button" className="btn btn-ghost btn-sm" disabled={!attendees?.length} onClick={exportCsv}>
          Export attendees (CSV)
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={toggling}
          onClick={async () => {
            setToggling(true);
            await onToggle();
            setToggling(false);
          }}
        >
          {event.open ? "Close to new joins" : "Reopen event"}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">
        Show the poster on the venue screen or print it for the registration desk. Attendees see each other&apos;s name, headline and card
        link only after they join.
      </p>
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </section>
  );
}
