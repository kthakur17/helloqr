import { brandPaths } from "@/lib/brandPaths";
import type { LinkType } from "@/lib/types";

function OwnGlyph({ type }: { type: LinkType }) {
  switch (type) {
    case "linkedin":
      // A neutral "in" mark: LinkedIn's own logo isn't in simple-icons.
      return (
        <g>
          <rect x="3" y="3" width="18" height="18" rx="3.5" fill="currentColor" />
          <text x="12" y="16.6" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="11" className="fill-surface-2">
            in
          </text>
        </g>
      );
    case "email":
      return (
        <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
          <path d="m4.5 7.5 7.5 5.5 7.5-5.5" strokeLinecap="round" />
        </g>
      );
    case "website":
      return (
        <g fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5s1.2-6.1 3.6-8.5Z" />
        </g>
      );
    default:
      return (
        <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
          <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
        </g>
      );
  }
}

export function BrandIcon({ type, className = "size-5" }: { type: LinkType; className?: string }) {
  const brand = brandPaths[type];
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {brand ? (
        <g transform="translate(3 3) scale(0.75)">
          <path d={brand.path} fill="currentColor" />
        </g>
      ) : (
        <OwnGlyph type={type} />
      )}
    </svg>
  );
}

/** Monochrome icon tile: the brand is recognisable by shape, the card stays calm. */
export function BrandChip({ type, size = "md" }: { type: LinkType; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-8 rounded-lg" : "size-10 rounded-[0.7rem]";
  const icon = size === "sm" ? "size-4" : "size-5";
  return (
    <span className={`grid shrink-0 place-items-center bg-surface-2 text-ink ${box}`}>
      <BrandIcon type={type} className={icon} />
    </span>
  );
}
