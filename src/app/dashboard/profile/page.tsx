"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { BrandChip } from "@/components/BrandIcon";
import { useAccount } from "@/components/dashboard/DashboardShell";
import { ProfileView } from "@/components/profile/ProfileView";
import { saveProfile } from "@/lib/data";
import { PhotoCropper } from "@/components/dashboard/PhotoCropper";
import { type Crop, coverFromCrop, photosFromCrop, photosFromUrl, sourceFromFile, sourceFromUrl } from "@/lib/image";
import { LINK_SPECS, LINK_TYPE_ORDER, newLinkId, normalizeLinkValue } from "@/lib/links";
import { ACCENT_HEX, ACCENT_LABEL, ACCENTS, type LinkItem, type LinkType, type Profile } from "@/lib/types";

const MAX_LINKS = 20;
const MAX_ROLES = 6;
const PHONE_RE = /^[+\d][\d\s()-]{5,29}$/;
const EMAIL_RE = /^[^\s@<>()"',;]+@[^\s@<>()"',;]+\.[^\s@<>()"',;]{2,}$/;

export default function ProfileEditorPage() {
  const { username, profile, user, setProfile } = useAccount();
  const [draft, setDraft] = useState<Profile>(profile);
  // Flag saved links that no longer pass the checks (e.g. a WhatsApp number saved without a country code).
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      profile.links
        .map((link) => [link.id, normalizeLinkValue(link.type, link.value).error] as const)
        .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
    ),
  );
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({ kind: "idle" });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cropping, setCropping] = useState<{ target: "photo" | "cover"; source: ImageBitmap; url: string; objectUrl: boolean } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [newType, setNewType] = useState<LinkType>("linkedin");
  const [dragId, setDragId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const focusId = useRef<string | null>(null);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(profile), [draft, profile]);

  useEffect(() => {
    if (!dirty) {
      return;
    }
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (focusId.current) {
      document.getElementById(`link-${focusId.current}`)?.focus();
      focusId.current = null;
    }
  }, [draft.links.length]);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus({ kind: "idle" });
  };

  const setLinks = (fn: (links: LinkItem[]) => LinkItem[]) => set("links", fn(draft.links));

  function addLink() {
    if (draft.links.length >= MAX_LINKS) {
      return;
    }
    const id = newLinkId();
    focusId.current = id;
    setLinks((links) => [...links, { id, type: newType, value: "", label: "" }]);
  }

  function updateLink(id: string, patch: Partial<LinkItem>) {
    setLinks((links) => links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function normalizeOne(link: LinkItem): LinkItem {
    const result = normalizeLinkValue(link.type, link.value);
    setLinkErrors((errs) => {
      const next = { ...errs };
      if (result.error) {
        next[link.id] = result.error;
      } else {
        delete next[link.id];
      }
      return next;
    });
    return result.value !== undefined ? { ...link, value: result.value } : link;
  }

  function move(id: string, delta: number) {
    setLinks((links) => {
      const i = links.findIndex((l) => l.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= links.length) {
        return links;
      }
      const next = [...links];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) {
      return;
    }
    setLinks((links) => {
      const from = links.findIndex((l) => l.id === dragId);
      const to = links.findIndex((l) => l.id === targetId);
      const next = [...links];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function closeCropper() {
    if (cropping) {
      cropping.source.close();
      if (cropping.objectUrl) {
        URL.revokeObjectURL(cropping.url);
      }
    }
    setCropping(null);
  }

  async function onImageFile(file: File | undefined, target: "photo" | "cover") {
    if (!file) {
      return;
    }
    setPhotoBusy(true);
    try {
      const source = await sourceFromFile(file);
      setCropping({ target, source, url: URL.createObjectURL(file), objectUrl: true });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Couldn't use that image." });
    } finally {
      setPhotoBusy(false);
      for (const input of [fileRef.current, coverRef.current]) {
        if (input) {
          input.value = "";
        }
      }
    }
  }

  async function adjustImage(target: "photo" | "cover") {
    const url = target === "photo" ? draft.photo : (draft.cover ?? "");
    setPhotoBusy(true);
    const source = await sourceFromUrl(url);
    setPhotoBusy(false);
    if (source) {
      setCropping({ target, source, url, objectUrl: false });
    } else {
      setStatus({ kind: "error", message: "Couldn't open this image for adjusting. Upload it again instead." });
    }
  }

  function applyCrop(crop: Crop) {
    if (!cropping) {
      return;
    }
    const patch = cropping.target === "photo" ? photosFromCrop(cropping.source, crop) : { cover: coverFromCrop(cropping.source, crop) };
    setDraft((d) => ({ ...d, ...patch }));
    setStatus({ kind: "idle" });
    closeCropper();
  }

  async function useProviderPhoto() {
    setPhotoBusy(true);
    const photos = await photosFromUrl(user.photoURL);
    setPhotoBusy(false);
    if (photos) {
      setDraft((d) => ({ ...d, ...photos }));
    } else {
      setStatus({ kind: "error", message: "Couldn't copy your sign-in photo. Upload one instead." });
    }
  }

  function validate(): { profile: Profile; problems: string[] } {
    const problems: string[] = [];
    const errs: Record<string, string> = {};
    const links = draft.links
      .map((link) => {
        const result = normalizeLinkValue(link.type, link.value);
        if (result.value === undefined) {
          errs[link.id] = result.error;
          return link;
        }
        return { ...link, value: result.value, label: link.label.trim().slice(0, 40) };
      });
    setLinkErrors(errs);
    if (Object.keys(errs).length) {
      problems.push("Fix the highlighted links (or remove empty ones).");
    }
    if (!draft.displayName.trim()) {
      problems.push("Your name can't be empty.");
    }
    if (draft.contactEmail && !EMAIL_RE.test(draft.contactEmail.trim())) {
      problems.push("The contact email doesn't look right.");
    }
    if (draft.contactPhone && !PHONE_RE.test(draft.contactPhone.trim())) {
      problems.push("The phone number should be digits, with the country code.");
    }
    return {
      problems,
      profile: {
        ...draft,
        displayName: draft.displayName.trim().slice(0, 60),
        headline: draft.headline.trim().slice(0, 120),
        bio: draft.bio.trim().slice(0, 400),
        roles: draft.roles.map((r) => r.trim().slice(0, 40)).filter(Boolean).slice(0, MAX_ROLES),
        links,
        contactEmail: draft.contactEmail.trim(),
        contactPhone: draft.contactPhone.trim(),
      },
    };
  }

  async function save() {
    const { profile: clean, problems } = validate();
    if (problems.length) {
      setStatus({ kind: "error", message: problems.join(" ") });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      const saved = { ...clean, updatedAt: Date.now() };
      await saveProfile(username, saved);
      setDraft(saved);
      setProfile(saved);
      setStatus({ kind: "saved" });
    } catch {
      setStatus({ kind: "error", message: "Couldn't save. Check your connection and try again." });
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Your card</h1>
            <p className="mt-1 text-muted">Everything here is public on your card, except where it says otherwise.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm lg:hidden" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? "Hide preview" : "Preview"}
          </button>
        </div>

        {showPreview && (
          <div className="rounded-2xl p-3 lg:hidden">
            <ProfileView profile={draft} username={username} preview />
          </div>
        )}

        <Section title="Photo">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar src={draft.photo} name={draft.displayName || "?"} accent={draft.accent} ring className="size-20 text-2xl" />
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" id="photo-file" onChange={(e) => onImageFile(e.target.files?.[0], "photo")} />
              <label htmlFor="photo-file" className="btn btn-ghost btn-sm cursor-pointer">
                {photoBusy ? "Working…" : "Upload photo"}
              </label>
              {user.photoURL && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={useProviderPhoto} disabled={photoBusy}>
                  Use sign-in photo
                </button>
              )}
              {draft.photo && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => adjustImage("photo")} disabled={photoBusy}>
                  Adjust
                </button>
              )}
              {draft.photo && (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setDraft((d) => ({ ...d, photo: "", thumb: "" }))}>
                  Remove
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-faint">
            After uploading, drag and zoom to frame your face. Adjust can only zoom further in; to zoom out, upload the original again.
            Without a photo, your initials are shown.
          </p>
        </Section>

        <Section title="Cover image">
          <div
            className="aspect-[3/1] w-full max-w-md overflow-hidden rounded-xl bg-cover bg-center"
            style={{
              backgroundImage: draft.cover
                ? `url("${draft.cover}")`
                : `linear-gradient(135deg, ${ACCENT_HEX[draft.accent] ?? ACCENT_HEX.blue}, color-mix(in srgb, ${ACCENT_HEX[draft.accent] ?? ACCENT_HEX.blue} 62%, #12121f))`,
            }}
            role="img"
            aria-label={draft.cover ? "Your cover image" : "No cover image: your accent colour is shown"}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <input ref={coverRef} type="file" accept="image/*" className="sr-only" id="cover-file" onChange={(e) => onImageFile(e.target.files?.[0], "cover")} />
            <label htmlFor="cover-file" className="btn btn-ghost btn-sm cursor-pointer">
              {photoBusy ? "Working…" : draft.cover ? "Change cover" : "Upload cover"}
            </label>
            {draft.cover && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => adjustImage("cover")} disabled={photoBusy}>
                Adjust
              </button>
            )}
            {draft.cover && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => set("cover", "")}>
                Remove
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-faint">
            The banner across the top of your card. A wide image works best (3:1, like 1500×500). Without one, your accent colour is shown.
          </p>
        </Section>

        {cropping && (
          <PhotoCropper
            key={cropping.target}
            source={cropping.source}
            previewUrl={cropping.url}
            onCancel={closeCropper}
            onApply={applyCrop}
            {...(cropping.target === "cover" ? { aspect: 3, title: "Position your cover", applyLabel: "Use cover" } : {})}
          />
        )}

        <Section title="About you">
          <Field id="p-name" label="Name">
            <input id="p-name" className="field" maxLength={60} value={draft.displayName} onChange={(e) => set("displayName", e.target.value)} />
          </Field>
          <Field id="p-headline" label="Headline" hint="One line under your name.">
            <input
              id="p-headline"
              className="field"
              maxLength={120}
              placeholder="e.g. Product Designer at Northwind"
              value={draft.headline}
              onChange={(e) => set("headline", e.target.value)}
            />
          </Field>
          <Field id="p-bio" label="Short bio" hint={`${draft.bio.length}/400`}>
            <textarea
              id="p-bio"
              className="field min-h-24"
              maxLength={400}
              placeholder="What you work on, what people can ask you about."
              value={draft.bio}
              onChange={(e) => set("bio", e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Roles & affiliations" subtitle="Shown as small tags, e.g. “Founder · Northwind”, “Advisor · Acme” or “Mentor · Startup programme”.">
          <div className="space-y-2">
            {draft.roles.map((role, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="field"
                  aria-label={`Role ${i + 1}`}
                  maxLength={40}
                  value={role}
                  onChange={(e) => set("roles", draft.roles.map((r, j) => (j === i ? e.target.value : r)))}
                />
                <IconButton label="Remove role" onClick={() => set("roles", draft.roles.filter((_, j) => j !== i))}>
                  <path d="M6 6l12 12M18 6 6 18" />
                </IconButton>
              </div>
            ))}
          </div>
          {draft.roles.length < MAX_ROLES && (
            <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => set("roles", [...draft.roles, ""])}>
              + Add role
            </button>
          )}
        </Section>

        <Section title="Links" subtitle="Paste a profile URL or type just the username. Drag or use the arrows to reorder; the top ones get tapped most.">
          {draft.links.length === 0 && <p className="text-sm text-muted">No links yet. Start with LinkedIn.</p>}
          <ul className="space-y-3">
            {draft.links.map((link, i) => {
              const spec = LINK_SPECS[link.type];
              const error = linkErrors[link.id];
              return (
                <li
                  key={link.id}
                  draggable={armedId === link.id}
                  onDragStart={() => setDragId(link.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setArmedId(null);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(link.id)}
                  className={`rounded-2xl border bg-surface p-3 transition ${dragId === link.id ? "opacity-50" : ""} ${
                    error ? "border-danger" : "border-line-soft"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 hidden cursor-grab text-faint sm:block"
                      aria-hidden="true"
                      onMouseDown={() => setArmedId(link.id)}
                      onMouseUp={() => setArmedId(null)}
                    >
                      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                        <circle cx="9" cy="6" r="1.5" />
                        <circle cx="15" cy="6" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" />
                        <circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="18" r="1.5" />
                        <circle cx="15" cy="18" r="1.5" />
                      </svg>
                    </span>
                    <BrandChip type={link.type} size="sm" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <label className="sr-only" htmlFor={`link-${link.id}`}>
                        {spec.label}
                      </label>
                      <input
                        id={`link-${link.id}`}
                        className="field"
                        placeholder={`${spec.label}: ${spec.placeholder}`}
                        value={link.value}
                        inputMode={link.type === "whatsapp" ? "tel" : link.type === "email" ? "email" : "url"}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        aria-invalid={!!error}
                        onChange={(e) => updateLink(link.id, { value: e.target.value })}
                        onBlur={() => link.value && updateLink(link.id, normalizeOne(link))}
                      />
                      {error && <p className="text-xs font-semibold text-danger">{error}</p>}
                      <input
                        className="field"
                        aria-label={`Title for ${spec.label}`}
                        placeholder={`Title (default: ${spec.label})`}
                        maxLength={40}
                        value={link.label}
                        onChange={(e) => updateLink(link.id, { label: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <IconButton label="Move up" disabled={i === 0} onClick={() => move(link.id, -1)}>
                        <path d="m6 15 6-6 6 6" />
                      </IconButton>
                      <IconButton label="Move down" disabled={i === draft.links.length - 1} onClick={() => move(link.id, 1)}>
                        <path d="m6 9 6 6 6-6" />
                      </IconButton>
                      <IconButton
                        label="Remove link"
                        onClick={() => {
                          setLinks((links) => links.filter((l) => l.id !== link.id));
                          setLinkErrors((errs) => Object.fromEntries(Object.entries(errs).filter(([id]) => id !== link.id)));
                        }}
                      >
                        <path d="M6 6l12 12M18 6 6 18" />
                      </IconButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {draft.links.length < MAX_LINKS ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <select className="field w-auto flex-1 sm:flex-none" aria-label="Link type" value={newType} onChange={(e) => setNewType(e.target.value as LinkType)}>
                {LINK_TYPE_ORDER.map((type) => (
                  <option key={type} value={type}>
                    {LINK_SPECS[type].label}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addLink}>
                + Add link
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">That&apos;s the maximum of {MAX_LINKS} links.</p>
          )}
        </Section>

        <Section
          title="Contact card"
          subtitle="Goes into the “Save contact” file so people can add you to their phone. Leave blank to keep private. Anything you enter here is public."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="p-email" label="Email">
              <input
                id="p-email"
                type="email"
                className="field"
                maxLength={120}
                placeholder={user.email ?? "you@example.com"}
                value={draft.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </Field>
            <Field id="p-phone" label="Phone">
              <input
                id="p-phone"
                type="tel"
                className="field"
                maxLength={30}
                placeholder="+91 98…"
                value={draft.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
            </Field>
          </div>
          <label className="flex cursor-pointer items-start gap-3 border-t border-line-soft pt-4">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-ink"
              checked={draft.acceptLeads !== false}
              onChange={(e) => set("acceptLeads", e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-ink">Let visitors share their details with you</span>
              <span className="block text-xs text-muted">
                Adds a “Share your details” button to your card. What people send appears in Connections → Shared with you.
              </span>
            </span>
          </label>
        </Section>

        <Section title="Accent colour" subtitle="Used for the Save contact button and your initials if you have no photo.">
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Accent colour">
            {ACCENTS.map((accent) => (
              <button
                key={accent}
                type="button"
                role="radio"
                aria-checked={draft.accent === accent}
                aria-label={ACCENT_LABEL[accent]}
                title={ACCENT_LABEL[accent]}
                onClick={() => set("accent", accent)}
                className={`size-10 rounded-full border-4 transition ${draft.accent === accent ? "scale-110 border-ink" : "border-surface"}`}
                style={{ background: ACCENT_HEX[accent] }}
              />
            ))}
          </div>
        </Section>

        <div className="sticky bottom-0 z-20 -mx-4 border-t border-line-soft bg-bg/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm" aria-live="polite">
              {status.kind === "saving" && <span className="text-muted">Saving…</span>}
              {status.kind === "saved" && <span className="font-semibold text-success">Saved. Your card is live.</span>}
              {status.kind === "error" && <span className="font-semibold text-danger">{status.message}</span>}
              {status.kind === "idle" && <span className="text-muted">{dirty ? "Unsaved changes" : "All changes saved"}</span>}
            </p>
            <div className="flex gap-2">
              {dirty && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setDraft(profile);
                    setLinkErrors({});
                    setStatus({ kind: "idle" });
                  }}
                >
                  Discard
                </button>
              )}
              <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || status.kind === "saving"} onClick={save}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-32">
          <p className="eyebrow mb-3 text-muted">Live preview</p>
          <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto rounded-2xl p-4">
            <ProfileView profile={draft} username={username} preview />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label className="label" htmlFor={id}>
          {label}
        </label>
        {hint && <span className="text-xs text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 shrink-0 place-items-center rounded-xl border border-line-soft bg-surface text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
