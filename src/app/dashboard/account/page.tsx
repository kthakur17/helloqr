"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "@/components/dashboard/DashboardShell";
import { downloadBlob } from "@/lib/cards";

export default function AccountPage() {
  const { user, username, profile } = useAccount();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const provider = user.providerData[0]?.providerId === "github.com" ? "GitHub" : "Google";

  async function download() {
    setExporting(true);
    setExportError("");
    try {
      const { exportAccount } = await import("@/lib/account");
      const data = await exportAccount(user, username, profile);
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `helloqr-${username}-data.json`);
    } catch {
      setExportError("Couldn't prepare your data. Check your connection and try again.");
    } finally {
      setExporting(false);
    }
  }

  async function remove() {
    if (confirmText.trim().toLowerCase() !== username) {
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      const { confirmIdentity, deleteAccount } = await import("@/lib/account");
      setStep(`Confirm with ${provider}`);
      await confirmIdentity(user);
      await deleteAccount(user, username, setStep);
      window.alert("Your HelloQR account and data have been deleted.");
      window.location.replace("/");
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setDeleteError(
        code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request"
          ? "Deletion cancelled. Nothing was deleted."
          : code === "auth/user-mismatch"
            ? `Please confirm with the same ${provider} account you signed in with.`
            : "Deletion stopped part-way. Try again; it picks up where it left off.",
      );
      setDeleting(false);
      setStep("");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Account</h1>
        <p className="mt-1 text-muted">Your sign-in, your data, and how to leave.</p>
      </div>

      <section className="panel p-5 sm:p-6">
        <h2 className="font-semibold text-ink">Sign-in</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[140px_1fr]">
          <dt className="text-muted">Signed in with</dt>
          <dd className="text-ink">{provider}</dd>
          <dt className="text-muted">Email</dt>
          <dd className="break-all text-ink">{user.email}</dd>
          <dt className="text-muted">Your link</dt>
          <dd className="text-ink">
            {window.location.host}/{username}
          </dd>
        </dl>
        <p className="mt-4 text-sm text-muted">
          From {provider}, HelloQR only receives your name, email address and profile photo. It can&apos;t read your email, contacts or
          files, and it never sees your password. Your email is not shown on your card unless you add it yourself.
        </p>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="font-semibold text-ink">Download your data</h2>
        <p className="mt-1 text-sm text-muted">
          A JSON file with your card, its stats, the people you saved and the events you joined or organised.
        </p>
        <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={download} disabled={exporting}>
          {exporting ? "Preparing…" : "Download my data"}
        </button>
        {exportError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {exportError}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-danger/40 p-5 sm:p-6">
        <h2 className="font-semibold text-danger">Delete account</h2>
        <p className="mt-1 text-sm text-text">This permanently deletes, straight away:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text">
          <li>your card, photo, links and stats</li>
          <li>the people you saved and your notes</li>
          <li>your place in every event you joined, and every event you organised (with its attendee list)</li>
          <li>your sign-in</li>
        </ul>
        <p className="mt-3 text-sm text-muted">
          Your link <span className="font-medium text-ink">{window.location.host}/{username}</span> stops working and is never given to
          anyone else. If someone saved your card, their private copy (name, headline and small photo) stays in their list until they
          remove it, like a contact in their phone.
        </p>
        <label className="label mt-5" htmlFor="confirm-delete">
          Type <span className="font-mono">{username}</span> to confirm
        </label>
        <input
          id="confirm-delete"
          className="field max-w-xs"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={deleting}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-sm bg-danger text-white hover:opacity-90"
            disabled={deleting || confirmText.trim().toLowerCase() !== username}
            onClick={remove}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
          {step && (
            <span className="text-sm text-muted" aria-live="polite">
              {step}…
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-faint">You&apos;ll be asked to confirm with {provider} first.</p>
        {deleteError && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {deleteError}
          </p>
        )}
      </section>

      <p className="text-sm text-muted">
        Read the{" "}
        <Link href="/privacy" className="text-ink underline">
          privacy policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="text-ink underline">
          terms
        </Link>
        , or{" "}
        <Link href="/about" className="text-ink underline">
          contact us
        </Link>
        .
      </p>
    </div>
  );
}
