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
  /** Printed under the code, e.g. "helloqr.vercel.app/kunal". */
  displayUrl: string;
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

export interface EventCard {
  name: string;
  date: string;
  venue: string;
  url: string;
  displayUrl: string;
  style: CardStyle;
}

// ---------- fonts ----------

function cssVar(name: string, fallback: string) {
  if (typeof document === "undefined") {
    return fallback;
  }
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const sans = () => cssVar("--font-inter", "sans-serif");
const display = () => cssVar("--font-jakarta", "sans-serif");
// Addresses are set in the body face; a separate monospace would be a third font to load.
const mono = sans;

export async function loadCardFonts() {
  const specs = [`400 40px ${sans()}`, `500 40px ${sans()}`, `700 40px ${display()}`, `800 40px ${display()}`];
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
  const shown = unique.slice(0, fit);
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
    const fittedName = fitOrClip(ctx, card.name, display(), 800, sizes.name * scale, sizes.nameMin, width);
    const name = fittedName.text;
    const nameSize = fittedName.size;
    const headlineSize = sizes.headline * scale;
    ctx.font = `400 ${headlineSize}px ${sans()}`;
    const headlineLines = card.headline ? wrap(ctx, card.headline, width, headlineMax) : [];
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
  ctx.font = `800 ${block.nameSize}px ${display()}`;
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
  label(ctx, "Scan to connect", qx + side / 2, qy + side + 52, 15, p.faint, "center");

  const left = panel ? panelW + 48 : 76;
  const colW = qx - (panel ? 44 : 56) - left;
  const bottom = H - 60;

  // Bottom block: icons, contact line, address — stacked upwards from the bottom margin.
  let bottomTop = bottom - 22;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = p.muted;
  const address = fitOrClip(ctx, card.displayUrl, mono(), 400, 25, 18, colW).text;
  ctx.fillText(address, left, bottom);
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
  const reserved = 200;
  const side = Math.max(420, Math.min(620, H - reserved - (y + 30)));
  const qy = Math.min(y + 30, H - reserved - side);
  qrBlock(ctx, card, card.style, (W - side) / 2, qy, side);
  label(ctx, "Scan to connect", W / 2, qy + side + 70, 24, p.faint, "center");

  ctx.textAlign = "center";
  ctx.fillStyle = p.muted;
  const address = fitOrClip(ctx, card.displayUrl, mono(), 400, 30, 18, W - 200).text;
  ctx.fillText(address, W / 2, H - 80);
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
  fitLine(ctx, "Let's connect", display(), 800, iconSize * 0.8, 14, w - pad * 2);
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
  ctx.fillStyle = p.muted;
  const url = fitOrClip(ctx, card.displayUrl, sans(), 500, sizes.url, sizes.url * 0.75, maxW).text;
  ctx.fillText(url, x + pad, y + h - pad);
}

function qrTile(ctx: CanvasRenderingContext2D, card: PersonCard, x: number, y: number, w: number, h: number, radius: number, side: number, labelSize: number) {
  // The code always sits on white, in both styles, for the best scan.
  bentoTile(ctx, x, y, w, h, "#ffffff", radius, card.style);
  const qx = x + (w - side) / 2;
  const qy = y + (h - side - labelSize * 3.2) / 2;
  drawQr(ctx, card.url, qx, qy, side, {
    quiet: 2,
    center: card.photoInQr ? { image: card.photo, initials: card.initials, color: card.accent } : null,
  });
  label(ctx, "Scan to connect", x + w / 2, qy + side + labelSize * 2.4, labelSize, "#9898a8", "center");
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

export function renderEventPoster(canvas: HTMLCanvasElement, event: EventCard) {
  const { width: W, height: H } = POSTER;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const p = palette(event.style);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);

  label(ctx, "Who's here", W / 2, 190, 26, p.faint, "center");

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = p.ink;
  ctx.font = `800 84px ${display()}`;
  let y = 320;
  for (const line of wrap(ctx, event.name, W - 200, 2)) {
    fitLine(ctx, line, display(), 800, 84, 44, W - 200);
    setSpacing(ctx, -1);
    ctx.fillText(line, W / 2, y);
    setSpacing(ctx, 0);
    y += 98;
  }
  const meta = [formatDate(event.date), event.venue].filter(Boolean).join("  ·  ");
  if (meta) {
    ctx.fillStyle = p.muted;
    fitLine(ctx, meta, sans(), 400, 34, 20, W - 240);
    ctx.fillText(meta, W / 2, y);
  }

  const side = 640;
  qrBlock(ctx, { url: event.url, photo: null, initials: "", accent: "#000", photoInQr: false }, event.style, (W - side) / 2, 700, side);
  ctx.fillStyle = p.text;
  fitLine(ctx, "Scan to join and see everyone attending", sans(), 400, 32, 20, W - 240);
  ctx.fillText("Scan to join and see everyone attending", W / 2, 1450);

  ctx.fillStyle = p.muted;
  fitLine(ctx, event.displayUrl, mono(), 400, 28, 18, W - 200);
  ctx.fillText(event.displayUrl, W / 2, 1620);
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

export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) {
    return iso;
  }
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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
