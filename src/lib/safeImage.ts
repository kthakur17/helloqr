// Any other https address would let a card owner log the IP address of everyone who views their card.
const PROVIDER_AVATAR = /^https:\/\/(lh\d\.googleusercontent\.com|avatars\.githubusercontent\.com)\/[^\s"'<>]+$/;

/** Only our own data URLs and avatars hosted by the sign-in providers are rendered. */
export function safeImageSrc(src: string | undefined): string | null {
  if (!src) {
    return null;
  }
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src)) {
    return src;
  }
  return PROVIDER_AVATAR.test(src) ? src : null;
}

/** Covers are always our own JPEG data URLs. */
export function safeCoverSrc(src: string | undefined): string | null {
  return src && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(src) ? src : null;
}
