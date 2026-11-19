"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { validateLead } from "@/lib/lead";

type State = "closed" | "open" | "sending" | "sent";

/** Lets someone without a HelloQR account send their own details to the card owner. */
export function ShareBack({ username, firstName }: { username: string; firstName: string }) {
  const [state, setState] = useState<State>("closed");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", linkedin: "", note: "", website: "" });
  const openedAt = useRef(0);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const check = validateLead(form, Date.now());
    if (check.error) {
      setError(check.error);
      return;
    }
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ u: username, t: openedAt.current, ...form }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't send right now. Please try again.");
        setState("open");
        return;
      }
      setState("sent");
    } catch {
      setError("No connection. Check your internet and try again.");
      setState("open");
    }
  }

  if (state === "sent") {
    return (
      <div className="px-6 pb-4 sm:px-8">
        <p className="rounded-xl bg-success-soft p-3 text-center text-sm font-medium text-success">
          Sent. {firstName} now has your details.
        </p>
      </div>
    );
  }

  if (state === "closed") {
    return (
      <div className="px-6 pb-3 sm:px-8">
        <button
          type="button"
          onClick={() => {
            openedAt.current = Date.now();
            setState("open");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-line p-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 12h12m0 0-4-4m4 4-4 4M20 5v14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Share your details with {firstName}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-6 mb-4 rounded-xl border border-line p-4 sm:mx-8" noValidate>
      <p className="font-medium text-ink">Share your details with {firstName}</p>
      <p className="mt-0.5 text-xs text-muted">Only {firstName} will see them.</p>

      <div className="mt-4 space-y-3">
        <Input id="sb-name" label="Name" required value={form.name} onChange={set("name")} autoComplete="name" maxLength={80} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input id="sb-email" label="Email" type="email" value={form.email} onChange={set("email")} autoComplete="email" maxLength={120} />
          <Input id="sb-phone" label="Phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" maxLength={30} />
        </div>
        <Input id="sb-company" label="Company or role" value={form.company} onChange={set("company")} autoComplete="organization" maxLength={80} />
        <Input id="sb-linkedin" label="LinkedIn" value={form.linkedin} onChange={set("linkedin")} placeholder="Profile link or ID" maxLength={200} />
        <div>
          <label className="label" htmlFor="sb-note">
            Note <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea id="sb-note" className="field min-h-16" maxLength={500} value={form.note} onChange={set("note")} placeholder="Where we met, what you'd like to talk about…" />
        </div>
        {/* Hidden from people, filled in by bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} className="hidden" aria-hidden="true" />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState("closed")}>
          Cancel
        </button>
      </div>
      <p className="mt-3 text-xs text-faint">
        An email or a phone number is needed. Your details are stored in {firstName}&apos;s HelloQR account.{" "}
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
      </p>
    </form>
  );
}

function Input({ id, label, required, ...rest }: { id: string; label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label} {!required && <span className="font-normal text-muted">(optional)</span>}
      </label>
      <input id={id} className="field" required={required} {...rest} />
    </div>
  );
}
