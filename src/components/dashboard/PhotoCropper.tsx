"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Crop, type ImageSource } from "@/lib/image";

const MAX_ZOOM = 4;

interface Offset {
  x: number;
  y: number;
}

/**
 * Drag to move the image inside the frame (a circle for photos, a wide box for banners), slider
 * (or wheel / +/- buttons) to zoom. Reports the crop in source pixels; the caller turns it into
 * the stored JPEGs.
 */
export function PhotoCropper({
  source,
  previewUrl,
  onCancel,
  onApply,
  aspect = 1,
  title = "Position your photo",
  applyLabel = "Use photo",
}: {
  source: ImageSource;
  /** Something an <img> can show for the same image (object URL or data URL). */
  previewUrl: string;
  onCancel: () => void;
  onApply: (crop: Crop) => void;
  /** Width / height of the frame; 1 is a circle. */
  aspect?: number;
  title?: string;
  applyLabel?: string;
}) {
  const VIEW_W = aspect === 1 ? 260 : 300;
  const VIEW_H = VIEW_W / aspect;
  const baseScale = Math.max(VIEW_W / source.width, VIEW_H / source.height);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>(() => ({
    x: (VIEW_W - source.width * baseScale) / 2,
    y: (VIEW_H - source.height * baseScale) / 2,
  }));
  const drag = useRef<{ id: number; startX: number; startY: number; from: Offset } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const scale = baseScale * zoom;
  const clamp = useCallback(
    (o: Offset, s: number): Offset => ({
      x: Math.min(0, Math.max(VIEW_W - source.width * s, o.x)),
      y: Math.min(0, Math.max(VIEW_H - source.height * s, o.y)),
    }),
    [source.width, source.height, VIEW_W, VIEW_H],
  );

  function zoomTo(next: number) {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    const newScale = baseScale * z;
    // Keep the point under the centre of the frame fixed while zooming.
    const cx = (VIEW_W / 2 - offset.x) / scale;
    const cy = (VIEW_H / 2 - offset.y) / scale;
    setOffset(clamp({ x: VIEW_W / 2 - cx * newScale, y: VIEW_H / 2 - cy * newScale }, newScale));
    setZoom(z);
  }

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function nudge(dx: number, dy: number) {
    setOffset((o) => clamp({ x: o.x + dx, y: o.y + dy }, scale));
  }

  function apply() {
    onApply({ x: -offset.x / scale, y: -offset.y / scale, size: VIEW_W / scale });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onClick={onCancel}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
        className="panel w-full max-w-sm p-6 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="crop-title" className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">Drag to move, use the slider to zoom.</p>

        <div
          className={`relative mx-auto mt-5 cursor-grab touch-none overflow-hidden bg-surface-2 select-none active:cursor-grabbing ${aspect === 1 ? "rounded-full" : "rounded-xl"}`}
          style={{ width: VIEW_W, height: VIEW_H }}
          tabIndex={0}
          aria-label="Image position. Use arrow keys to move."
          onKeyDown={(e) => {
            const step = e.shiftKey ? 20 : 6;
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [step, 0],
              ArrowRight: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            };
            const move = moves[e.key];
            if (move) {
              e.preventDefault();
              nudge(move[0], move[1]);
            }
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, from: offset };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d && d.id === e.pointerId) {
              setOffset(clamp({ x: d.from.x + e.clientX - d.startX, y: d.from.y + e.clientY - d.startY }, scale));
            }
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onWheel={(e) => zoomTo(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the user's own image */}
          <img
            src={previewUrl}
            alt=""
            draggable={false}
            className="pointer-events-none absolute top-0 left-0 max-w-none"
            style={{
              width: source.width * scale,
              height: source.height * scale,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button type="button" className="btn btn-ghost btn-sm w-9 px-0" aria-label="Zoom out" onClick={() => zoomTo(zoom - 0.2)}>
            −
          </button>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => zoomTo(Number(e.target.value))}
            aria-label="Zoom"
            className="flex-1 accent-ink"
          />
          <button type="button" className="btn btn-ghost btn-sm w-9 px-0" aria-label="Zoom in" onClick={() => zoomTo(zoom + 0.2)}>
            +
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={apply}>
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
