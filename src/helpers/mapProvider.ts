/** True when Google Maps JS should load (admin key or Next public env). */
export function hasGoogleMapsKey(
  webSettings: { googleMapKey?: string } | null | undefined,
): boolean {
  const env =
    typeof process !== "undefined" &&
    Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
  const admin = Boolean(webSettings?.googleMapKey?.trim());
  return env || admin;
}
