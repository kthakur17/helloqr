"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SaveContext } from "@/lib/connectFlow";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "open"; ctx: SaveContext }
  | { kind: "self" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export function SaveToHelloQR({
  username,
  displayName,
  headline,
  thumb,
}: {
  username: string;
  displayName: string;
  headline: string;
  thumb: string;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [eventId, setEventId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const autoStarted = useRef(false);
  const router = useRouter();

  async function start() {
    setState({ kind: "loading" });
    try {
      const flow = await import("@/lib/connectFlow");
      const ctx = await flow.loadSaveContext(username);
      if (!ctx) {
        router.push(`/login?next=${encodeURIComponent(`/${username}?save=1`)}`);
        return;
      }
      if (ctx.myUsername === username) {
        setState({ kind: "self" });
        return;
      }
      setEventId(ctx.existing?.eventId || flow.defaultEventId(ctx.joined));
      setNote(ctx.existing?.note ?? "");
      setState({ kind: "open", ctx });
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Something went wrong." });
    }
  }

  useEffect(() => {
    // Back from the sign-in page with ?save=1: carry on where the visitor left off.
    const params = new URLSearchParams(window.location.search);
    if (params.get("save") === "1" && !autoStarted.current) {
      autoStarted.current = true;
      params.delete("save");
      const qs = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on arrival
  }, []);

  async function save(ctx: SaveContext) {
    setSaving(true);
    try {
      const flow = await import("@/lib/connectFlow");
      const event = ctx.joined.find((e) => e.id === eventId);
      await flow.saveContact(ctx, username, {
        displayName,
        headline,
        thumb,
        eventId: event ? event.id : "",
        eventName: event ? event.name : "",
        note: note.trim().slice(0, 300),
      });
      setState({ kind: "saved" });
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Couldn't save." });
    } finally {
      setSaving(false);
    }
  }

  const firstName = displayName.split(/\s+/)[0];

  return (
    <div className="px-4 pb-5 sm:px-5">
      {(state.kind === "idle" || state.kind === "loading") && (
        <button
          type="button"
          onClick={start}
          disabled={state.kind === "loading"}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line p-3 text-sm font-semibold text-ink transition hover:bg-surface-2"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          {state.kind === "loading" ? "Opening…" : `Save ${firstName} to my HelloQR`}
        </button>
      )}

      {state.kind === "open" && (
        <form
          className="rounded-2xl border border-line-soft bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save(state.ctx);
          }}
        >
          <p className="font-semibold text-ink">{state.ctx.existing ? "Update saved contact" : `Save ${firstName} to your connections`}</p>
          <label className="label mt-3" htmlFor="met-at">
            Where did you meet?
          </label>
          <select id="met-at" className="field" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Not at an event</option>
            {state.ctx.joined.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} {ev.date ? `· ${ev.date}` : ""}
              </option>
            ))}
          </select>
          <label className="label mt-3" htmlFor="note">
            Note (only you see this)
          </label>
          <textarea
            id="note"
            className="field min-h-20"
            maxLength={300}
            value={note}
            placeholder="Met at the investor panel; follow up about the pilot."
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState({ kind: "idle" })}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {state.kind === "saved" && (
        <p className="rounded-2xl bg-success-soft p-3 text-center text-sm font-semibold text-success">
          Saved.{" "}
          <Link href="/dashboard/connections" className="underline">
            See your connections
          </Link>
        </p>
      )}

      {state.kind === "self" && (
        <p className="rounded-2xl bg-surface-2 p-3 text-center text-sm text-muted">
          This is your card.{" "}
          <Link href="/dashboard/profile" className="font-semibold text-ink underline">
            Edit it
          </Link>
        </p>
      )}

      {state.kind === "error" && (
        <p role="alert" className="rounded-2xl bg-danger-soft p-3 text-center text-sm font-semibold text-danger">
          {state.message}{" "}
          <button type="button" className="underline" onClick={() => setState({ kind: "idle" })}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
