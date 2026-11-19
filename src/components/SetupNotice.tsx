export function SetupNotice() {
  return (
    <div className="panel mx-auto max-w-lg p-6">
      <p className="eyebrow text-warn">Setup needed</p>
      <h2 className="mt-2 text-xl font-semibold text-ink">HelloQR isn&apos;t connected to Firebase yet</h2>
      <p className="mt-2 text-sm text-muted">
        Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code>, fill in the
        Firebase web app values, and restart the dev server. The README walks through creating the project.
      </p>
    </div>
  );
}
