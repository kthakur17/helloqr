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
  renderPocketCard,
  renderPoster,
  renderQrOnly,
} from "@/lib/cards";
import { hrefFor } from "@/lib/links";
import { qrSvg } from "@/lib/qr";
import { ACCENT_HEX } from "@/lib/types";

type Design = "pocket" | "poster" | "qr";

const DESIGNS: { id: Design; name: string; size: string; tip: string }[] = [
  { id: "pocket", name: "Business card", size: "3.5 × 2 in", tip: "Print at 100% on card stock, or send to any business-card printer." },
  { id: "poster", name: "Desk card", size: "A6 · 105 × 148 mm", tip: "For a desk stand, a lanyard pouch, a booth or the back of a laptop." },
  { id: "qr", name: "QR only", size: "1024 px", tip: "For slides, stickers and your own designs. SVG stays sharp at any size." },
];

interface Options {
  design: Design;
  style: CardStyle;
  photoInQr: boolean;
  pocketPosition: PhotoPosition;
  posterPosition: PhotoPosition;
  photoSize: PhotoSize;
  accentBar: boolean;
  showIcons: boolean;
  showContact: boolean;
}

const DEFAULTS: Options = {
  design: "pocket",
  style: "light",
  photoInQr: false,
  pocketPosition: "beside",
  posterPosition: "above",
  photoSize: "l",
  accentBar: true,
  showIcons: true,
  showContact: true,
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
  const storageKey = `hq:print:${username}`;
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

  const position = opts.design === "poster" ? opts.posterPosition : opts.pocketPosition;
  const card: PersonCard = {
    name: profile.displayName,
    headline: profile.headline,
    roles: profile.roles,
    url: qrUrl,
    displayUrl,
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
    if (opts.design === "pocket") {
      renderPocketCard(canvas, card);
    } else if (opts.design === "poster") {
      renderPoster(canvas, card);
    } else {
      renderQrOnly(canvas, card);
    }
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

              {opts.design === "pocket" ? (
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
                <Toggle label="Accent colour bar" hint="Uses your card's accent colour." checked={opts.accentBar} onChange={(v) => set("accentBar", v)} />
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

        <div className="grid min-h-80 place-items-center self-start rounded-2xl border border-line bg-surface-2 p-4 sm:p-8 lg:sticky lg:top-32">
          {!ready && <div className="skeleton aspect-[7/4] w-full max-w-xl" />}
          <canvas
            ref={canvasRef}
            className={`h-auto max-h-[70dvh] w-auto max-w-full rounded-xl shadow-lg ring-1 ring-line ${ready ? "" : "hidden"}`}
            aria-label={`${current.name} preview`}
            role="img"
          />
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
