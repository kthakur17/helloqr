export function StatTile({ label, value, hint, tone = "default" }: { label: string; value: number | null; hint: string; tone?: "default" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div className={`flex min-h-40 flex-col justify-between gap-4 p-6 ${dark ? "rounded-[1.25rem] bg-ink text-bg" : "panel"}`}>
      <p className={`text-[0.8rem] font-medium tracking-[0.03em] uppercase ${dark ? "opacity-60" : "text-muted"}`}>{label}</p>
      <div>
        {value === null ? (
          <div className={`h-10 w-20 rounded-xl ${dark ? "bg-white/10" : "skeleton"}`} />
        ) : (
          <p className={`font-display text-[2.75rem] leading-none font-extrabold tracking-[-0.03em] tabular-nums ${dark ? "" : "text-ink"}`}>
            {value.toLocaleString("en-IN")}
          </p>
        )}
        <p className={`mt-2 text-xs ${dark ? "opacity-60" : "text-faint"}`}>{hint}</p>
      </div>
    </div>
  );
}
