// Resolve the user's city from the browser's geolocation, then a free
// reverse-geocode (BigDataCloud, no key, CORS-friendly). Returns null if
// permission is denied, geolocation is unavailable, or the lookup fails.
// Note: geolocation only works in a secure context (https or localhost).
export function resolveLocation() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const d = await res.json();
          resolve({ city: d.city || d.locality || '', region: d.principalSubdivisionCode || '' });
        } catch { resolve(null); }
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 1800000 }
    );
  });
}

export function slugify(n) {
  return (n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ZIP code -> city name via Zippopotam.us (free, no key). Returns null on failure.
export async function zipToCity(zip) {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const d = await res.json();
    const place = d.places && d.places[0];
    return place ? { city: place['place name'], state: place['state abbreviation'] } : null;
  } catch { return null; }
}
