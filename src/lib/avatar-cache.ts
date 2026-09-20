// Cache in-memory and in localStorage for Dicebear planet avatars
const memoryCache = new Map<string, string>();
const LOCAL_STORAGE_KEY_PREFIX = 'dicebear_planet_avatar_v1_';

export function getDicebearPlanetUrl(seed: string): string {
  const cleanSeed = (seed || 'anonymous').trim().toLowerCase();
  return `https://api.dicebear.com/10.x/planets/svg?seed=${encodeURIComponent(cleanSeed)}`;
}

export async function fetchAndCachePlanetAvatar(seed: string): Promise<string | null> {
  const cleanSeed = (seed || 'anonymous').trim().toLowerCase();
  if (!cleanSeed) return null;

  if (memoryCache.has(cleanSeed)) {
    return memoryCache.get(cleanSeed)!;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + cleanSeed);
      if (stored) {
        memoryCache.set(cleanSeed, stored);
        return stored;
      }
    } catch {
      // Ignore storage errors
    }
  }

  try {
    const url = getDicebearPlanetUrl(cleanSeed);
    const res = await fetch(url);
    if (!res.ok) return null;
    const svgText = await res.text();
    if (!svgText || !svgText.includes('<svg')) return null;

    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
    memoryCache.set(cleanSeed, dataUri);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + cleanSeed, dataUri);
      } catch {
        // Ignore quota limits
      }
    }

    return dataUri;
  } catch {
    return null;
  }
}
