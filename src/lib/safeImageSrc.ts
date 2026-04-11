/** Avoid empty `src` on <img> / Next Image (hydration + bogus full-page fetch). */
export const IMAGE_SRC_FALLBACK = "https://placehold.co/96x96/e2e8f0/64748b?text=%C2%B7";

export function safeImageSrc(
  src: string | null | undefined,
  fallback: string = IMAGE_SRC_FALLBACK,
): string {
  if (src == null) return fallback;
  const s = String(src).trim();
  return s.length > 0 ? s : fallback;
}
