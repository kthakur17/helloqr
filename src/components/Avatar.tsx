import { safeImageSrc } from "@/lib/safeImage";
import { ACCENT_HEX, type Accent } from "@/lib/types";

export { safeCoverSrc, safeImageSrc } from "@/lib/safeImage";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + last).toLocaleUpperCase();
}

export function Avatar({
  src,
  name,
  accent = "blue",
  className = "size-12 text-base",
  ring = false,
}: {
  src?: string;
  name: string;
  accent?: Accent;
  className?: string;
  ring?: boolean;
}) {
  const safe = safeImageSrc(src);
  return (
    <span className={`inline-block shrink-0 rounded-full ${ring ? "border border-line bg-surface p-1" : ""} ${className}`}>
      {safe ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URLs and provider avatars, no optimisation needed
        <img src={safe} alt="" referrerPolicy="no-referrer" className="size-full rounded-full bg-surface-2 object-cover" />
      ) : (
        <span
          className="grid size-full place-items-center rounded-full font-medium tracking-tight text-white"
          style={{ background: ACCENT_HEX[accent] ?? ACCENT_HEX.blue }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
