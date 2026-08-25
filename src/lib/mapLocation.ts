/**
 * Derive an embeddable map + directions link from a kitchen's saved Google Maps
 * URL. The owner just pastes a normal Maps share link; we pull the coordinates
 * out of it so we can show a live embedded map (keyless `output=embed`) and a
 * one-tap directions link, on both web (iframe) and native (WebView).
 */
export type MapLocation = {
  lat: number;
  lng: number;
  /** Keyless embeddable map (works in an iframe or WebView, no API key). */
  embedUrl: string;
  /** Opens turn-by-turn directions in the user's maps app. */
  directionsUrl: string;
};

/** Pull "lat,lng" out of the various shapes a Google Maps URL can take. */
export function parseMapLocation(mapUrl?: string | null): MapLocation | null {
  if (!mapUrl) return null;
  const m =
    // The authoritative place pin: ...!3d<lat>!4d<lng>
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(mapUrl) ||
    // Viewport centre: @<lat>,<lng>
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(mapUrl) ||
    // Query form: ?q=<lat>,<lng>
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(mapUrl);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    embedUrl: `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=en&output=embed`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  };
}
