import { brandPaths } from "@/lib/brandPaths";
import { drawQr } from "@/lib/qr";
import type { LinkType } from "@/lib/types";

export type CardStyle = "light" | "dark";
export type PhotoSize = "s" | "m" | "l";
/** "panel" fills the business card's left side; the desk card treats every visible option as "above". */
export type PhotoPosition = "beside" | "above" | "panel" | "none";

export interface PersonCard {
  name: string;
  headline: string;
  roles: string[];
  /** What the QR encodes. */
  url: string;
  /** Printed only when showLink is on, e.g. "helloqr.vercel.app/kunal". */
  displayUrl: string;
  /** Typed-in fallback for people who can't scan; off by default, the HelloQR logo shows instead. */
  showLink: boolean;
  accent: string;
  photo: HTMLImageElement | null;
  initials: string;
  style: CardStyle;
  photoInQr: boolean;
  photoSize: PhotoSize;
  photoPosition: PhotoPosition;
  accentBar: boolean;
  /** Monochrome icons of the linked profiles; empty to hide the row. */
  linkTypes: LinkType[];
  /** "email · phone", or "" to hide. */
  contact: string;
}

// ---------- fonts ----------

function cssVar(name: string, fallback: string) {
  if (typeof document === "undefined") {
    return fallback;
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** The owner's chosen font style; null means the site's own fonts. */
let fontChoice: { heading: string; headingWeight: number; body: string } | null = null;

export function setCardFont(font: { heading: string; headingWeight: number; body: string } | null) {
  fontChoice = font;
}

const sans = () => fontChoice?.body ?? cssVar("--font-inter", "sans-serif");
const display = () => fontChoice?.heading ?? cssVar("--font-jakarta", "sans-serif");
const nameWeight = () => fontChoice?.headingWeight ?? 800;
// The HelloQR wordmark keeps the brand font whatever style the card uses.
const brand = () => cssVar("--font-jakarta", "sans-serif");

export async function loadCardFonts() {
  const specs = [`400 40px ${sans()}`, `500 40px ${sans()}`, `${nameWeight()} 40px ${display()}`, `800 40px ${brand()}`];
  await Promise.all(specs.map((spec) => document.fonts.load(spec).catch(() => [])));
}

// ---------- helpers ----------

function palette(style: CardStyle) {
  return style === "dark"
    ? { bg: "#0a0a0a", ink: "#fafafa", text: "#d4d4d8", muted: "#a1a1aa", faint: "#71717a", tile: "#1c1c1f" }
    : { bg: "#ffffff", ink: "#09090b", text: "#3f3f46", muted: "#71717a", faint: "#a1a1aa", tile: "#f4f4f5" };
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = `${px}px`;
  }
}

/** Single line that shrinks to fit, down to `min`. */
function fitLine(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, size: number, min: number, maxWidth: number) {
  let px = size;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > min && ctx.measureText(text).width > maxWidth) {
    px -= 1;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

/**
 * Like fitLine, but truncates with an ellipsis if even the minimum size is too wide.
 * Leaves ctx.font at the size used and returns it, so callers draw at the size that was measured.
 */
function fitOrClip(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, size: number, min: number, maxWidth: number) {
  const px = fitLine(ctx, text, family, weight, size, min, maxWidth);
  let out = text;
  while (out.length > 1 && ctx.measureText(out).width > maxWidth) {
    out = `${out.slice(0, -2).trimEnd()}…`;
  }
  return { text: out, size: px };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) {
    lines.push(line);
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

/**
 * Wraps into the same number of lines as `wrap`, but as evenly as possible, so a headline never
 * ends with one stranded word ("… Community / Builder").
 */
function balancedWrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const greedy = wrap(ctx, text, maxWidth, maxLines);
  const natural = wrap(ctx, text, maxWidth, 99);
  if (greedy.length < 2 || natural.length > maxLines) {
    return greedy;
  }
  let lo = maxWidth * 0.3;
  let hi = maxWidth;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    const attempt = wrap(ctx, text, mid, 99);
    const fits = attempt.length === natural.length && attempt.every((l) => ctx.measureText(l).width <= mid);
    if (fits) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return wrap(ctx, text, hi, maxLines);
}

/** Cover-fits the (square) photo, or the accent colour with initials, into any rectangle. */
function photoRect(ctx: CanvasRenderingContext2D, card: Pick<PersonCard, "photo" | "initials" | "accent">, x: number, y: number, w: number, h: number) {
  if (card.photo) {
    const iw = card.photo.naturalWidth || card.photo.width;
    const ih = card.photo.naturalHeight || card.photo.height;
    const scale = Math.max(w / iw, h / ih);
    const sw = w / scale;
    const sh = h / scale;
    ctx.drawImage(card.photo, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
    return;
  }
  ctx.fillStyle = card.accent;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#ffffff";
  const size = Math.min(w, h) * 0.36;
  ctx.font = `500 ${size}px ${sans()}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(card.initials, x + w / 2, y + h / 2 + size * 0.04);
  ctx.textBaseline = "alphabetic";
}

function avatar(ctx: CanvasRenderingContext2D, card: Pick<PersonCard, "photo" | "initials" | "accent">, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  photoRect(ctx, card, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

/** Monochrome profile icon on a soft tile, matching the web card. */
function icon(ctx: CanvasRenderingContext2D, type: LinkType, x: number, y: number, size: number, p: ReturnType<typeof palette> & { cutout?: string }) {
  ctx.save();
  ctx.fillStyle = p.tile;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.26);
  ctx.fill();
  const g = size * 0.56;
  const gx = x + (size - g) / 2;
  const gy = y + (size - g) / 2;
  ctx.fillStyle = p.ink;
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = g * 0.08;
  const brand = brandPaths[type];
  if (brand) {
    ctx.translate(gx, gy);
    ctx.scale(g / 24, g / 24);
    ctx.fill(new Path2D(brand.path));
  } else if (type === "linkedin") {
    ctx.beginPath();
    ctx.roundRect(gx, gy, g, g, g * 0.18);
    ctx.fill();
    // The letters are cut out of the square, so they take the colour behind the chip.
    ctx.fillStyle = p.cutout ?? p.tile;
    ctx.font = `700 ${g * 0.62}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("in", gx + g / 2, gy + g / 2 + g * 0.04);
  } else if (type === "email") {
    ctx.beginPath();
    ctx.roundRect(gx, gy + g * 0.16, g, g * 0.68, g * 0.1);
    ctx.moveTo(gx + g * 0.06, gy + g * 0.24);
    ctx.lineTo(gx + g / 2, gy + g * 0.55);
    ctx.lineTo(gx + g * 0.94, gy + g * 0.24);
    ctx.stroke();
  } else if (type === "website") {
    ctx.beginPath();
    ctx.arc(gx + g / 2, gy + g / 2, g / 2 - ctx.lineWidth, 0, Math.PI * 2);
    ctx.moveTo(gx, gy + g / 2);
    ctx.lineTo(gx + g, gy + g / 2);
    ctx.ellipse(gx + g / 2, gy + g / 2, g * 0.2, g / 2 - ctx.lineWidth, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.font = `600 ${g}px ${sans()}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("↗", gx + g / 2, gy + g / 2);
  }
  ctx.restore();
}

function iconRow(ctx: CanvasRenderingContext2D, types: LinkType[], x: number, y: number, size: number, gap: number, maxWidth: number, p: ReturnType<typeof palette>, align: "left" | "center") {
  const unique = [...new Set(types)];
  const fit = Math.max(1, Math.floor((maxWidth + gap) / (size + gap)));
  // Icons on paper can't be tapped; they only say where to find you, so the first six (in the
  // owner's order) are enough and keep the row calm.
  const shown = unique.slice(0, Math.min(fit, 6));
  const rowW = shown.length * size + (shown.length - 1) * gap;
  const start = align === "center" ? x - rowW / 2 : x;
  shown.forEach((type, i) => icon(ctx, type, start + i * (size + gap), y, size, p));
}

/** On dark cards the code sits on a white rounded tile; on light cards it is printed directly. */
function qrBlock(
  ctx: CanvasRenderingContext2D,
  card: Pick<PersonCard, "url" | "photo" | "initials" | "accent" | "photoInQr">,
  style: CardStyle,
  x: number,
  y: number,
  side: number,
) {
  const pad = style === "dark" ? side * 0.06 : 0;
  if (style === "dark") {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(x, y, side, side, side * 0.05);
    ctx.fill();
  }
  // Light cards still get a 2-module quiet zone: some scanners refuse a code printed edge to edge.
  drawQr(ctx, card.url, x + pad, y + pad, side - pad * 2, {
    quiet: style === "dark" ? 1 : 2,
    center: card.photoInQr ? { image: card.photo, initials: card.initials, color: card.accent } : null,
  });
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign) {
  ctx.font = `500 ${size}px ${sans()}`;
  setSpacing(ctx, size * 0.14);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text.toUpperCase(), x, y);
  setSpacing(ctx, 0);
}

interface TextBlock {
  name: string;
  nameSize: number;
  headlineLines: string[];
  headlineSize: number;
  roles: string;
  rolesSize: number;
  height: number;
}

/** Measures name, headline and roles for a column, dropping detail until it fits `maxHeight`. */
function layoutText(
  ctx: CanvasRenderingContext2D,
  card: PersonCard,
  width: number,
  maxHeight: number,
  sizes: { name: number; nameMin: number; headline: number; roles: number },
): TextBlock {
  const attempt = (headlineMax: number, withRoles: boolean, scale: number): TextBlock => {
    const fittedName = fitOrClip(ctx, card.name, display(), nameWeight(), sizes.name * scale, sizes.nameMin, width);
    const name = fittedName.text;
    const nameSize = fittedName.size;
    const headlineSize = sizes.headline * scale;
    ctx.font = `400 ${headlineSize}px ${sans()}`;
    const headlineLines = card.headline ? balancedWrap(ctx, card.headline, width, headlineMax) : [];
    let roles = "";
    let rolesSize = sizes.roles * scale;
    if (withRoles && card.roles.length) {
      const fitted = fitOrClip(ctx, card.roles.slice(0, 3).join("  ·  "), sans(), 400, rolesSize, rolesSize * 0.85, width);
      roles = fitted.text;
      rolesSize = fitted.size;
    }
    const height =
      nameSize * 1.05 +
      (headlineLines.length ? headlineSize * 0.5 + headlineLines.length * headlineSize * 1.35 : 0) +
      (roles ? rolesSize * 0.7 + rolesSize * 1.3 : 0);
    return { name, nameSize, headlineLines, headlineSize, roles, rolesSize, height };
  };
  for (const [lines, roles, scale] of [
    [2, true, 1],
    [1, true, 1],
    [2, false, 1],
    [1, false, 1],
    [1, false, 0.85],
  ] as const) {
    const block = attempt(lines, roles, scale);
    if (block.height <= maxHeight) {
      return block;
    }
  }
  return attempt(1, false, 0.75);
}

function drawText(ctx: CanvasRenderingContext2D, block: TextBlock, x: number, top: number, p: ReturnType<typeof palette>, align: CanvasTextAlign) {
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  let y = top + block.nameSize * 0.82;
  ctx.fillStyle = p.ink;
  ctx.font = `${nameWeight()} ${block.nameSize}px ${display()}`;
  setSpacing(ctx, -block.nameSize * 0.03);
  ctx.fillText(block.name, x, y);
  setSpacing(ctx, 0);
  y += block.nameSize * 0.23;
  if (block.headlineLines.length) {
    ctx.font = `400 ${block.headlineSize}px ${sans()}`;
    ctx.fillStyle = p.text;
    y += block.headlineSize * 0.5;
    for (const line of block.headlineLines) {
      y += block.headlineSize * 1.1;
      ctx.fillText(line, x, y);
      y += block.headlineSize * 0.25;
    }
  }
  if (block.roles) {
    ctx.font = `400 ${block.rolesSize}px ${sans()}`;
    ctx.fillStyle = p.muted;
    y += block.rolesSize * 0.7 + block.rolesSize * 1.05;
    ctx.fillText(block.roles, x, y);
  }
}

/** The HelloQR mark (see components/Logo.tsx), drawn in `ink` with its blocks cut out in `cut`. */
function logoMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ink: string, cut: string) {
  const u = s / 28;
  ctx.save();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, 7 * u);
  ctx.fill();
  ctx.fillStyle = cut;
  for (const [bx, by, bs, br] of [
    [7, 7, 5.5, 1.2],
    [15.5, 7, 5.5, 1.2],
    [7, 15.5, 5.5, 1.2],
    [15.5, 15.5, 2.5, 0.6],
    [18.5, 18.5, 2.5, 0.6],
  ]) {
    ctx.beginPath();
    ctx.roundRect(x + bx * u, y + by * u, bs * u, bs * u, br * u);
    ctx.fill();
  }
  ctx.restore();
}

/** Mark plus "HelloQR" wordmark, sitting on `baseline`. */
function logoLockup(ctx: CanvasRenderingContext2D, x: number, baseline: number, size: number, align: CanvasTextAlign, ink: string, cut: string) {
  const mark = size * 1.2;
  const gap = size * 0.4;
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${size * 1.05}px ${brand()}`;
  setSpacing(ctx, -size * 0.02);
  const textW = ctx.measureText("HelloQR").width;
  const total = mark + gap + textW;
  const left = align === "center" ? x - total / 2 : align === "right" || align === "end" ? x - total : x;
  logoMark(ctx, left, baseline - mark * 0.86, mark, ink, cut);
  ctx.textAlign = "left";
  ctx.fillStyle = ink;
  ctx.fillText("HelloQR", left + mark + gap, baseline);
  setSpacing(ctx, 0);
}

/** The typed link, only when the owner turned on "Show my link". Returns whether it drew. */
function linkLine(ctx: CanvasRenderingContext2D, card: Pick<PersonCard, "showLink" | "displayUrl">, x: number, baseline: number, size: number, align: CanvasTextAlign, maxW: number, color: string) {
  if (!card.showLink) {
    return false;
  }
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;
  ctx.fillText(fitOrClip(ctx, card.displayUrl, sans(), 500, size, size * 0.75, maxW).text, x, baseline);
  return true;
}

/** "Scan to connect" with the HelloQR logo under it, centred on `cx`. Returns the y below the block. */
function scanSignoff(ctx: CanvasRenderingContext2D, cx: number, y: number, size: number, labelColor: string, ink: string, cut: string) {
  label(ctx, "Scan to connect", cx, y, size, labelColor, "center");
  const baseline = y + size * 3;
  logoLockup(ctx, cx, baseline, size * 1.3, "center", ink, cut);
  return baseline + size * 0.6;
}

// ---------- layouts ----------

/** 3.5 × 2 in business card at 300 dpi. */
export const POCKET = { width: 1050, height: 600 };
/** A6 portrait at 300 dpi: desk card, lanyard or event poster. */
export const POSTER = { width: 1240, height: 1748 };

// Sizes are in 300 dpi pixels: 25 px is about 6 pt, the smallest comfortable size on a printed card.
const POCKET_RADIUS: Record<PhotoSize, number> = { s: 40, m: 56, l: 74 };
const ABOVE_RADIUS: Record<PhotoSize, number> = { s: 36, m: 48, l: 60 };
const PANEL_WIDTH: Record<PhotoSize, number> = { s: 230, m: 280, l: 330 };
const POSTER_RADIUS: Record<PhotoSize, number> = { s: 80, m: 112, l: 150 };

export function renderPocketCard(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POCKET;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const p = palette(card.style);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);

  const panel = card.photoPosition === "panel";
  const panelW = panel ? PANEL_WIDTH[card.photoSize] : 0;
  if (panel) {
    photoRect(ctx, card, 0, 0, panelW, H);
  } else if (card.accentBar) {
    ctx.fillStyle = card.accent;
    ctx.fillRect(0, 0, 12, H);
  }
  if (panel && card.accentBar) {
    ctx.fillStyle = card.accent;
    ctx.fillRect(panelW, 0, 8, H);
  }

  // QR column on the right; smaller beside a photo panel so the text keeps room.
  const side = panel ? 230 : 290;
  const marginR = panel ? 52 : 64;
  const qx = W - side - marginR;
  const qy = Math.round((H - side) / 2) - 28;
  qrBlock(ctx, card, card.style, qx, qy, side);
  scanSignoff(ctx, qx + side / 2, qy + side + 52, 15, p.muted, p.ink, card.style === "dark" ? "#0a0a0a" : "#ffffff");

  const left = panel ? panelW + 48 : 76;
  const colW = qx - (panel ? 44 : 56) - left;
  const bottom = H - 60;

  // Bottom block: icons, contact line, address — stacked upwards from the bottom margin.
  let bottomTop = bottom - 22;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  linkLine(ctx, card, left, bottom, 23, "left", colW, p.muted);
  if (card.contact) {
    ctx.fillStyle = p.text;
    const contact = fitOrClip(ctx, card.contact, sans(), 400, 26, 20, colW).text;
    ctx.fillText(contact, left, bottomTop - 16);
    bottomTop -= 50;
  }
  if (card.linkTypes.length) {
    const size = 42;
    iconRow(ctx, card.linkTypes, left, bottomTop - size - 4, size, 10, colW, p, "left");
    bottomTop -= size + 22;
  }

  // Top block: photo (above or beside) and the text, fitted into the space left.
  const top = 64;
  const space = bottomTop - top - 24;
  if (card.photoPosition === "above") {
    const r = ABOVE_RADIUS[card.photoSize];
    avatar(ctx, card, left + r, top + r, r);
    const textTop = top + r * 2 + 26;
    const block = layoutText(ctx, card, colW, space - r * 2 - 26, { name: 50, nameMin: 28, headline: 28, roles: 24 });
    drawText(ctx, block, left, textTop, p, "left");
  } else if (card.photoPosition === "beside") {
    const r = POCKET_RADIUS[card.photoSize];
    const textX = left + r * 2 + 28;
    const textW = colW - r * 2 - 28;
    const block = layoutText(ctx, card, textW, space, { name: 46, nameMin: 28, headline: 27, roles: 23 });
    const blockH = Math.max(block.height, r * 2);
    const blockTop = top + Math.max(0, (space - blockH) / 2);
    avatar(ctx, card, left + r, blockTop + blockH / 2, r);
    drawText(ctx, block, textX, blockTop + (blockH - block.height) / 2, p, "left");
  } else {
    const block = layoutText(ctx, card, colW, space, { name: 56, nameMin: 30, headline: 30, roles: 25 });
    drawText(ctx, block, left, top + Math.max(0, (space - block.height) / 2), p, "left");
  }
}

export function renderPoster(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POSTER;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const p = palette(card.style);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  if (card.accentBar) {
    ctx.fillStyle = card.accent;
    ctx.fillRect(0, 0, W, 18);
  }

  const textW = W - 220;
  let y = 140;
  if (card.photoPosition !== "none") {
    const r = POSTER_RADIUS[card.photoSize];
    avatar(ctx, card, W / 2, y + r, r);
    y += r * 2 + 56;
  } else {
    y += 40;
  }
  const block = layoutText(ctx, card, textW, 330, { name: 78, nameMin: 42, headline: 38, roles: 32 });
  drawText(ctx, block, W / 2, y, p, "center");
  y += block.height + 40;

  if (card.linkTypes.length) {
    iconRow(ctx, card.linkTypes, W / 2, y, 58, 16, textW, p, "center");
    y += 58 + 30;
  }
  if (card.contact) {
    ctx.fillStyle = p.text;
    ctx.textAlign = "center";
    const contact = fitOrClip(ctx, card.contact, sans(), 400, 30, 20, textW).text;
    ctx.fillText(contact, W / 2, y + 24);
    y += 60;
  }

  // The code takes whatever height is left above the label and address.
  const reserved = 290;
  const side = Math.max(420, Math.min(620, H - reserved - (y + 30)));
  const qy = Math.min(y + 30, H - reserved - side);
  qrBlock(ctx, card, card.style, (W - side) / 2, qy, side);
  scanSignoff(ctx, W / 2, qy + side + 70, 24, p.muted, p.ink, card.style === "dark" ? "#0a0a0a" : "#ffffff");

  linkLine(ctx, card, W / 2, H - 80, 32, "center", W - 200, p.muted);
}

// ---------- bento layouts ----------

function bentoPalette(style: CardStyle) {
  return style === "dark"
    ? { canvas: "#101018", tile: "#191924", chip: "#232331", ink: "#f4f4f7", text: "#c9c9d6", muted: "#9a9aad", faint: "#6f6f84", bg: "#191924" }
    : { canvas: "#f8f7f4", tile: "#ffffff", chip: "#f0eeeb", ink: "#1a1a2e", text: "#3d3d56", muted: "#6b6b80", faint: "#9898a8", bg: "#ffffff" };
}

function bentoTile(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, radius: number, style: CardStyle) {
  ctx.save();
  if (style === "light") {
    ctx.shadowColor = "rgba(26,26,46,0.07)";
    ctx.shadowBlur = radius * 0.8;
    ctx.shadowOffsetY = radius * 0.12;
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.restore();
}

function roundedPhoto(ctx: CanvasRenderingContext2D, card: Pick<PersonCard, "photo" | "initials" | "accent">, x: number, y: number, size: number) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.24);
  ctx.clip();
  photoRect(ctx, card, x, y, size, size);
  ctx.restore();
}

/** Accent tile: the owner's colour with their profile icons in white, or a short greeting without icons. */
function accentTile(ctx: CanvasRenderingContext2D, card: PersonCard, x: number, y: number, w: number, h: number, radius: number, iconSize: number) {
  bentoTile(ctx, x, y, w, h, card.accent, radius, card.style);
  const pad = radius * 1.05;
  const types = [...new Set(card.linkTypes)];
  if (types.length) {
    const gap = iconSize * 0.25;
    const perRow = Math.max(1, Math.floor((w - pad * 2 + gap) / (iconSize + gap)));
    const rows = Math.max(1, Math.floor((h - pad * 2 + gap) / (iconSize + gap)));
    const shown = types.slice(0, perRow * rows);
    const usedRows = Math.ceil(shown.length / perRow);
    const top = y + (h - (usedRows * iconSize + (usedRows - 1) * gap)) / 2;
    const white = { ...palette("light"), tile: "rgba(255,255,255,0.2)", ink: "#ffffff", cutout: card.accent };
    shown.forEach((type, i) => {
      icon(ctx, type, x + pad + (i % perRow) * (iconSize + gap), top + Math.floor(i / perRow) * (iconSize + gap), iconSize, white);
    });
    return;
  }
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  fitLine(ctx, "Let's connect", display(), nameWeight(), iconSize * 0.8, 14, w - pad * 2);
  ctx.fillText("Let's connect", x + pad, y + h - pad);
}

/** Contact tile: email and phone on separate lines, the card's address at the bottom. */
function contactTile(ctx: CanvasRenderingContext2D, card: PersonCard, x: number, y: number, w: number, h: number, radius: number, sizes: { line: number; url: number }) {
  const p = bentoPalette(card.style);
  bentoTile(ctx, x, y, w, h, p.tile, radius, card.style);
  const pad = radius * 1.1;
  const maxW = w - pad * 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const lines = card.contact ? card.contact.split(/\s+·\s+/).filter(Boolean) : [];
  let ty = y + pad + sizes.line * 0.85;
  if (lines.length) {
    ctx.fillStyle = p.ink;
    for (const line of lines.slice(0, 2)) {
      const fitted = fitOrClip(ctx, line, sans(), 500, sizes.line, sizes.line * 0.75, maxW);
      ctx.fillText(fitted.text, x + pad, ty);
      ty += sizes.line * 1.45;
    }
  } else {
    label(ctx, "Find me online", x + pad, ty, sizes.url * 0.72, p.faint, "left");
  }
  linkLine(ctx, card, x + pad, y + h - pad, sizes.url, "left", maxW, p.muted);
}

function qrTile(ctx: CanvasRenderingContext2D, card: PersonCard, x: number, y: number, w: number, h: number, radius: number, side: number, labelSize: number) {
  // The code always sits on white, in both styles, for the best scan.
  bentoTile(ctx, x, y, w, h, "#ffffff", radius, card.style);
  const qx = x + (w - side) / 2;
  const qy = y + (h - side - labelSize * 6.4) / 2;
  drawQr(ctx, card.url, qx, qy, side, {
    quiet: 2,
    center: card.photoInQr ? { image: card.photo, initials: card.initials, color: card.accent } : null,
  });
  scanSignoff(ctx, x + w / 2, qy + side + labelSize * 2.4, labelSize, "#6b6b80", "#1a1a2e", "#ffffff");
}

const BENTO_PHOTO: Record<PhotoSize, number> = { s: 92, m: 116, l: 140 };
const BENTO_POSTER_PHOTO: Record<PhotoSize, number> = { s: 180, m: 230, l: 280 };

/** Business card as a bento grid: identity, QR, accent and contact tiles on the canvas. */
export function renderPocketBento(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POCKET;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const p = bentoPalette(card.style);
  ctx.fillStyle = p.canvas;
  ctx.fillRect(0, 0, W, H);

  const M = 30;
  const G = 16;
  const R = 26;
  const qrW = 352;
  const qrX = W - M - qrW;
  qrTile(ctx, card, qrX, M, qrW, H - M * 2, R, 288, 15);

  const leftW = qrX - G - M;
  const bottomH = 150;
  const idH = H - M * 2 - G - bottomH;
  bentoTile(ctx, M, M, leftW, idH, p.tile, R, card.style);

  const pad = 34;
  const textW = leftW - pad * 2;
  let top = M + pad;
  if (card.photoPosition !== "none") {
    const size = BENTO_PHOTO[card.photoSize];
    roundedPhoto(ctx, card, M + pad, top, size);
    top += size + 22;
  }
  const space = M + idH - pad - top;
  const block = layoutText(ctx, card, textW, space, { name: 44, nameMin: 26, headline: 24, roles: 20 });
  const textTop = card.photoPosition === "none" ? M + (idH - block.height) / 2 : top;
  drawText(ctx, block, M + pad, textTop, p, "left");

  const bottomY = M + idH + G;
  const accentW = 214;
  accentTile(ctx, card, M, bottomY, accentW, bottomH, R, 40);
  contactTile(ctx, card, M + accentW + G, bottomY, leftW - accentW - G, bottomH, R, { line: 24, url: 21 });
}

/** A6 desk card as a bento grid. */
export function renderPosterBento(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POSTER;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const p = bentoPalette(card.style);
  ctx.fillStyle = p.canvas;
  ctx.fillRect(0, 0, W, H);

  const M = 48;
  const G = 20;
  const R = 40;
  const fullW = W - M * 2;
  const idH = 680;
  bentoTile(ctx, M, M, fullW, idH, p.tile, R, card.style);
  let top = M + 56;
  if (card.photoPosition !== "none") {
    const size = BENTO_POSTER_PHOTO[card.photoSize];
    roundedPhoto(ctx, card, (W - size) / 2, top, size);
    top += size + 36;
  }
  const space = M + idH - 48 - top;
  const block = layoutText(ctx, card, fullW - 140, space, { name: 78, nameMin: 40, headline: 38, roles: 30 });
  const textTop = card.photoPosition === "none" ? M + (idH - block.height) / 2 : top;
  drawText(ctx, block, W / 2, textTop, p, "center");

  const qrY = M + idH + G;
  const qrH = 680;
  qrTile(ctx, card, M, qrY, fullW, qrH, R, 500, 24);

  const bottomY = qrY + qrH + G;
  const bottomH = H - M - bottomY;
  const accentW = 420;
  accentTile(ctx, card, M, bottomY, accentW, bottomH, R, 64);
  contactTile(ctx, card, M + accentW + G, bottomY, fullW - accentW - G, bottomH, R, { line: 36, url: 31 });
}

// ---------- split & aurora layouts ----------

type Tone = { bg: string; ink: string; text: string; muted: string; faint: string };

function tone(style: CardStyle): Tone {
  return style === "dark"
    ? { bg: "#101018", ink: "#f4f4f7", text: "#c9c9d6", muted: "#9a9aad", faint: "#6f6f84" }
    : { bg: "#ffffff", ink: "#1a1a2e", text: "#3d3d56", muted: "#6b6b80", faint: "#9898a8" };
}

/** Profile icons as plain glyphs (no chips), so the row reads as a line of text, not boxes. */
function glyphRow(ctx: CanvasRenderingContext2D, types: LinkType[], x: number, y: number, size: number, gap: number, maxWidth: number, t: Tone, align: "left" | "center") {
  // icon() draws its glyph at 56% of the chip; a transparent chip leaves just the glyph.
  const plain = { ...palette("light"), tile: "rgba(0,0,0,0)", ink: t.ink, cutout: t.bg };
  iconRow(ctx, types, x, y, size, gap, maxWidth, plain, align);
}

/**
 * Contact line (and the link, if the owner asked for it), bottom-up from `bottom`.
 * The HelloQR logo lives under "Scan to connect", so this corner carries only contact details.
 * Returns the y above the block.
 */
function footerLines(ctx: CanvasRenderingContext2D, card: PersonCard, x: number, bottom: number, maxW: number, t: Tone, size: number, align: CanvasTextAlign) {
  let baseline = bottom;
  if (linkLine(ctx, card, x, baseline, size, align, maxW, t.muted)) {
    baseline -= size * 1.55;
  }
  if (card.contact) {
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = t.text;
    ctx.fillText(fitOrClip(ctx, card.contact, sans(), 500, size * 1.05, size * 0.8, maxW).text, x, baseline);
    baseline -= size * 1.55;
  }
  return baseline + size * 0.2;
}

function whiteQrCard(ctx: CanvasRenderingContext2D, card: PersonCard, x: number, y: number, side: number, pad: number, shadow: boolean) {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = "rgba(16,16,40,0.18)";
    ctx.shadowBlur = side * 0.12;
    ctx.shadowOffsetY = side * 0.03;
  }
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x, y, side + pad * 2, side + pad * 2, (side + pad * 2) * 0.09);
  ctx.fill();
  ctx.restore();
  drawQr(ctx, card.url, x + pad, y + pad, side, {
    quiet: 1,
    center: card.photoInQr ? { image: card.photo, initials: card.initials, color: card.accent } : null,
  });
}

function hexAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function auroraBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, card: PersonCard) {
  const dark = card.style === "dark";
  ctx.fillStyle = dark ? "#0e0e18" : "#f8f7f4";
  ctx.fillRect(0, 0, w, h);
  const glow = (cx: number, cy: number, r: number, color: string, alpha: number) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, hexAlpha(color, alpha));
    g.addColorStop(1, hexAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  const m = Math.max(w, h);
  glow(w * 0.95, -h * 0.1, m * 0.75, card.accent, dark ? 0.55 : 0.32);
  glow(w * 1.05, h * 1.1, m * 0.6, "#a78bfa", dark ? 0.35 : 0.2);
  glow(w * 0.1, h * 1.05, m * 0.45, "#38bdf8", dark ? 0.22 : 0.1);
}

function ringedAvatar(ctx: CanvasRenderingContext2D, card: PersonCard, cx: number, cy: number, r: number, ring: string) {
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(cx, cy, r + r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  avatar(ctx, card, cx, cy, r);
}

const SPLIT_RADIUS: Record<PhotoSize, number> = { s: 42, m: 54, l: 66 };
const SPLIT_POSTER_RADIUS: Record<PhotoSize, number> = { s: 90, m: 115, l: 140 };

/** Business card in two zones: details on the left, one accent panel holding the code on the right. */
export function renderPocketSplit(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POCKET;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = tone(card.style);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);

  const panelX = 650;
  ctx.fillStyle = card.accent;
  ctx.fillRect(panelX, 0, W - panelX, H);
  const sheen = ctx.createRadialGradient(W, 0, 0, W, 0, 420);
  sheen.addColorStop(0, "rgba(255,255,255,0.22)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(panelX, 0, W - panelX, H);

  const side = 250;
  const pad = 20;
  const qx = panelX + (W - panelX - side - pad * 2) / 2;
  const qy = (H - side - pad * 2) / 2 - 26;
  whiteQrCard(ctx, card, qx, qy, side, pad, false);
  scanSignoff(ctx, panelX + (W - panelX) / 2, qy + side + pad * 2 + 44, 15, "rgba(255,255,255,0.85)", "#ffffff", card.accent);

  const left = 64;
  const colW = panelX - left - 52;
  let top = 58;
  if (card.photoPosition !== "none") {
    const r = SPLIT_RADIUS[card.photoSize];
    avatar(ctx, card, left + r, top + r, r);
    top += r * 2 + 24;
  }
  detailsGroup(ctx, card, t, { x: left, top, bottom: H - 56, width: colW, align: "left", big: false, iconSize: 46, footSize: 21, center: card.photoPosition === "none" });
}

/** Business card on one soft gradient with the code on a floating white card. */
export function renderPocketAurora(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POCKET;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = { ...tone(card.style), bg: card.style === "dark" ? "#0e0e18" : "#f8f7f4" };
  auroraBackdrop(ctx, W, H, card);

  const side = 256;
  const pad = 22;
  const qx = W - side - pad * 2 - 64;
  const qy = (H - side - pad * 2) / 2 - 24;
  whiteQrCard(ctx, card, qx, qy, side, pad, true);
  scanSignoff(ctx, qx + side / 2 + pad, qy + side + pad * 2 + 42, 15, t.muted, t.ink, t.bg);

  const left = 68;
  const colW = qx - left - 56;
  let top = 60;
  if (card.photoPosition !== "none") {
    const r = SPLIT_RADIUS[card.photoSize];
    ringedAvatar(ctx, card, left + r, top + r, r, card.style === "dark" ? "rgba(255,255,255,0.14)" : "#ffffff");
    top += r * 2 + 28;
  }
  detailsGroup(ctx, card, t, { x: left, top, bottom: H - 56, width: colW, align: "left", big: false, iconSize: 46, footSize: 21, center: card.photoPosition === "none" });
}

/** Desk card: details on top, the code on a full-width accent band below. */
export function renderPosterSplit(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POSTER;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = tone(card.style);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);

  const bandY = 960;
  ctx.fillStyle = card.accent;
  ctx.fillRect(0, bandY, W, H - bandY);
  const sheen = ctx.createRadialGradient(W, bandY, 0, W, bandY, 900);
  sheen.addColorStop(0, "rgba(255,255,255,0.2)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, bandY, W, H - bandY);

  const side = 470;
  const pad = 32;
  const qy = bandY + 48;
  whiteQrCard(ctx, card, (W - side - pad * 2) / 2, qy, side, pad, false);
  scanSignoff(ctx, W / 2, qy + side + pad * 2 + 62, 26, "rgba(255,255,255,0.88)", "#ffffff", card.accent);

  let top = 110;
  if (card.photoPosition !== "none") {
    const r = SPLIT_POSTER_RADIUS[card.photoSize];
    avatar(ctx, card, W / 2, top + r, r);
    top += r * 2 + 44;
  }
  const iconsH = card.linkTypes.length ? 80 : 0;
  const footerH = card.contact ? 110 : 60;
  const space = bandY - 70 - footerH - iconsH - top;
  const block = layoutText(ctx, card, W - 200, space, { name: 80, nameMin: 42, headline: 38, roles: 30 });
  drawText(ctx, block, W / 2, top, t as ReturnType<typeof palette>, "center");
  const y = top + block.height + 34;
  if (card.linkTypes.length) {
    glyphRow(ctx, card.linkTypes, W / 2, y, 72, 4, W - 200, t, "center");
  }
  footerLines(ctx, card, W / 2, bandY - 64, W - 200, t, 32, "center");
}

/** Desk card on one soft gradient with a large floating code. */
export function renderPosterAurora(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POSTER;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = { ...tone(card.style), bg: card.style === "dark" ? "#0e0e18" : "#f8f7f4" };
  auroraBackdrop(ctx, W, H, card);

  let top = 120;
  if (card.photoPosition !== "none") {
    const r = SPLIT_POSTER_RADIUS[card.photoSize];
    ringedAvatar(ctx, card, W / 2, top + r, r, card.style === "dark" ? "rgba(255,255,255,0.14)" : "#ffffff");
    top += r * 2 + 50;
  }
  const block = layoutText(ctx, card, W - 200, 300, { name: 80, nameMin: 42, headline: 38, roles: 30 });
  drawText(ctx, block, W / 2, top, t as ReturnType<typeof palette>, "center");
  let y = top + block.height + 40;
  if (card.linkTypes.length) {
    glyphRow(ctx, card.linkTypes, W / 2, y, 72, 4, W - 200, { ...t, bg: card.style === "dark" ? "#141424" : "#f3f1f5" }, "center");
    y += 72 + 30;
  }

  const footerTop = H - 90 - (card.contact ? 52 : 0);
  const pad = 36;
  const side = Math.max(360, Math.min(520, footerTop - 200 - y - pad * 2));
  const qy = y + Math.max(20, (footerTop - 190 - y - side - pad * 2) / 2);
  whiteQrCard(ctx, card, (W - side - pad * 2) / 2, qy, side, pad, true);
  scanSignoff(ctx, W / 2, qy + side + pad * 2 + 60, 24, t.muted, t.ink, t.bg);
  footerLines(ctx, card, W / 2, H - 90, W - 200, t, 30, "center");
}

// ---------- mono layout ----------

/** Code with a hairline outline instead of a panel; dark cards keep a white tile for contrast. */
function outlinedQr(ctx: CanvasRenderingContext2D, card: PersonCard, x: number, y: number, side: number, pad: number) {
  const box = side + pad * 2;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x, y, box, box, box * 0.06);
  ctx.fill();
  if (card.style === "light") {
    ctx.strokeStyle = "#e3e1dc";
    ctx.lineWidth = Math.max(2, box * 0.006);
    ctx.stroke();
  }
  ctx.restore();
  drawQr(ctx, card.url, x + pad, y + pad, side, {
    quiet: 1,
    center: card.photoInQr ? { image: card.photo, initials: card.initials, color: card.accent } : null,
  });
}

/** Typographic business card: big name, one accent rule, a hairline divider, nothing boxed. */
export function renderPocketMono(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POCKET;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = tone(card.style);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = card.accent;
  ctx.fillRect(0, 0, W, 12);

  const side = 236;
  const pad = 18;
  const qx = W - side - pad * 2 - 64;
  const qy = (H - side - pad * 2) / 2 - 22;
  outlinedQr(ctx, card, qx, qy, side, pad);
  scanSignoff(ctx, qx + side / 2 + pad, qy + side + pad * 2 + 40, 14, t.muted, t.ink, t.bg);

  const divider = qx - 48;
  ctx.fillStyle = card.style === "dark" ? "#2d2d3d" : "#e8e6e3";
  ctx.fillRect(divider, 64, 2, H - 128);

  const left = 68;
  const colW = divider - left - 44;
  let top = 62;
  if (card.photoPosition !== "none") {
    const r = SPLIT_RADIUS[card.photoSize] * 0.78;
    avatar(ctx, card, left + r, top + r, r);
    top += r * 2 + 22;
  }
  detailsGroup(ctx, card, t, { x: left, top, bottom: H - 60, width: colW, align: "left", big: false, iconSize: 44, footSize: 20, center: card.photoPosition === "none" });
}

/** Typographic desk card. */
export function renderPosterMono(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POSTER;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = tone(card.style);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = card.accent;
  ctx.fillRect(0, 0, W, 20);

  const left = 110;
  const colW = W - left * 2;
  let top = 130;
  if (card.photoPosition !== "none") {
    const r = SPLIT_POSTER_RADIUS[card.photoSize] * 0.72;
    avatar(ctx, card, left + r, top + r, r);
    top += r * 2 + 48;
  }
  const block = layoutText(ctx, card, colW, 340, { name: 92, nameMin: 44, headline: 38, roles: 30 });
  drawText(ctx, block, left, top, t as ReturnType<typeof palette>, "left");
  let y = top + block.height + 56;
  if (card.linkTypes.length) {
    glyphRow(ctx, card.linkTypes, left - 16, y, 76, 4, colW, t, "left");
    y += 76 + 40;
  }

  const footerTop = H - 100 - (card.contact ? 52 : 0);
  const pad = 30;
  const side = Math.max(340, Math.min(500, footerTop - 190 - y - pad * 2));
  const qy = y + Math.max(10, (footerTop - 180 - y - side - pad * 2) / 2);
  outlinedQr(ctx, card, left, qy, side, pad);
  scanSignoff(ctx, left + side / 2 + pad, qy + side + pad * 2 + 56, 24, t.muted, t.ink, t.bg);
  footerLines(ctx, card, left, H - 100, colW, t, 30, "left");
}

// ---------- cover, bold, frame, ticket, spotlight ----------

/** Text on a coloured surface: white ink, with the logo's blocks cut out in the surface colour. */
function onColor(surface: string): Tone {
  return { bg: surface, ink: "#ffffff", text: "rgba(255,255,255,0.88)", muted: "rgba(255,255,255,0.72)", faint: "rgba(255,255,255,0.6)" };
}

/** Mixes a colour toward `other`; used to deepen the accent for gradients. */
function mix(hex: string, other: string, amount: number) {
  const a = parseInt(hex.replace("#", ""), 16);
  const b = parseInt(other.replace("#", ""), 16);
  const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

/** Icons row and footer (contact + logo), stacked up from `bottom`. Returns the y above the stack. */
function footerStack(ctx: CanvasRenderingContext2D, card: PersonCard, t: Tone, x: number, bottom: number, w: number, align: "left" | "center", iconSize: number, footSize: number) {
  const top = footerLines(ctx, card, x, bottom, w, t, footSize, align);
  if (!card.linkTypes.length) {
    return top - footSize * 0.6;
  }
  glyphRow(ctx, card.linkTypes, align === "left" ? x - iconSize * 0.18 : x, top - iconSize - footSize * 0.3, iconSize, 2, w, t, align);
  return top - iconSize - footSize * 0.9;
}

/** Height footerStack (or footerLines alone, when iconSize is 0) will use; mirrors their spacing. */
function footerHeight(card: PersonCard, iconSize: number, footSize: number) {
  const lines = (card.showLink ? 1 : 0) + (card.contact ? 1 : 0);
  const linesH = lines * footSize * 1.55 - footSize * 0.2;
  if (iconSize && card.linkTypes.length) {
    return linesH + iconSize + footSize * 0.9;
  }
  return linesH + (iconSize ? footSize * 0.6 : 0);
}

/**
 * Name, headline, roles, then (icons and) contact, kept together as one group: the footer sits a
 * short gap under the text instead of being pinned to the card's bottom edge, so no hole opens up
 * between them. With `center`, the whole group is centred in the space (used when there's no photo).
 */
function detailsGroup(
  ctx: CanvasRenderingContext2D,
  card: PersonCard,
  t: Tone,
  opts: { x: number; top: number; bottom: number; width: number; align: "left" | "center"; big: boolean; iconSize: number; footSize: number; center?: boolean },
) {
  const { x, top, bottom, width, align, big, iconSize, footSize } = opts;
  const gap = big ? 56 : 30;
  const footH = footerHeight(card, iconSize, footSize);
  const sizes = big ? { name: 80, nameMin: 42, headline: 38, roles: 30 } : { name: 46, nameMin: 26, headline: 23, roles: 19 };
  const block = layoutText(ctx, card, width, bottom - top - footH - gap, sizes);
  const groupH = block.height + gap + footH;
  const offset = opts.center ? Math.max(0, (bottom - top - groupH) / 2) : 0;
  drawText(ctx, block, x, top + offset, t as ReturnType<typeof palette>, align);
  const footBottom = Math.min(bottom, top + offset + groupH);
  if (iconSize) {
    footerStack(ctx, card, t, x, footBottom, width, align, iconSize, footSize);
  } else {
    footerLines(ctx, card, x, footBottom, width, t, footSize, align);
  }
}

function textBlock(ctx: CanvasRenderingContext2D, card: PersonCard, t: Tone, x: number, top: number, w: number, maxH: number, big: boolean, align: CanvasTextAlign) {
  const sizes = big ? { name: 80, nameMin: 42, headline: 38, roles: 30 } : { name: 46, nameMin: 26, headline: 23, roles: 19 };
  const block = layoutText(ctx, card, w, maxH, sizes);
  drawText(ctx, block, x, top, t as ReturnType<typeof palette>, align);
  return block.height;
}

function sheen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cx: number, cy: number, r: number, alpha = 0.2) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

const COVER_RADIUS: Record<PhotoSize, number> = { s: 56, m: 66, l: 76 };

/** Profile-style card: an accent header band, photo overlapping its edge, QR card straddling it. */
export function renderPocketCover(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POCKET;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = tone(card.style);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  const band = 200;
  ctx.fillStyle = card.accent;
  ctx.fillRect(0, 0, W, band);
  sheen(ctx, 0, 0, W, band, W * 0.7, -40, 520);
  if (card.linkTypes.length) {
    glyphRow(ctx, card.linkTypes, 62, 46, 46, 2, 520, onColor(card.accent), "left");
  }

  const side = 232;
  const pad = 18;
  const qx = W - side - pad * 2 - 64;
  const qy = 104;
  whiteQrCard(ctx, card, qx, qy, side, pad, true);
  scanSignoff(ctx, qx + side / 2 + pad, qy + side + pad * 2 + 40, 14, t.muted, t.ink, t.bg);

  const left = 70;
  const colW = qx - left - 48;
  let top = band + 34;
  if (card.photoPosition !== "none") {
    const r = COVER_RADIUS[card.photoSize];
    ringedAvatar(ctx, card, left + r, band, r, t.bg);
    top = band + r + 26;
  }
  // Icons sit in the header band here, so the group below carries only text and contact.
  detailsGroup(ctx, card, t, { x: left, top, bottom: H - 54, width: colW, align: "left", big: false, iconSize: 0, footSize: 20 });
}

export function renderPosterCover(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POSTER;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = tone(card.style);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  const band = 440;
  ctx.fillStyle = card.accent;
  ctx.fillRect(0, 0, W, band);
  sheen(ctx, 0, 0, W, band, W * 0.75, -80, 900);
  let top = band + 70;
  if (card.photoPosition !== "none") {
    const r = SPLIT_POSTER_RADIUS[card.photoSize];
    ringedAvatar(ctx, card, W / 2, band, r, t.bg);
    top = band + r + 50;
  }
  const h = textBlock(ctx, card, t, W / 2, top, W - 200, 300, true, "center");
  let y = top + h + 34;
  if (card.linkTypes.length) {
    glyphRow(ctx, card.linkTypes, W / 2, y, 72, 4, W - 200, t, "center");
    y += 72 + 24;
  }
  const footTop = footerLines(ctx, card, W / 2, H - 80, W - 200, t, 30, "center");
  const pad = 30;
  const side = Math.max(320, Math.min(480, footTop - 170 - y - pad * 2));
  const qy = y + Math.max(10, (footTop - 160 - y - side - pad * 2) / 2);
  whiteQrCard(ctx, card, (W - side - pad * 2) / 2, qy, side, pad, true);
  scanSignoff(ctx, W / 2, qy + side + pad * 2 + 46, 22, t.muted, t.ink, t.bg);
}

/** The whole card in the accent colour, deepened with a gradient; white type, white QR card. */
function boldBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, card: PersonCard) {
  const deep = mix(card.accent, card.style === "dark" ? "#05050c" : "#141428", card.style === "dark" ? 0.6 : 0.45);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, card.accent);
  g.addColorStop(1, deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  sheen(ctx, 0, 0, w, h, w * 0.15, -h * 0.2, Math.max(w, h) * 0.7, 0.18);
  return deep;
}

export function renderPocketBold(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POCKET;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const deep = boldBackdrop(ctx, W, H, card);
  const t = onColor(mix(card.accent, deep, 0.6));

  const side = 250;
  const pad = 20;
  const qx = W - side - pad * 2 - 64;
  const qy = (H - side - pad * 2) / 2 - 24;
  whiteQrCard(ctx, card, qx, qy, side, pad, true);
  scanSignoff(ctx, qx + side / 2 + pad, qy + side + pad * 2 + 42, 15, t.muted, t.ink, t.bg);

  const left = 68;
  const colW = qx - left - 52;
  let top = 58;
  if (card.photoPosition !== "none") {
    const r = SPLIT_RADIUS[card.photoSize];
    ringedAvatar(ctx, card, left + r, top + r, r, "rgba(255,255,255,0.35)");
    top += r * 2 + 26;
  }
  detailsGroup(ctx, card, t, { x: left, top, bottom: H - 56, width: colW, align: "left", big: false, iconSize: 46, footSize: 21, center: card.photoPosition === "none" });
}

export function renderPosterBold(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POSTER;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const deep = boldBackdrop(ctx, W, H, card);
  const t = onColor(mix(card.accent, deep, 0.6));
  let top = 120;
  if (card.photoPosition !== "none") {
    const r = SPLIT_POSTER_RADIUS[card.photoSize];
    ringedAvatar(ctx, card, W / 2, top + r, r, "rgba(255,255,255,0.35)");
    top += r * 2 + 50;
  }
  const h = textBlock(ctx, card, t, W / 2, top, W - 200, 300, true, "center");
  let y = top + h + 40;
  if (card.linkTypes.length) {
    glyphRow(ctx, card.linkTypes, W / 2, y, 72, 4, W - 200, t, "center");
    y += 72 + 30;
  }
  const footTop = footerLines(ctx, card, W / 2, H - 90, W - 200, t, 30, "center");
  const pad = 34;
  const side = Math.max(340, Math.min(500, footTop - 180 - y - pad * 2));
  const qy = y + Math.max(10, (footTop - 170 - y - side - pad * 2) / 2);
  whiteQrCard(ctx, card, (W - side - pad * 2) / 2, qy, side, pad, true);
  scanSignoff(ctx, W / 2, qy + side + pad * 2 + 54, 24, t.muted, t.ink, t.bg);
}

/** A clean card inside a fine accent border. */
function frame(ctx: CanvasRenderingContext2D, w: number, h: number, card: PersonCard, inset: number, line: number) {
  const t = tone(card.style);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = card.accent;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.roundRect(inset, inset, w - inset * 2, h - inset * 2, inset * 0.9);
  ctx.stroke();
  return t;
}

export function renderPocketFrame(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POCKET;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = frame(ctx, W, H, card, 26, 4);

  const side = 232;
  const pad = 16;
  const qx = W - side - pad * 2 - 76;
  const qy = (H - side - pad * 2) / 2 - 22;
  outlinedQr(ctx, card, qx, qy, side, pad);
  scanSignoff(ctx, qx + side / 2 + pad, qy + side + pad * 2 + 40, 14, t.muted, t.ink, t.bg);

  const left = 82;
  const colW = qx - left - 50;
  let top = 72;
  if (card.photoPosition !== "none") {
    const r = SPLIT_RADIUS[card.photoSize] * 0.85;
    avatar(ctx, card, left + r, top + r, r);
    top += r * 2 + 22;
  }
  detailsGroup(ctx, card, t, { x: left, top, bottom: H - 72, width: colW, align: "left", big: false, iconSize: 44, footSize: 20, center: card.photoPosition === "none" });
}

export function renderPosterFrame(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POSTER;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = frame(ctx, W, H, card, 44, 7);
  let top = 150;
  if (card.photoPosition !== "none") {
    const r = SPLIT_POSTER_RADIUS[card.photoSize] * 0.9;
    avatar(ctx, card, W / 2, top + r, r);
    top += r * 2 + 46;
  }
  const h = textBlock(ctx, card, t, W / 2, top, W - 260, 300, true, "center");
  let y = top + h + 36;
  if (card.linkTypes.length) {
    glyphRow(ctx, card.linkTypes, W / 2, y, 72, 4, W - 260, t, "center");
    y += 72 + 26;
  }
  const footTop = footerLines(ctx, card, W / 2, H - 120, W - 260, t, 30, "center");
  const pad = 26;
  const side = Math.max(320, Math.min(480, footTop - 180 - y - pad * 2));
  const qy = y + Math.max(10, (footTop - 170 - y - side - pad * 2) / 2);
  outlinedQr(ctx, card, (W - side - pad * 2) / 2, qy, side, pad);
  scanSignoff(ctx, W / 2, qy + side + pad * 2 + 50, 22, t.muted, t.ink, t.bg);
}

/** Perforation between the main part and the stub, with a notch at each end. */
function perforation(ctx: CanvasRenderingContext2D, card: PersonCard, x1: number, y1: number, x2: number, y2: number, notch: number) {
  const hole = card.style === "dark" ? "#05050b" : "#e9e7e2";
  ctx.save();
  ctx.strokeStyle = card.style === "dark" ? "#3a3a4d" : "#cfccc5";
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = hole;
  for (const [cx, cy] of [
    [x1, y1],
    [x2, y2],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, notch, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderPocketTicket(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POCKET;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = tone(card.style);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  const stubX = 700;
  ctx.fillStyle = hexAlpha(card.accent, card.style === "dark" ? 0.22 : 0.1);
  ctx.fillRect(stubX, 0, W - stubX, H);
  perforation(ctx, card, stubX, 0, stubX, H, 26);

  const side = 236;
  const pad = 16;
  const qx = stubX + (W - stubX - side - pad * 2) / 2;
  const qy = (H - side - pad * 2) / 2 - 24;
  whiteQrCard(ctx, card, qx, qy, side, pad, false);
  scanSignoff(ctx, stubX + (W - stubX) / 2, qy + side + pad * 2 + 40, 14, card.accent, t.ink, t.bg);

  const left = 70;
  const colW = stubX - left - 56;
  label(ctx, "Hello, I'm", left, 84, 16, card.accent, "left");
  let top = 108;
  if (card.photoPosition !== "none") {
    const r = SPLIT_RADIUS[card.photoSize] * 0.8;
    avatar(ctx, card, left + r, top + r, r);
    top += r * 2 + 20;
  }
  detailsGroup(ctx, card, t, { x: left, top, bottom: H - 56, width: colW, align: "left", big: false, iconSize: 44, footSize: 20, center: card.photoPosition === "none" });
}

export function renderPosterTicket(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POSTER;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = tone(card.style);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  const stubY = 1060;
  ctx.fillStyle = hexAlpha(card.accent, card.style === "dark" ? 0.22 : 0.1);
  ctx.fillRect(0, stubY, W, H - stubY);
  perforation(ctx, card, 0, stubY, W, stubY, 44);

  label(ctx, "Hello, I'm", W / 2, 150, 28, card.accent, "center");
  let top = 200;
  if (card.photoPosition !== "none") {
    const r = SPLIT_POSTER_RADIUS[card.photoSize] * 0.9;
    avatar(ctx, card, W / 2, top + r, r);
    top += r * 2 + 44;
  }
  // Everything about the person sits above the perforation; the stub holds only the code.
  const bottomOfText = footerStack(ctx, card, t, W / 2, stubY - 70, W - 200, "center", 72, 28);
  textBlock(ctx, card, t, W / 2, top, W - 200, bottomOfText - top - 10, true, "center");

  const pad = 30;
  const side = 440;
  const box = side + pad * 2;
  const qy = stubY + (H - stubY - box - 150) / 2;
  whiteQrCard(ctx, card, (W - box) / 2, qy, side, pad, false);
  scanSignoff(ctx, W / 2, qy + box + 50, 24, card.accent, t.ink, t.bg);
}

/** Photo-forward: a full-height portrait down the left, details and a compact code beside it. */
export function renderPocketSpotlight(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POCKET;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = tone(card.style);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  const panelW = card.photoPosition === "none" ? 0 : { s: 300, m: 340, l: 380 }[card.photoSize];
  if (panelW) {
    photoRect(ctx, card, 0, 0, panelW, H);
    ctx.fillStyle = card.accent;
    ctx.fillRect(panelW, 0, 8, H);
  }

  const left = panelW + 56;
  const right = W - 56;
  const side = 160;
  const pad = 12;
  const box = side + pad * 2;
  const qx = right - box;
  const qy = H - 56 - box - 58;
  outlinedQr(ctx, card, qx, qy, side, pad);
  scanSignoff(ctx, qx + box / 2, qy + box + 28, 12, t.muted, t.ink, t.bg);

  const footW = qx - left - 30;
  const bottomOfFoot = footerStack(ctx, card, t, left, H - 56, footW, "left", 42, 19);
  textBlock(ctx, card, t, left, 64, right - left, Math.min(qy, bottomOfFoot) - 64 - 20, false, "left");
}

export function renderPosterSpotlight(canvas: HTMLCanvasElement, card: PersonCard) {
  const { width: W, height: H } = POSTER;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = tone(card.style);
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  const photoH = card.photoPosition === "none" ? 0 : { s: 640, m: 720, l: 800 }[card.photoSize];
  if (photoH) {
    photoRect(ctx, card, 0, 0, W, photoH);
    ctx.fillStyle = card.accent;
    ctx.fillRect(0, photoH, W, 14);
  } else {
    ctx.fillStyle = card.accent;
    ctx.fillRect(0, 0, W, 20);
  }
  const left = 100;
  const top = photoH + 80;
  const pad = 22;
  const side = 290;
  const box = side + pad * 2;
  const qy = H - 90 - box - 100;
  outlinedQr(ctx, card, W - 100 - box, qy, side, pad);
  scanSignoff(ctx, W - 100 - box / 2, qy + box + 44, 20, t.muted, t.ink, t.bg);
  const footW = W - 100 - box - left - 40;
  const bottomOfFoot = footerStack(ctx, card, t, left, H - 90, footW, "left", 64, 28);
  textBlock(ctx, card, t, left, top, W - 200, Math.min(qy, bottomOfFoot) - top - 30, true, "left");
}

/** Just the code, 1024 px square, for slides, stickers and your own designs. */
export function renderQrOnly(canvas: HTMLCanvasElement, card: Pick<PersonCard, "url" | "photo" | "initials" | "accent" | "photoInQr">) {
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  drawQr(ctx, card.url, 0, 0, 1024, {
    quiet: 3,
    center: card.photoInQr ? { image: card.photo, initials: card.initials, color: card.accent } : null,
  });
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Couldn't create the image."));
        return;
      }
      downloadBlob(blob, filename);
      resolve();
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
