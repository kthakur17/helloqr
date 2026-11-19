import Link from "next/link";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="7" className="fill-ink" />
      <rect x="7" y="7" width="5.5" height="5.5" rx="1.2" className="fill-bg" />
      <rect x="15.5" y="7" width="5.5" height="5.5" rx="1.2" className="fill-bg" />
      <rect x="7" y="15.5" width="5.5" height="5.5" rx="1.2" className="fill-bg" />
      <rect x="15.5" y="15.5" width="2.5" height="2.5" rx="0.6" className="fill-bg" />
      <rect x="18.5" y="18.5" width="2.5" height="2.5" rx="0.6" className="fill-bg" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-ink">
      <LogoMark />
      <span className="text-[0.95rem] font-semibold tracking-tight">HelloQR</span>
    </Link>
  );
}
