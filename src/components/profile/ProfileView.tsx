import Link from "next/link";
import type { CSSProperties } from "react";
import { Avatar } from "@/components/Avatar";
import { BrandChip, brandTileColor } from "@/components/BrandIcon";
import { LogoMark } from "@/components/Logo";
import { owner } from "@/content/site";
import { displayValue, hrefFor, linkTitle } from "@/lib/links";
import { ACCENT_HEX, type LinkItem, type Profile } from "@/lib/types";
import { ShareButton, TrackedLink } from "./ProfileActions";

/** The owner's accent tints only the card's primary button. */
export function accentStyle(accent: Profile["accent"]): CSSProperties {
  const hex = ACCENT_HEX[accent] ?? ACCENT_HEX.blue;
  return { "--accent": hex, "--accent-hover": hex, "--accent-ink": "#ffffff" } as CSSProperties;
}

function Arrow({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The card people see after scanning, as a bento grid: an identity tile, then one tile per link,
 * the first one large and in its brand colour. Layout follows the container's width (not the
 * screen's), so the same component works full-page and as the editor's narrow live preview.
 */
export function ProfileView({
  profile,
  username,
  preview = false,
  children,
}: {
  profile: Profile;
  username: string;
  preview?: boolean;
  children?: React.ReactNode;
}) {
  const links = profile.links.map((link) => ({ link, href: hrefFor(link) })).filter((l): l is { link: LinkItem; href: string } => l.href !== null);
  const [featured, ...rest] = links;

  return (
    <article className="@container mx-auto w-full max-w-5xl" style={accentStyle(profile.accent)}>
      <div className="grid gap-3 @3xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] @3xl:items-start @3xl:gap-4">
        <header className="panel p-6 text-center @3xl:sticky @3xl:top-6 @3xl:p-8 @3xl:text-left">
          <Avatar src={profile.photo} name={profile.displayName} accent={profile.accent} className="mx-auto size-24 text-2xl @3xl:mx-0 @3xl:size-28" />
          <h1 className="mt-5 text-[1.75rem] font-extrabold tracking-[-0.03em] text-ink">{profile.displayName}</h1>
          {profile.headline && <p className="mt-1 text-[0.95rem] text-muted">{profile.headline}</p>}
          {profile.roles.length > 0 && (
            <ul className="mt-4 flex flex-wrap justify-center gap-1.5 @3xl:justify-start">
              {profile.roles.map((role, i) => (
                <li key={`${i}-${role}`} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text">
                  {role}
                </li>
              ))}
            </ul>
          )}
          {profile.bio && <p className="mt-5 text-sm leading-relaxed whitespace-pre-line text-text">{profile.bio}</p>}
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-2 [&>*]:px-4">
            {preview ? (
              <span className="btn btn-primary">Save contact</span>
            ) : (
              <a href={`/${username}/vcard`} className="btn btn-primary">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Save contact
              </a>
            )}
            {preview ? <span className="btn btn-ghost">Share</span> : <ShareButton title={`${profile.displayName} · HelloQR`} username={username} />}
          </div>
        </header>

        <div className="grid grid-cols-2 content-start gap-3 @xl:grid-cols-3 @3xl:gap-4">
          {featured ? (
            <TrackedLink
              href={featured.href}
              username={username}
              linkId={featured.link.id}
              preview={preview}
              className="tile-hover group col-span-2 flex min-h-36 flex-col justify-between rounded-[1.25rem] p-5 text-white shadow-[var(--tile-shadow)] @xl:min-h-44"
              style={{ background: brandTileColor(featured.link.type) }}
            >
              <span className="flex items-start justify-between">
                <BrandChip type={featured.link.type} tone="inverse" />
                <Arrow className="size-5 text-white/70 transition group-hover:translate-x-0.5 group-hover:text-white" />
              </span>
              <span className="block min-w-0">
                <span className="block truncate font-display text-lg font-bold tracking-[-0.02em]">{linkTitle(featured.link)}</span>
                <span className="block truncate text-sm text-white/75">{displayValue(featured.link)}</span>
              </span>
            </TrackedLink>
          ) : (
            <p className="panel col-span-full p-6 text-center text-sm text-muted">No links yet.</p>
          )}

          {rest.map(({ link, href }) => (
            <TrackedLink
              key={link.id}
              href={href}
              username={username}
              linkId={link.id}
              preview={preview}
              className="panel tile-hover group flex min-h-36 min-w-0 flex-col justify-between p-4 @xl:min-h-44 @xl:p-5"
            >
              <span className="flex items-start justify-between">
                <BrandChip type={link.type} tone="brand" />
                <Arrow className="size-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </span>
              <span className="block min-w-0">
                <span className="block truncate font-semibold text-ink">{linkTitle(link)}</span>
                <span className="block truncate text-sm text-muted">{displayValue(link)}</span>
              </span>
            </TrackedLink>
          ))}

          {children && <div className="panel col-span-full space-y-3 p-4 @xl:p-5">{children}</div>}

          <footer className="col-span-full flex justify-center pt-2 pb-1">
            {preview ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-faint">
                <LogoMark size={14} /> HelloQR
              </span>
            ) : (
              <span className="flex items-center gap-4 text-xs text-faint">
                <Link href="/" className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
                  <LogoMark size={14} /> Create your own on HelloQR
                </Link>
                <a href={`mailto:${owner.email}?subject=${encodeURIComponent(`HelloQR report: /${username}`)}`} className="transition-colors hover:text-ink">
                  Report
                </a>
              </span>
            )}
          </footer>
        </div>
      </div>
    </article>
  );
}
