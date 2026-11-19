"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/components/Avatar";
import { useAccount } from "@/components/dashboard/DashboardShell";
import {
  type CardStyle,
  downloadBlob,
  downloadCanvas,
  loadCardFonts,
  loadImage,
  type PersonCard,
  type PhotoPosition,
  type PhotoSize,
  renderPocketAurora,
  renderPocketBento,
  renderPocketBold,
  renderPocketCard,
  renderPocketCover,
  renderPocketFrame,
  renderPocketMono,
  renderPocketSplit,
  renderPocketSpotlight,
  renderPocketTicket,
  renderPoster,
  renderPosterAurora,
  renderPosterBento,
  renderPosterBold,
  renderPosterCover,
  renderPosterFrame,
  renderPosterMono,
  renderPosterSplit,
  renderPosterSpotlight,
  renderPosterTicket,
  renderQrOnly,
} from "@/lib/cards";
import { hrefFor } from "@/lib/links";
import { qrSvg } from "@/lib/qr";
import { ACCENT_HEX } from "@/lib/types";

type Design = "pocket" | "poster" | "qr";
type Layout = "split" | "aurora" | "mono" | "cover" | "bold" | "frame" | "ticket" | "spotlight" | "bento" | "classic";

const LAYOUTS: { id: Layout; name: string }[] = [
  { id: "split", name: "Split" },
  { id: "aurora", name: "Aurora" },
  { id: "mono", name: "Mono" },
  { id: "cover", name: "Cover" },
  { id: "bold", name: "Bold" },
  { id: "frame", name: "Frame" },
  { id: "ticket", name: "Ticket" },
  { id: "spotlight", name: "Spotlight" },
  { id: "bento", name: "Bento" },
  { id: "classic", name: "Classic" },
];

const RENDERERS: Record<Layout, { pocket: (c: HTMLCanvasElement, card: PersonCard) => void; poster: (c: HTMLCanvasElement, card: PersonCard) => void }> = {
  split: { pocket: renderPocketSplit, poster: renderPosterSplit },
  aurora: { pocket: renderPocketAurora, poster: renderPosterAurora },
  mono: { pocket: renderPocketMono, poster: renderPosterMono },
  cover: { pocket: renderPocketCover, poster: renderPosterCover },
  bold: { pocket: renderPocketBold, poster: renderPosterBold },
  frame: { pocket: renderPocketFrame, poster: renderPosterFrame },
  ticket: { pocket: renderPocketTicket, poster: renderPosterTicket },
  spotlight: { pocket: renderPocketSpotlight, poster: renderPosterSpotlight },
  bento: { pocket: renderPocketBento, poster: renderPosterBento },
  classic: { pocket: renderPocketCard, poster: renderPoster },
};

const DESIGNS: { id: Design; name: string; size: string; tip: string }[] = [
  { id: "pocket", name: "Business card", size: "3.5 × 2 in", tip: "Print at 100% on card stock, or send to any business-card printer." },
  { id: "poster", name: "Desk card", size: "A6 · 105 × 148 mm", tip: "For a desk stand, a lanyard pouch, a booth or the back of a laptop." },
  { id: "qr", name: "QR only", size: "1024 px", tip: "For slides, stickers and your own designs. SVG stays sharp at any size." },
];

interface Options {
  design: Design;
  layout: Layout;
  bentoPhoto: boolean;
  style: CardStyle;
  photoInQr: boolean;
  pocketPosition: PhotoPosition;
  posterPosition: PhotoPosition;
  photoSize: PhotoSize;
  accentBar: boolean;
  showIcons: boolean;
  showContact: boolean;
  showLink: boolean;
}

const DEFAULTS: Options = {
  design: "pocket",
  layout: "split",
  bentoPhoto: true,
  style: "light",
  photoInQr: false,
  pocketPosition: "beside",
  posterPosition: "above",
  photoSize: "l",
  accentBar: true,
  showIcons: true,
  showContact: true,
  showLink: false,
};

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { id: T; text: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="disabled:opacity-40">
      <legend className="label">{label}</legend>
      <div className="grid gap-1 rounded-xl border border-line bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${value === o.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {o.text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-40" : "cursor-pointer"}`}>
      <input type="checkbox" className="mt-0.5 size-4 accent-ink" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export default function QrStudioPage() {
  const { username, profile } = useAccount();
  // v2: the default layout changed, so earlier saved choices start fresh.
  const storageKey = `hq:print:v2:${username}`;
  const [opts, setOpts] = useState<Options>(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      return saved ? { ...DEFAULTS, ...(JSON.parse(saved) as Partial<Options>) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const set = <K extends keyof Options>(key: K, value: Options[K]) => setOpts((o) => ({ ...o, [key]: value }));

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(opts));
    } catch {
      // Private mode: settings just won't be remembered.
    }
  }, [opts, storageKey]);

  const qrUrl = `${window.location.origin}/${username}?s=qr`;
  const displayUrl = `${window.location.host}/${username}`;
  const contact = [profile.contactEmail, profile.contactPhone].filter(Boolean).join("  ·  ");

  useEffect(() => {
    let active = true;
    Promise.all([loadCardFonts(), loadImage(profile.photo)]).then(([, img]) => {
      if (active) {
        setPhoto(img);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [profile.photo]);

  const classic = opts.layout === "classic";
  const position: PhotoPosition = !classic ? (opts.bentoPhoto ? "above" : "none") : opts.design === "poster" ? opts.posterPosition : opts.pocketPosition;
  const card: PersonCard = {
    name: profile.displayName,
    headline: profile.headline,
    roles: profile.roles,
    url: qrUrl,
    displayUrl,
    showLink: opts.showLink,
    accent: ACCENT_HEX[profile.accent],
    photo,
    initials: initials(profile.displayName),
    style: opts.style,
    photoInQr: opts.photoInQr,
    photoSize: opts.photoSize,
    photoPosition: position,
    accentBar: opts.accentBar,
    linkTypes: opts.showIcons ? profile.links.filter((l) => hrefFor(l)).map((l) => l.type) : [],
    contact: opts.showContact ? contact : "",
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) {
      return;
    }
    if (opts.design === "qr") {
      renderQrOnly(canvas, card);
      return;
    }
    const kind = opts.design;
    RENDERERS[opts.layout][kind](canvas, card);
    // Each thumbnail is the real design at full size, scaled down by CSS.
    LAYOUTS.forEach((layout, i) => {
      const thumb = thumbRefs.current[i];
      if (thumb) {
        RENDERERS[layout.id][kind](thumb, card);
      }
    });
  });

  async function downloadPng() {
    if (!canvasRef.current) {
      return;
    }
    setBusy(true);
    try {
      await downloadCanvas(canvasRef.current, `helloqr-${username}-${opts.design}.png`);
    } finally {
      setBusy(false);
    }
  }

  function downloadSvg() {
    downloadBlob(new Blob([qrSvg(qrUrl)], { type: "image/svg+xml" }), `helloqr-${username}.svg`);
  }

  const current = DESIGNS.find((d) => d.id === opts.design)!;
  const isCard = opts.design !== "qr";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">QR &amp; print</h1>
          <p className="mt-1 text-muted">Your code never changes, so you can print it once and keep editing your card.</p>
        </div>
        <Link href="/dashboard/show" className="btn btn-ghost btn-sm">
          Show on this phone
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="panel space-y-6 p-5 sm:p-6">
          <fieldset>
            <legend className="label">Design</legend>
            <div className="space-y-2">
              {DESIGNS.map((d) => (
                <label
                  key={d.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition ${
                    opts.design === d.id ? "border-ink" : "border-line hover:bg-surface-2"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-medium text-ink">{d.name}</span>
                    <span className="block text-xs text-muted">{d.size}</span>
                  </span>
                  <input type="radio" name="design" className="accent-ink" checked={opts.design === d.id} onChange={() => set("design", d.id)} />
                </label>
              ))}
            </div>
          </fieldset>

          {isCard && (
            <>
              <Segmented
                label="Style"
                value={opts.style}
                options={[
                  { id: "light", text: "Light" },
                  { id: "dark", text: "Dark" },
                ]}
                onChange={(v) => set("style", v)}
              />

              {!classic ? (
                <Segmented
                  label="Photo"
                  value={opts.bentoPhoto ? "show" : "hide"}
                  options={[
                    { id: "show", text: "Show" },
                    { id: "hide", text: "Hide" },
                  ]}
                  onChange={(v) => set("bentoPhoto", v === "show")}
                />
              ) : opts.design === "pocket" ? (
                <Segmented
                  label="Photo"
                  value={opts.pocketPosition}
                  options={[
                    { id: "beside", text: "Beside" },
                    { id: "above", text: "Above" },
                    { id: "panel", text: "Panel" },
                    { id: "none", text: "Hide" },
                  ]}
                  onChange={(v) => set("pocketPosition", v)}
                />
              ) : (
                <Segmented
                  label="Photo"
                  value={opts.posterPosition === "none" ? "none" : "above"}
                  options={[
                    { id: "above", text: "Show" },
                    { id: "none", text: "Hide" },
                  ]}
                  onChange={(v) => set("posterPosition", v)}
                />
              )}

              <Segmented
                label="Photo size"
                value={opts.photoSize}
                disabled={position === "none"}
                options={[
                  { id: "s", text: "Small" },
                  { id: "m", text: "Medium" },
                  { id: "l", text: "Large" },
                ]}
                onChange={(v) => set("photoSize", v)}
              />

              <div className="space-y-3">
                <p className="label mb-0">Details</p>
                <Toggle
                  label="Profile icons"
                  hint="LinkedIn, X, GitHub… so people know where to find you."
                  checked={opts.showIcons}
                  onChange={(v) => set("showIcons", v)}
                />
                <Toggle
                  label="Email & phone"
                  hint={contact ? "From the Contact card section of your profile." : "Add them under Profile → Contact card first."}
                  checked={opts.showContact && !!contact}
                  disabled={!contact}
                  onChange={(v) => set("showContact", v)}
                />
                <Toggle
                  label="Show my link"
                  hint="Prints your HelloQR address instead of the HelloQR logo, for people who'd rather type it."
                  checked={opts.showLink}
                  onChange={(v) => set("showLink", v)}
                />
                {classic && (
                  <Toggle label="Accent colour bar" hint="Uses your card's accent colour." checked={opts.accentBar} onChange={(v) => set("accentBar", v)} />
                )}
              </div>
            </>
          )}

          <Toggle
            label="Photo in the middle of the code"
            hint="Uses extra error correction so it still scans. Test with your phone before printing."
            checked={opts.photoInQr}
            onChange={(v) => set("photoInQr", v)}
          />

          <div className="space-y-2 border-t border-line-soft pt-5">
            <button type="button" className="btn btn-primary w-full" onClick={downloadPng} disabled={!ready || busy}>
              {busy ? "Preparing…" : "Download PNG"}
            </button>
            {opts.design === "qr" && (
              <button type="button" className="btn btn-ghost w-full" onClick={downloadSvg}>
                Download SVG
              </button>
            )}
            <p className="text-xs text-muted">{current.tip}</p>
          </div>
        </div>

        <div className="space-y-4 self-start lg:sticky lg:top-32">
          {opts.design !== "qr" && (
            <div>
              <p className="label">Card design</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Card design">
                {LAYOUTS.map((layout, i) => (
                  <button
                    key={layout.id}
                    type="button"
                    role="radio"
                    aria-checked={opts.layout === layout.id}
                    onClick={() => set("layout", layout.id)}
                    className={`group rounded-xl p-1.5 text-center transition ${
                      opts.layout === layout.id ? "bg-surface shadow-[var(--tile-shadow)] ring-2 ring-ink" : "hover:bg-surface"
                    }`}
                  >
                    <canvas
                      ref={(el) => {
                        thumbRefs.current[i] = el;
                      }}
                      className={`mx-auto h-auto w-full rounded-md ring-1 ring-line ${opts.design === "poster" ? "max-w-[4.5rem]" : ""}`}
                      aria-hidden="true"
                    />
                    <span className={`mt-1.5 block text-xs font-semibold ${opts.layout === layout.id ? "text-ink" : "text-muted group-hover:text-ink"}`}>
                      {layout.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid min-h-80 place-items-center rounded-2xl border border-line bg-surface-2 p-4 sm:p-8">
            {!ready && <div className="skeleton aspect-[7/4] w-full max-w-xl" />}
            <canvas
              ref={canvasRef}
              className={`h-auto max-h-[60dvh] w-auto max-w-full rounded-xl shadow-lg ring-1 ring-line ${ready ? "" : "hidden"}`}
              aria-label={`${current.name} preview`}
              role="img"
            />
          </div>
        </div>
      </div>

      <div className="panel p-5 text-sm text-muted sm:p-6">
        <p className="font-medium text-ink">Before you print</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Scan the preview on your screen with your phone camera and check it opens your card.</li>
          <li>Keep the code at least 2 cm wide on paper; bigger is better for posters people scan from a distance.</li>
          <li>
            The code points to <span className="font-medium text-ink">{displayUrl}</span>, so edits to your card never need a reprint.
          </li>
        </ul>
      </div>
    </div>
  );
}
