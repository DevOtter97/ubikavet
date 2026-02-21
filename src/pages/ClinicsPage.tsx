import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Heart,
  Trash2,
  PawPrint,
  Globe,
  Plus,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { favoriteClinicService, petService } from '../services/firestore';
import { api, type NearbyClinic } from '../services/api';
import { BottomNav } from '../components/BottomNav';
import { PageLayout } from '../components/PageLayout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { FavoriteClinic, Pet } from '../types';

// ── Add Clinic Modal ─────────────────────────────────────────────────────────

interface AddModalProps {
  userId: string;
  existingIds: Set<string>;
  onAdd: (fav: FavoriteClinic) => void;
  onClose: () => void;
}

function AddClinicModal({ userId, existingIds, onAdd, onClose }: AddModalProps) {
  const [mode, setMode] = useState<'search' | 'manual'>('search');

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NearbyClinic[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [adding, setAdding] = useState<number | null>(null);

  // Manual state
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualWebsite, setManualWebsite] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [manualError, setManualError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [mode]);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearched(false);
    setResults([]);

    try {
      // Get user position
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000 }),
      );
      const data = await api.searchNearbyClinics(pos.coords.latitude, pos.coords.longitude, 50000);
      const q = query.toLowerCase();
      const filtered = (data.clinics ?? []).filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)),
      );
      setResults(filtered);
    } catch {
      setSearchError('Error al buscar. Verifica tu conexión o permisos GPS.');
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }

  async function addFromSearch(clinic: NearbyClinic, idx: number) {
    setAdding(idx);
    try {
      const mapsUrl = clinic.lat != null && clinic.lng != null
        ? `https://www.google.com/maps/search/?api=1&query=${clinic.lat},${clinic.lng}`
        : null;
      const docId = await favoriteClinicService.addFavorite(userId, {
        name: clinic.name,
        address: clinic.address ?? null,
        phone: clinic.phone ?? null,
        website: clinic.website ?? null,
        openingHours: clinic.openingHours ?? null,
        lat: clinic.lat ?? 0,
        lng: clinic.lng ?? 0,
        mapsUrl,
      });
      onAdd({
        id: docId,
        name: clinic.name,
        address: clinic.address ?? null,
        phone: clinic.phone ?? null,
        website: clinic.website ?? null,
        openingHours: clinic.openingHours ?? null,
        lat: clinic.lat ?? 0,
        lng: clinic.lng ?? 0,
        mapsUrl,
      });
    } finally {
      setAdding(null);
    }
  }

  async function handleManualSave() {
    if (!manualName.trim()) {
      setManualError('El nombre es obligatorio');
      return;
    }
    setManualError('');
    setSavingManual(true);
    try {
      const address = manualAddress.trim();
      const name = manualName.trim();
      const mapsUrl = address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + address)}`
        : null;
      const docId = await favoriteClinicService.addFavorite(userId, {
        name: manualName.trim(),
        address: address || null,
        phone: manualPhone.trim() || null,
        website: manualWebsite.trim() || null,
        openingHours: null,
        lat: 0,
        lng: 0,
        mapsUrl,
      });
      onAdd({
        id: docId,
        name: manualName.trim(),
        address: address || null,
        phone: manualPhone.trim() || null,
        website: manualWebsite.trim() || null,
        openingHours: null,
        lat: 0,
        lng: 0,
        mapsUrl,
      });
      onClose();
    } catch {
      setManualError('Error al guardar');
    } finally {
      setSavingManual(false);
    }
  }

  function clinicKey(c: NearbyClinic) {
    return btoa(`${c.name}|${c.lat}|${c.lng}`).replace(/[/+=]/g, '_');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-bold">Añadir clínica</h2>
          <button onClick={onClose} className="size-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-5 pt-4 shrink-0">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setMode('search')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'search' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
            >
              Buscar por API
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
            >
              Añadir a mano
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {mode === 'search' ? (
            <div className="space-y-4">
              {/* Search input */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Nombre de la clínica..."
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching || !query.trim()}
                  className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50 shrink-0"
                >
                  {searching ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Busca clínicas veterinarias cerca de ti (radio 50 km). Usa tu GPS.
              </p>

              {searchError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{searchError}</div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">{results.length} resultado{results.length !== 1 ? 's' : ''}</p>
                  {results.map((clinic, i) => {
                    const key = clinicKey(clinic);
                    const alreadySaved = existingIds.has(key);
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{clinic.name}</p>
                          {clinic.address && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{clinic.address}</p>
                          )}
                          {clinic.phone && (
                            <p className="text-xs text-slate-400">{clinic.phone}</p>
                          )}
                        </div>
                        <button
                          onClick={() => addFromSearch(clinic, i)}
                          disabled={alreadySaved || adding === i}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${alreadySaved
                            ? 'bg-green-50 text-green-600 cursor-default'
                            : 'bg-primary/10 text-primary active:scale-95'
                            }`}
                        >
                          {adding === i ? <Loader2 size={12} className="animate-spin" /> : alreadySaved ? '✓ Guardada' : '+ Añadir'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {searched && results.length === 0 && !searchError && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <Search size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No se encontraron resultados para "<strong>{query}</strong>"</p>
                  <button
                    onClick={() => setMode('manual')}
                    className="mt-3 text-primary font-semibold text-sm"
                  >
                    Añadir a mano →
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Manual mode */
            <div className="space-y-4">
              {manualError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{manualError}</div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Nombre *</label>
                <input
                  ref={mode === 'manual' ? inputRef : undefined}
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  placeholder="Ej: Clínica Veterinaria MiPet"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Dirección</label>
                <input
                  value={manualAddress}
                  onChange={e => setManualAddress(e.target.value)}
                  placeholder="Ej: Calle Mayor 5, Madrid"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Teléfono</label>
                <input
                  value={manualPhone}
                  onChange={e => setManualPhone(e.target.value)}
                  placeholder="Ej: 912 345 678"
                  type="tel"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Web</label>
                <input
                  value={manualWebsite}
                  onChange={e => setManualWebsite(e.target.value)}
                  placeholder="Ej: https://clinicamipet.es"
                  type="url"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <button
                onClick={handleManualSave}
                disabled={savingManual}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {savingManual ? 'Guardando...' : 'Guardar clínica'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Clinics Page ─────────────────────────────────────────────────────────────

export default function ClinicsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteClinic[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    const [favs, allPets] = await Promise.all([
      favoriteClinicService.getFavorites(user.id),
      petService.getPets(user.id),
    ]);
    setFavorites(favs);
    setPets(allPets);
    setLoading(false);
  }

  async function removeFavorite(fav: FavoriteClinic) {
    if (!user) return;
    await favoriteClinicService.removeFavorite(user.id, fav.id);
    const affectedPets = pets.filter(p => p.referenceClinicIds?.includes(fav.id));
    await Promise.all(
      affectedPets.map(p => petService.removeReferenceClinic(user.id, p.id, fav.id)),
    );
    setFavorites(prev => prev.filter(f => f.id !== fav.id));
    setPets(prev => prev.map(p =>
      p.referenceClinicIds?.includes(fav.id)
        ? { ...p, referenceClinicIds: p.referenceClinicIds.filter(id => id !== fav.id) }
        : p
    ));
  }

  function getPetsForClinic(clinicId: string): Pet[] {
    return pets.filter(p => p.referenceClinicIds?.includes(clinicId));
  }

  const existingIds = new Set(favorites.map(f => f.id));

  return (
    <PageLayout className="bg-blue-gray-light flex flex-col">
      <header className="bg-white px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Mis clínicas</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="size-10 flex items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Plus size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-24">
        {loading && <LoadingSpinner />}

        {!loading && favorites.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            <Heart size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-slate-500">No tienes clínicas favoritas</p>
            <p className="mt-1">Pulsa <strong>+</strong> para añadir una clínica o búscala en el <span className="text-primary font-medium">Mapa</span>.</p>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => setShowAdd(true)}
                className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-full shadow-sm shadow-primary/20"
              >
                Añadir clínica
              </button>
              <button
                onClick={() => navigate('/map')}
                className="px-5 py-2.5 bg-white text-primary text-sm font-semibold rounded-full border border-primary/20"
              >
                Buscar en mapa
              </button>
            </div>
          </div>
        )}

        {!loading && favorites.map((fav) => {
          const clinicPets = getPetsForClinic(fav.id);
          return (
            <div key={fav.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 space-y-3">
                {/* Clinic name + actions */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 leading-snug">{fav.name}</h3>
                    {fav.address && (
                      <p className="text-xs text-slate-400 flex items-start gap-1.5 mt-1">
                        <MapPin size={12} className="shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{fav.address}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {fav.phone && (
                      <a
                        href={`tel:${fav.phone.replace(/[\s\-()]/g, '')}`}
                        className="size-9 bg-primary text-white rounded-full flex items-center justify-center shadow-sm shadow-primary/30 active:scale-95 transition-all"
                        title="Llamar"
                      >
                        <Phone size={15} />
                      </a>
                    )}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fav.name + (fav.address ? ' ' + fav.address : ''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-9 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center active:scale-95 transition-all"
                      title="Google Maps"
                    >
                      <MapPin size={15} />
                    </a>
                    {fav.website && (
                      <a
                        href={fav.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="size-9 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center active:scale-95 transition-all"
                        title="Web"
                      >
                        <Globe size={15} />
                      </a>
                    )}
                    <button
                      onClick={() => removeFavorite(fav)}
                      className="size-9 bg-red-50 text-red-400 rounded-full flex items-center justify-center active:scale-95 transition-all hover:text-red-500"
                      title="Quitar de favoritos"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Associated pets */}
                {clinicPets.length > 0 && (
                  <div className="border-t border-slate-50 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Mascotas asociadas</p>
                    <div className="flex flex-wrap gap-2">
                      {clinicPets.map(pet => (
                        <button
                          key={pet.id}
                          onClick={() => navigate(`/pet/${pet.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                        >
                          {pet.image_url ? (
                            <img src={pet.image_url} alt="" className="size-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <PawPrint size={12} />
                          )}
                          {pet.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {clinicPets.length === 0 && (
                  <div className="border-t border-slate-50 pt-2">
                    <p className="text-xs text-slate-300 italic">Sin mascotas asociadas</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>

      <BottomNav active="clinics" />

      {showAdd && user && (
        <AddClinicModal
          userId={user.id}
          existingIds={existingIds}
          onAdd={(fav) => setFavorites(prev => [...prev, fav])}
          onClose={() => setShowAdd(false)}
        />
      )}
    </PageLayout>
  );
}
