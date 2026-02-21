class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error || res.statusText);
  }
  return res.json();
}

export interface NearbyClinic {
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  rating: number | null;
  reviewCount: number | null;
  distance: string | null;
  lat: number | null;
  lng: number | null;
  mapsUrl: string | null;
}

export const api = {
  searchNearbyClinics(lat: number, lng: number, radius = 5000) {
    return request<{ clinics: NearbyClinic[] }>('/api/clinics/search', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, radius }),
    });
  },
};
