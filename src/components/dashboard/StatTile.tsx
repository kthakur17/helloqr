export function StatTile({ label, value, hint }: { label: string; value: number | null; hint: string }) {
  return (
    <div className="panel p-5">
      <p className="text-sm text-muted">{label}</p>
      {value === null ? (
        <div className="skeleton mt-2 h-9 w-20" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-ink">{value.toLocaleString("en-IN")}</p>
      )}
      <p className="mt-1 text-xs text-faint">{hint}</p>
    </div>
  );
}
