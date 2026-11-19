import QRCode from "qrcode";

export type Ecl = "M" | "Q" | "H";

const cache = new Map<string, { size: number; data: Uint8Array }>();

export function qrMatrix(value: string, ecl: Ecl = "M") {
  const key = `${ecl}|${value}`;
  let hit = cache.get(key);
  if (!hit) {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: ecl });
    hit = { size: modules.size, data: modules.data };
    cache.set(key, hit);
  }
  return hit;
}

/** Plain square-module SVG, the most scanner-friendly form; runs of dark modules merge into one rect. */
export function qrSvg(value: string, { fg = "#000000", bg = "#ffffff", quiet = 4 }: { fg?: string; bg?: string; quiet?: number } = {}) {
  const { size, data } = qrMatrix(value, "M");
  const total = size + quiet * 2;
  let d = "";
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (!data[r * size + c]) {
        c++;
        continue;
      }
      const start = c;
      while (c < size && data[r * size + c]) {
        c++;
      }
      d += `M${start + quiet} ${r + quiet}h${c - start}v1h-${c - start}z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
}

export interface QrDrawOptions {
  fg?: string;
  bg?: string;
  quiet?: number;
  /** Photo or initials in the middle; switches to high error correction so the code still scans. */
  center?: { image: CanvasImageSource | null; initials: string; color: string } | null;
}

/** Draws the code and its quiet zone into a square whose top-left is (x, y). */
export function drawQr(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, side: number, opts: QrDrawOptions = {}) {
  const { fg = "#000000", bg = "#ffffff", quiet = 2, center = null } = opts;
  const { size, data } = qrMatrix(value, center ? "H" : "M");
  const cell = side / (size + quiet * 2);
  // Keep the badge under ~20% of the symbol so error correction (H recovers 30%) has headroom.
  const hole = center ? Math.floor(size * 0.24) | 1 : 0;
  const holeStart = Math.floor((size - hole) / 2);
  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, side, side);
  ctx.fillStyle = fg;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (hole && r >= holeStart && r < holeStart + hole && c >= holeStart && c < holeStart + hole) {
        continue;
      }
      if (data[r * size + c]) {
        ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, cell + 0.6, cell + 0.6);
      }
    }
  }
  if (center) {
    const cx = x + (quiet + size / 2) * cell;
    const cy = y + (quiet + size / 2) * cell;
    const radius = (hole * cell) / 2;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    const inner = radius * 0.86;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.clip();
    if (center.image) {
      ctx.drawImage(center.image, cx - inner, cy - inner, inner * 2, inner * 2);
    } else {
      ctx.fillStyle = center.color;
      ctx.fillRect(cx - inner, cy - inner, inner * 2, inner * 2);
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${inner * 0.9}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(center.initials, cx, cy + inner * 0.05);
    }
    ctx.restore();
  }
  ctx.restore();
}
