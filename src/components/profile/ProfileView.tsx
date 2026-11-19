import Link from "next/link";
import type { CSSProperties } from "react";
import { Avatar } from "@/components/Avatar";
import { BrandChip } from "@/components/BrandIcon";
import { LogoMark } from "@/components/Logo";
import { owner } from "@/content/site";
import { displayValue, hrefFor, linkTitle } from "@/lib/links";
import { ACCENT_HEX, type Profile } from "@/lib/types";
import { ShareButton, TrackedLink } from "./ProfileActions";

/** The owner's accent tints only the card's primary button. */
export function accentStyle(accent: Profile["accent"]): CSSProperties {
  const hex = ACCENT_HEX[accent] ?? ACCENT_HEX.blue;
  return { "--accent": hex, "--accent-hover": hex, "--accent-ink": "#ffffff" } as CSSProperties;
}

/**
 * The card people see after scanning. Rendered on the server for the public page and on the
 * client as the editor's live preview, where `preview` turns off tracking and the extra actions.
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
  const links = profile.links.map((link) => ({ link, href: hrefFor(link) })).filter((l) => l.href !== null);
  return (
    <article className="panel mx-auto w-full max-w-md overflow-hidden" style={accentStyle(profile.accent)}>
      <header className="px-6 pt-10 pb-6 text-center sm:px-8">
        <Avatar src={profile.photo} name={profile.displayName} accent={profile.accent} ring className="mx-auto size-24 text-2xl" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">{profile.displayName}</h1>
        {profile.headline && <p className="mt-1 text-[0.95rem] text-muted">{profile.headline}</p>}
        {profile.roles.length > 0 && (
          <ul className="mt-4 flex flex-wrap justify-center gap-1.5">
            {profile.roles.map((role, i) => (
              <li key={`${i}-${role}`} className="rounded-md border border-line px-2 py-0.5 text-xs text-text">
                {role}
              </li>
            ))}
          </ul>
        )}
        {profile.bio && <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed whitespace-pre-line text-text">{profile.bio}</p>}
        <div className="mt-6 grid grid-cols-2 gap-2">
          {preview ? (
            <span className="btn btn-primary">Save contact</span>
          ) : (
            <a href={`/${username}/vcard`} className="btn btn-primary">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Save contact
            </a>
          )}
          {preview ? (
            <span className="btn btn-ghost">Share</span>
          ) : (
            <ShareButton title={`${profile.displayName} · HelloQR`} username={username} />
          )}
        </div>
      </header>

      {links.length > 0 ? (
        <ul className="divide-y divide-line-soft border-t border-line-soft">
          {links.map(({ link, href }) => (
            <li key={link.id}>
              <TrackedLink
                href={href!}
                username={username}
                linkId={link.id}
                preview={preview}
                className="group flex items-center gap-3.5 px-6 py-3.5 transition-colors hover:bg-surface-2 sm:px-8"
              >
                <BrandChip type={link.type} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{linkTitle(link)}</span>
                  <span className="block truncate text-sm text-muted">{displayValue(link)}</span>
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className="size-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </TrackedLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-line-soft px-6 py-6 text-center text-sm text-muted">No links yet.</p>
      )}

      {children}

      <footer className="flex justify-center border-t border-line-soft px-6 py-3.5">
        {preview ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-faint">
            <LogoMark size={14} /> HelloQR
          </span>
        ) : (
          <span className="flex items-center gap-4 text-xs text-faint">
            <Link href="/" className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
              <LogoMark size={14} /> Create your own on HelloQR
            </Link>
            <a
              href={`mailto:${owner.email}?subject=${encodeURIComponent(`HelloQR report: /${username}`)}`}
              className="transition-colors hover:text-ink"
            >
              Report
            </a>
          </span>
        )}
      </footer>
    </article>
  );
}
