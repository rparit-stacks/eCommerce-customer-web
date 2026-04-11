/**
 * Photon (Komoot) — public geocoder, browser-friendly CORS.
 * Use only for dev / moderate traffic; respect https://photon.komoot.io
 */

export type PhotonSearchHit = {
  key: string;
  label: string;
  description: string;
  lat: number;
  lng: number;
  countryCode?: string;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | number | undefined>;
};

function propsLine(p: Record<string, string | number | undefined>): string {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ").trim();
  const city = (p.city || p.town || p.district || p.village || "") as string;
  const state = (p.state || p.region || "") as string;
  const country = (p.country || "") as string;
  return [city, state, country].filter(Boolean).join(", ");
}

export async function photonSearch(
  query: string,
  allowedCountryCodes?: string[],
): Promise<PhotonSearchHit[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=12&lang=en`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const features = data.features || [];
  const codes =
    allowedCountryCodes?.length ?
      new Set(allowedCountryCodes.map((c) => c.toLowerCase()))
    : null;

  const hits: PhotonSearchHit[] = [];
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const coords = f.geometry?.coordinates;
    if (!coords?.length) continue;
    const [lng, lat] = coords;
    const p = (f.properties || {}) as Record<string, string | number | undefined>;
    const cc = (p.countrycode as string | undefined)?.toLowerCase();
    if (codes && cc && !codes.has(cc)) continue;

    const name = (p.name || p.street || query) as string;
    const description = propsLine(p);
    const osmId = p.osm_id;
    const key =
      typeof osmId === "number" || typeof osmId === "string" ?
        `photon:${osmId}:${lat},${lng}`
      : `photon:${i}:${lat},${lng}`;

    hits.push({
      key,
      label: String(name),
      description,
      lat,
      lng,
      countryCode: cc,
    });
  }
  return hits;
}

export async function photonReverseLabel(
  lat: number,
  lng: number,
): Promise<{ placeName: string; placeDescription: string } | null> {
  const res = await fetch(
    `https://photon.komoot.io/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&lang=en`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const f = data.features?.[0];
  if (!f?.properties) return null;
  const p = f.properties as Record<string, string | number | undefined>;
  const street = [p.housenumber, p.street].filter(Boolean).join(" ").trim();
  const line1 =
    street || (p.name as string) || (p.locality as string) || "Current location";
  const rest = propsLine(p);
  const placeName = rest ? `${line1}, ${rest}` : line1;
  return {
    placeName,
    placeDescription: "",
  };
}

/** Parsed address for forms (Address modal, seller register). */
export type PhotonFormAddress = {
  formattedAddress: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  countryCode: string;
};

export async function photonReverseToFormAddress(
  lat: number,
  lng: number,
): Promise<PhotonFormAddress | null> {
  const res = await fetch(
    `https://photon.komoot.io/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&lang=en`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const f = data.features?.[0];
  if (!f?.properties) return null;
  const p = f.properties as Record<string, string | number | undefined>;

  const street = [p.housenumber, p.street].filter(Boolean).join(" ").trim();
  const city = String(p.city || p.town || p.district || p.village || p.locality || "");
  const state = String(p.state || p.region || "");
  const country = String(p.country || "");
  const zipcode = String(p.postcode || "");
  const countryCode = String(p.countrycode || "").toUpperCase();

  const formattedAddress = [
    street || p.name,
    [zipcode, city].filter(Boolean).join(" "),
    state,
    country,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    formattedAddress: formattedAddress || "Selected location",
    city,
    state,
    country,
    zipcode,
    countryCode,
  };
}
