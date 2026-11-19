"use client";

import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { safeNext, useAuth } from "@/components/auth/AuthProvider";
import { legal } from "@/content/site";
import { Avatar } from "@/components/Avatar";
import { LogoMark } from "@/components/Logo";
import { claimUsername, isUsernameTaken } from "@/lib/data";
import { photosFromUrl } from "@/lib/image";
import type { Profile } from "@/lib/types";
import { suggestUsername, usernameProblem } from "@/lib/username";

type Availability = "idle" | "checking" | "free" | "taken" | "error";

export function Onboarding({ user }: { user: User }) {
  const { refresh, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [username, setUsername] = useState(() => suggestUsername(user.displayName ?? "", user.email));
  const [headline, setHeadline] = useState("");
  const [checked, setChecked] = useState<{ name: string; result: "free" | "taken" | "error" } | null>(null);
  const [photos, setPhotos] = useState<{ photo: string; thumb: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const checkId = useRef(0);

  useEffect(() => {
    void photosFromUrl(user.photoURL).then(setPhotos);
  }, [user.photoURL]);

  const problem = username ? usernameProblem(username) : "Pick a username.";
  const availability: Availability = problem ? "idle" : checked?.name === username ? checked.result : "checking";

  useEffect(() => {
    if (problem) {
      return;
    }
    const id = ++checkId.current;
    const timer = setTimeout(async () => {
      let result: "free" | "taken" | "error";
      try {
        result = (await isUsernameTaken(username)) ? "taken" : "free";
      } catch {
        result = "error";
      }
      if (id === checkId.current) {
        setChecked({ name: username, result });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [username, problem]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (problem || availability === "taken" || !displayName.trim()) {
      return;
    }
    setBusy(true);
    setError("");
    const now = Date.now();
    // Fall back to the provider URL when its host refused to let us copy the image.
    const fallback = user.photoURL && /^https:\/\//.test(user.photoURL) && user.photoURL.length < 2000 ? user.photoURL : "";
    const profile: Profile = {
      uid: user.uid,
      displayName: displayName.trim().slice(0, 60),
      headline: headline.trim().slice(0, 120),
      bio: "",
      photo: photos?.photo ?? fallback,
      thumb: photos?.thumb ?? fallback,
      roles: [],
      links: [],
      accent: "blue",
      contactEmail: "",
      contactPhone: "",
      createdAt: now,
      updatedAt: now,
    };
    try {
      await claimUsername(user.uid, username, profile);
      // Came here from an event's "create your card to join": go straight back to it.
      const next = new URLSearchParams(window.location.search).get("next");
      if (next) {
        window.location.replace(safeNext(next));
        return;
      }
      await refresh();
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(
        code === "permission-denied"
          ? "That username was just taken, or this account already has a card. Try another name."
          : "Couldn't create your card. Check your connection and try again.",
      );
      setChecked({ name: username, result: "taken" });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel mx-auto w-full max-w-lg p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <LogoMark size={36} />
        <p className="eyebrow text-muted">Step 1 of 1</p>
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">Claim your HelloQR link</h1>
      <p className="mt-2 text-sm text-muted">This is the address your QR code points to. It can&apos;t be changed later, so pick one you&apos;ll keep.</p>

      <div className="mt-6 flex items-center gap-4">
        <Avatar src={photos?.photo ?? user.photoURL ?? ""} name={displayName || "?"} ring className="size-16 text-xl" />
        <p className="text-sm text-muted">You can change your photo and add your links on the next screen.</p>
      </div>

      <label className="label mt-6" htmlFor="ob-name">
        Your name
      </label>
      <input id="ob-name" className="field" required maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />

      <label className="label mt-4" htmlFor="ob-username">
        Username
      </label>
      <div className="flex items-stretch overflow-hidden rounded-[0.875rem] border border-line bg-bg focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgb(66_133_244/0.18)]">
        <span className="flex max-w-[55%] items-center truncate border-r border-line-soft bg-surface-2 px-3 text-sm font-semibold text-muted">
          {window.location.host}/
        </span>
        <input
          id="ob-username"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-semibold text-ink outline-none"
          value={username}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          aria-describedby="ob-username-status"
        />
      </div>
      <p id="ob-username-status" className="mt-1.5 min-h-5 text-sm" aria-live="polite">
        {problem ? (
          <span className="text-muted">{problem}</span>
        ) : availability === "checking" ? (
          <span className="text-muted">Checking…</span>
        ) : availability === "free" ? (
          <span className="font-semibold text-success">Available</span>
        ) : availability === "taken" ? (
          <span className="font-semibold text-danger">Taken. Try another.</span>
        ) : availability === "error" ? (
          <span className="text-warn">Couldn&apos;t check right now. You can still try.</span>
        ) : null}
      </p>

      <label className="label mt-3" htmlFor="ob-headline">
        Headline <span className="font-medium text-muted">(optional)</span>
      </label>
      <input
        id="ob-headline"
        className="field"
        maxLength={120}
        placeholder="Founder & CEO, Northwind"
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
      />

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <p className="mt-5 text-xs text-muted">
        By creating a card you confirm you&apos;re {legal.minimumAge} or older and agree to the{" "}
        <Link href="/terms" target="_blank" className="underline hover:text-ink">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" target="_blank" className="underline hover:text-ink">
          Privacy Policy
        </Link>
        . Your card is public to anyone with your link; you can delete it any time.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => logout()} className="text-sm font-semibold text-muted hover:text-ink">
          Use a different account
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !!problem || availability === "taken" || availability === "checking" || !displayName.trim()}
        >
          {busy ? "Creating…" : "Create my card"}
        </button>
      </div>
    </form>
  );
}
