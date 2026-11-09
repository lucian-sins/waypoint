const FAVORITES_STORAGE_KEY = 'waypoint_favorite_devices';

export function getStoredFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.map((id) => String(id).toLowerCase().trim()));
    }
  } catch (err) {
    console.warn('Failed to parse stored favorites from localStorage:', err);
  }
  return new Set();
}

export function saveStoredFavorites(favorites: Set<string>): void {
  const array = Array.from(favorites);

  // 1. Save to local storage for instant offline hydration
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(array));
    } catch (err) {
      console.warn('Failed to save favorites to localStorage:', err);
    }

    // 2. Sync to server so favorites reflect across phone PWA, desktop, and other devices
    fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorites: array }),
    }).catch((err) => {
      console.warn('Could not sync favorites to server:', err);
    });
  }
}

export async function fetchServerFavorites(): Promise<Set<string>> {
  try {
    const res = await fetch('/api/favorites');
    if (res.ok) {
      const data: string[] = await res.json();
      if (Array.isArray(data)) {
        const set = new Set(data.map((id) => id.toLowerCase().trim()));
        if (typeof window !== 'undefined' && set.size > 0) {
          localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(set)));
        }
        return set;
      }
    }
  } catch (err) {
    console.warn('Could not fetch server favorites:', err);
  }
  return getStoredFavorites();
}

export function getDeviceIdentifier(device: { mac?: string; ip: string }): string {
  if (device.mac && device.mac !== '00:00:00:00:00:00') {
    return device.mac.toLowerCase().trim();
  }
  return device.ip.trim();
}
