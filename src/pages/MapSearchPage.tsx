import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Navigation,
  MapPin,
  Phone,
  AlertTriangle,
  RefreshCw,
  Globe,
  Clock,
  Heart,
  Search,
} from 'lucide-react';
import { cn, isCurrentlyOpen } from '../lib/utils';
import { api, type NearbyClinic } from '../services/api';
import { favoriteClinicService } from '../services/firestore';
import { useAuth } from '../hooks/useAuth';
import { BottomNav } from '../components/BottomNav';
import { PageLayout } from '../components/PageLayout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { LeafletMap, type MapPin as LeafletPin } from '../components/LeafletMap';

const RADIUS_OPTIONS = [
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '15 km', value: 15000 },
  { label: '25 km', value: 25000 },
  { label: '50 km', value: 50000 },
];

// Module-level cache to persist data across remounts (navigation)
let _cache: {
  clinics: NearbyClinic[];
  radius: number;
  userPos: [number, number];
} | null = null;

export default function MapSearchPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [allClinics, setAllClinics] = useState<NearbyClinic[]>(_cache?.clinics ?? []);
  const [radius, setRadius] = useState(_cache?.radius ?? 5000);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(_cache?.userPos ?? null);
  // Map of clinic key -> favoriteId (null = not favorite, string = favorite doc id)
  const [favorites, setFavorites] = useState<Record<string, string | null>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClinic, setSelectedClinic] = useState<NearbyClinic | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  const clinicKey = (c: NearbyClinic) => btoa(`${c.name}|${c.lat}|${c.lng}`).replace(/[/+=]/g, '_');

  const searchClinics = useCallback(async (searchRadius: number, pos?: [number, number] | null) => {
    setLoading(true);
    setGeoError(null);
    setApiError(null);
    setAllClinics([]);

    let lat: number, lng: number;

    if (pos) {
      [lat, lng] = pos;
    } else {
      try {
        const geoPos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000 }),
        );
        lat = geoPos.coords.latitude;
        lng = geoPos.coords.longitude;
        setUserPos([lat, lng]);
      } catch {
        setGeoError('No se pudo obtener tu ubicación. Asegúrate de dar permisos de GPS.');
        setLoading(false);
        return;
      }
    }

    try {
      const data = await api.searchNearbyClinics(lat, lng, searchRadius);
      const clinics = data.clinics ?? [];
      setAllClinics(clinics);
      // Update cache
      _cache = { clinics, radius: searchRadius, userPos: [lat, lng] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user's favorites to know which clinics are already saved
  useEffect(() => {
    if (!user) return;
    favoriteClinicService.getFavorites(user.id).then((favs) => {
      const map: Record<string, string> = {};
      favs.forEach(f => {
        const key = btoa(`${f.name}|${f.lat}|${f.lng}`).replace(/[/+=]/g, '_');
        map[key] = f.id;
      });
      setFavorites(map);
    });
  }, [user]);

  // Only fetch if no cached data
  useEffect(() => { if (!_cache) searchClinics(radius); }, [searchClinics]);

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    searchClinics(newRadius, userPos);
  };

  const toggleFavorite = async (clinic: NearbyClinic) => {
    if (!user || clinic.lat == null || clinic.lng == null) return;
    const key = clinicKey(clinic);
    const existingId = favorites[key];

    if (existingId) {
      // Remove from favorites
      await favoriteClinicService.removeFavorite(user.id, existingId);
      setFavorites(prev => ({ ...prev, [key]: null }));
    } else {
      // Add to favorites
      const docId = await favoriteClinicService.addFavorite(user.id, {
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
        website: clinic.website,
        openingHours: clinic.openingHours,
        lat: clinic.lat,
        lng: clinic.lng,
        mapsUrl: clinic.mapsUrl,
      });
      setFavorites(prev => ({ ...prev, [key]: docId }));
    }
  };

  // Filter by search query
  const filtered = searchQuery.trim()
    ? allClinics.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allClinics;

  // Sort: open clinics first, then by distance
  const sortedClinics = [
    ...filtered.filter(c => isCurrentlyOpen(c.openingHours) === true),
    ...filtered.filter(c => isCurrentlyOpen(c.openingHours) !== true),
  ];

  // Map pins
  const mapPins: LeafletPin[] = [];
  if (userPos) {
    mapPins.push({ lat: userPos[0], lng: userPos[1], label: 'Tu ubicación', type: 'user' });
  }
  allClinics.forEach((c, i) => {
    if (c.lat != null && c.lng != null) {
      mapPins.push({
        lat: c.lat,
        lng: c.lng,
        label: c.name,
        type: 'clinic',
        index: i + 1,
        address: c.address,
        phone: c.phone,
        openingHours: c.openingHours,
        website: c.website,
        distance: c.distance,
        mapsUrl: c.mapsUrl,
      });
    }
  });

  const mapCenter: [number, number] = selectedClinic?.lat != null && selectedClinic?.lng != null
    ? [selectedClinic.lat, selectedClinic.lng]
    : userPos ?? [40.4168, -3.7038];
  const mapZoom = selectedClinic ? 16 : 14;

  return (
    <PageLayout className="bg-blue-gray-light flex flex-col">
      <header className="bg-white px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-bold">Clínicas cercanas</h1>
          {!loading && allClinics.length > 0 && (
            <p className="text-xs text-slate-400">
              {searchQuery ? `${sortedClinics.length} de ` : ''}{allClinics.length} encontradas
            </p>
          )}
        </div>
        <button
          onClick={() => searchClinics(radius, userPos)}
          disabled={loading}
          className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary disabled:opacity-50"
        >
          <RefreshCw size={20} className={cn(loading && 'animate-spin')} />
        </button>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto no-scrollbar pb-24">

        {/* Map */}
        {mapPins.length > 0 && (
          <div className="h-56 w-full">
            <LeafletMap
              center={mapCenter}
              zoom={mapZoom}
              pins={mapPins}
              autoFit={!selectedClinic && mapPins.length > 1}
              className="w-full h-full"
              userPos={userPos ?? undefined}
            />
          </div>
        )}

        <div className="p-4 space-y-3">

          {/* Radius selector */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleRadiusChange(opt.value)}
                disabled={loading}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                  radius === opt.value
                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                  loading && 'opacity-50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search by name */}
          {!loading && allClinics.length > 0 && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="text-xs font-bold">✕</span>
                </button>
              )}
            </div>
          )}
          {/* Legend */}
          {mapPins.length > 1 && (
            <div className="flex items-center gap-4 text-xs text-slate-500 px-1">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-3 rounded-full bg-blue-500 border border-white shadow-sm" />
                Tu ubicación
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-3 rounded-full bg-orange-500 border border-white shadow-sm" />
                Veterinarios
              </span>
            </div>
          )}

          {/* Loading */}
          {loading && <LoadingSpinner message="Buscando veterinarios cercanos..." />}

          {/* GPS error */}
          {geoError && (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-red-600 text-sm flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Sin acceso al GPS</p>
                <p className="mt-0.5">{geoError}</p>
              </div>
            </div>
          )}

          {/* API error */}
          {apiError && (
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-orange-700 text-sm flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error en la búsqueda</p>
                <p className="mt-0.5 break-all">{apiError}</p>
              </div>
            </div>
          )}

          {/* Clinic cards */}
          {!loading && sortedClinics.length > 0 && sortedClinics.map((clinic, i) => {
            const key = clinic.lat != null && clinic.lng != null ? clinicKey(clinic) : null;
            const isFav = key ? !!favorites[key] : false;

            return (
              <div
                key={i}
                onClick={() => {
                  if (clinic.lat != null && clinic.lng != null) {
                    setSelectedClinic(clinic);
                    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={cn(
                  'bg-white rounded-2xl border shadow-sm overflow-hidden cursor-pointer transition-all',
                  selectedClinic && selectedClinic.name === clinic.name && selectedClinic.lat === clinic.lat
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-slate-100',
                )}
              >
                <div className="p-4 flex flex-col gap-2.5">

                  {/* Name + favorite + call */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="shrink-0 size-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm leading-snug">{clinic.name}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {user && key && (
                        <button
                          onClick={() => toggleFavorite(clinic)}
                          className={cn(
                            'size-10 rounded-full flex items-center justify-center transition-all active:scale-90',
                            isFav ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-300 hover:text-slate-400',
                          )}
                          title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        >
                          <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
                        </button>
                      )}
                      {clinic.phone ? (
                        <a
                          href={`tel:${clinic.phone.replace(/[\s\-()]/g, '')}`}
                          className="size-10 bg-primary text-white rounded-full flex items-center justify-center shadow-sm shadow-primary/30 active:scale-95 transition-all"
                          title={`Llamar: ${clinic.phone}`}
                        >
                          <Phone size={18} />
                        </a>
                      ) : (
                        <div className="size-10 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center" title="Teléfono no disponible">
                          <Phone size={18} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Distance + open status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {clinic.distance && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                        <Navigation size={11} />
                        {clinic.distance}
                      </span>
                    )}
                    {(() => {
                      const open = isCurrentlyOpen(clinic.openingHours);
                      if (open === true) return (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                          <span className="size-1.5 rounded-full bg-green-500 inline-block" />
                          Abierto ahora
                        </span>
                      );
                      if (open === false) return (
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">
                          <span className="size-1.5 rounded-full bg-red-400 inline-block" />
                          Cerrado ahora
                        </span>
                      );
                      return null;
                    })()}
                  </div>

                  {/* Address */}
                  {clinic.address && (
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <MapPin size={13} className="shrink-0 text-slate-400 mt-0.5" />
                      <span className="leading-snug">{clinic.address}</span>
                    </div>
                  )}

                  {/* Opening hours */}
                  {clinic.openingHours && (
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <Clock size={13} className="shrink-0 text-slate-400 mt-0.5" />
                      <span className="leading-snug">{clinic.openingHours}</span>
                    </div>
                  )}

                  {/* Phone text + Website + Maps */}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {clinic.phone && (
                      <span className="text-xs text-slate-400 flex-1 truncate">{clinic.phone}</span>
                    )}
                    {clinic.website && (
                      <a
                        href={clinic.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Globe size={12} />
                        Web
                      </a>
                    )}
                    {clinic.mapsUrl && (
                      <a
                        href={clinic.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition-colors"
                      >
                        <MapPin size={12} className="text-primary" />
                        Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {!loading && !geoError && !apiError && allClinics.length === 0 && userPos && (
            <div className="text-center py-12 text-slate-400 text-sm">
              <MapPin size={36} className="mx-auto mb-3 opacity-30" />
              <p>No se encontraron veterinarios en un radio de {RADIUS_OPTIONS.find(o => o.value === radius)?.label ?? `${radius / 1000} km`}.</p>
              {radius < 50000 && (
                <p className="mt-1">Prueba a ampliar el radio de búsqueda.</p>
              )}
            </div>
          )}
        </div>
      </main>

      <BottomNav active="map" />
    </PageLayout>
  );
}
