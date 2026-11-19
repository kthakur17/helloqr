export function StatTile({ label, value, hint }: { label: string; value: number | null; hint: string }) {
  return (
    <div className="panel flex flex-col justify-between gap-4 p-6">
      <p className="text-[0.8rem] font-medium tracking-[0.03em] text-muted uppercase">{label}</p>
      <div>
        {value === null ? (
          <div className="skeleton h-10 w-20" />
        ) : (
          <p className="font-display text-[2.5rem] leading-none font-extrabold tracking-[-0.03em] text-ink tabular-nums">
            {value.toLocaleString("en-IN")}
          </p>
        )}
        <p className="mt-2 text-xs text-faint">{hint}</p>
      </div>
    </div>
  );
}
