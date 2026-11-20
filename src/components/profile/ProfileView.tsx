import Link from "next/link";
import { type CSSProperties, Fragment } from "react";
import { Avatar, safeCoverSrc } from "@/components/Avatar";
import { BrandChip } from "@/components/BrandIcon";
import { LogoMark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { owner } from "@/content/site";
import { headlineSegments } from "@/lib/headline";
import { displayValue, hrefFor, linkTitle } from "@/lib/links";
import { ACCENT_HEX, type LinkItem, type Profile } from "@/lib/types";
import { ShareButton, TrackedLink } from "./ProfileActions";

/** The owner's accent colours the header band and the primary button. */
export function accentStyle(accent: Profile["accent"]): CSSProperties {
  const hex = ACCENT_HEX[accent] ?? ACCENT_HEX.blue;
  return { "--accent": hex, "--accent-hover": hex, "--accent-ink": "#ffffff" } as CSSProperties;
}

/** Keeps each item of a list-style headline (and the separator after it) on one line, so breaks fall between items. */
function headlineNodes(headline: string): React.ReactNode {
  const segs = headlineSegments(headline);
  if (segs.length < 2 || segs.some((s) => s.text.length > 40)) {
    return headline;
  }
  return segs.map((s, i) => (
    <Fragment key={i}>
      <span className="whitespace-nowrap">{s.text + s.sep.trimEnd()}</span>
      {s.sep ? " " : null}
    </Fragment>
  ));
}

/**
 * The card people see after scanning: one card, not a grid of boxes. An accent header band with
 * the photo overlapping its edge, the person's details, then their links as a single list.
 * Rendered on the server for the public page and on the client as the editor's live preview,
 * where `preview` turns off tracking and the extra actions.
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
  const cover = safeCoverSrc(profile.cover);
  const links = profile.links.map((link) => ({ link, href: hrefFor(link) })).filter((l): l is { link: LinkItem; href: string } => l.href !== null);

  return (
    <article className="@container mx-auto w-full max-w-xl" style={accentStyle(profile.accent)}>
      <div className="overflow-hidden rounded-[1.75rem] bg-surface shadow-[var(--tile-shadow)]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- stored data URL, nothing for next/image to optimise
          <img src={cover} alt="" className="block aspect-[3/1] w-full bg-surface-2 object-cover" />
        ) : (
          <div
            aria-hidden="true"
            className="h-28 @md:h-36"
            style={{
              background:
                "radial-gradient(120% 140% at 100% 0%, rgb(255 255 255 / 0.28), transparent 55%), linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 62%, #12121f))",
            }}
          />
        )}

        <header className="px-6 pb-7 @md:px-9">
          <Avatar
            src={profile.photo}
            name={profile.displayName}
            accent={profile.accent}
            className="relative -mt-14 size-28 border-[5px] border-surface text-3xl @md:-mt-16 @md:size-32"
          />
          <h1 className="mt-4 text-[1.85rem] leading-tight font-extrabold tracking-[-0.03em] text-ink @md:text-[2.1rem]">{profile.displayName}</h1>
          {profile.headline && <p className="mt-1.5 text-[0.98rem] text-balance text-muted">{headlineNodes(profile.headline)}</p>}
          {profile.roles.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {profile.roles.map((role, i) => (
                <li key={`${i}-${role}`} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-text">
                  {role}
                </li>
              ))}
            </ul>
          )}
          {profile.bio && <p className="mt-5 text-[0.95rem] leading-relaxed whitespace-pre-line text-text">{profile.bio}</p>}
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
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

        {links.length > 0 ? (
          <ul className="border-t border-line-soft py-2">
            {links.map(({ link, href }) => (
              <li key={link.id}>
                <TrackedLink
                  href={href}
                  username={username}
                  linkId={link.id}
                  preview={preview}
                  className="group mx-2 flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors hover:bg-surface-2 @md:mx-3 @md:px-6"
                >
                  <BrandChip type={link.type} tone="brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{linkTitle(link)}</span>
                    <span className="block truncate text-sm text-muted">{displayValue(link)}</span>
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className="size-5 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </TrackedLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-line-soft px-6 py-6 text-center text-sm text-muted">No links yet.</p>
        )}

        {children && <div className="space-y-3 border-t border-line-soft px-6 py-5 @md:px-9">{children}</div>}
      </div>

      <footer className="flex justify-center pt-5 pb-1">
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
            <ThemeToggle className="-my-2" />
          </span>
        )}
      </footer>
    </article>
  );
}
