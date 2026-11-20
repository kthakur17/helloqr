import { safeImageSrc } from "@/lib/safeImage";

// Photos are stored as small JPEG data URLs in the profile document, which keeps the app
// on Firebase's free plan (new Cloud Storage buckets need the paid Blaze plan).

/** 480 px keeps a large photo sharp on a 300 dpi print; the size cap stays under the rules' 90,000 chars. */
const PHOTO = { side: 480, maxChars: 88_000 };
const THUMB = { side: 72, maxChars: 7_800 };
/** 3:1 banner, sharp on a 2x screen at the card's width; the cap stays under the rules' 140,000 chars. */
export const COVER = { width: 1200, height: 400, maxChars: 136_000 };

export type ImageSource = (HTMLImageElement | ImageBitmap) & { width: number; height: number };

/** A region of the source in source pixels; `size` is its width, and its height follows the output's aspect. */
export interface Crop {
  x: number;
  y: number;
  size: number;
}

export function centreCrop(source: { width: number; height: number }): Crop {
  const size = Math.min(source.width, source.height);
  return { x: (source.width - size) / 2, y: (source.height - size) / 2, size };
}

function jpeg(source: ImageSource, crop: Crop, width: number, height: number, maxChars: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, crop.x, crop.y, crop.size, (crop.size * height) / width, 0, 0, width, height);
  for (let quality = 0.88; quality >= 0.4; quality -= 0.06) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= maxChars) {
      return url;
    }
  }
  return canvas.toDataURL("image/jpeg", 0.35);
}

/** Produces the stored photo and thumbnail from a square crop of any source. */
export function photosFromCrop(source: ImageSource, crop: Crop) {
  return {
    photo: jpeg(source, crop, PHOTO.side, PHOTO.side, PHOTO.maxChars),
    thumb: jpeg(source, crop, THUMB.side, THUMB.side, THUMB.maxChars),
  };
}

export function coverFromCrop(source: ImageSource, crop: Crop): string {
  return jpeg(source, crop, COVER.width, COVER.height, COVER.maxChars);
}

export async function sourceFromFile(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("That image is over 15 MB.");
  }
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error("Couldn't read that image. Try a JPEG or PNG.");
  }
}

/** Loads a stored data URL or an https avatar as something a canvas can read back. */
export async function sourceFromUrl(url: string): Promise<ImageBitmap | null> {
  if (!safeImageSrc(url)) {
    return null;
  }
  try {
    const res = await fetch(url, { mode: "cors", referrerPolicy: "no-referrer" });
    if (!res.ok) {
      return null;
    }
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

/** Copies the sign-in provider's avatar into our own data URLs; null if the host blocks it. */
export async function photosFromUrl(url: string | null): Promise<{ photo: string; thumb: string } | null> {
  if (!url || !/^https:\/\//.test(url)) {
    return null;
  }
  // Google avatars default to 96px; ask for a sharper one.
  const source = await sourceFromUrl(url.replace(/=s\d+-c$/, "=s600-c"));
  if (!source) {
    return null;
  }
  try {
    return photosFromCrop(source, centreCrop(source));
  } finally {
    source.close();
  }
}
