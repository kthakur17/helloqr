"use client";

import { useState } from "react";
import { FEEDBACK_KINDS, FEEDBACK_LABEL, type FeedbackKind, validateFeedback } from "@/lib/feedback";

export function FeedbackForm() {
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [startedAt] = useState(() => Date.now());
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // The page someone came from (same site only) gives a problem report its context.
    const from = document.referrer && new URL(document.referrer).origin === window.location.origin ? new URL(document.referrer).pathname : "";
    const payload = { kind, message, email, page: from };
    const check = validateFeedback(payload, Date.now());
    if (check.error) {
      setError(check.error);
      return;
    }
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, website, t: startedAt }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't send right now. Please try again.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("No connection. Check your internet and try again.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="panel flex flex-col items-center justify-center gap-3 p-10 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-success-soft text-success">
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 className="text-2xl font-bold text-ink">Thank you</h2>
        <p className="max-w-sm text-muted">{email ? "Got it. You'll hear back by email if there's a question." : "Got it. Every message is read."}</p>
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-2"
          onClick={() => {
            setKind(null);
            setMessage("");
            setState("idle");
          }}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="panel space-y-6 p-6 sm:p-8" noValidate>
      <fieldset>
        <legend className="label">What&apos;s it about?</legend>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FEEDBACK_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                kind === k ? "border-ink bg-ink text-bg" : "border-line text-ink hover:bg-surface-2"
              }`}
            >
              {FEEDBACK_LABEL[k]}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between">
          <label className="label" htmlFor="fb-message">
            Your message
          </label>
          <span className="text-xs text-faint">{message.length}/2000</span>
        </div>
        <textarea
          id="fb-message"
          className="field min-h-40"
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            kind === "problem"
              ? "What happened, on which page, and what did you expect?"
              : kind === "idea"
                ? "What would make HelloQR more useful for you?"
                : "Tell us anything…"
          }
        />
      </div>

      <div>
        <label className="label" htmlFor="fb-email">
          Email <span className="font-normal text-muted">(optional, if you&apos;d like a reply)</span>
        </label>
        <input id="fb-email" type="email" className="field" maxLength={120} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      {/* Hidden from people, filled in by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden="true" />

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
