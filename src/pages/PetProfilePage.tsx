import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PawPrint,
  ArrowLeft,
  Edit2,
  BadgeCheck,
  Copy,
  AlertTriangle,
  ChevronRight,
  X,
  Plus,
  MapPin,
  Phone,
  Check,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { petService, allergyService, favoriteClinicService } from '../services/firestore';
import { BottomNav } from '../components/BottomNav';
import { PageLayout } from '../components/PageLayout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { PetFormModal } from '../components/modals/PetFormModal';
import type { Pet, Allergy, FavoriteClinic } from '../types';

export default function PetProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pet, setPet] = useState<Pet | null>(null);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [newAllergy, setNewAllergy] = useState('');
  const [addingAllergy, setAddingAllergy] = useState(false);

  // Clinics state
  const [allFavorites, setAllFavorites] = useState<FavoriteClinic[]>([]);
  const [showClinicPicker, setShowClinicPicker] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    loadPet();
  }, [user, id]);

  async function loadPet() {
    if (!user || !id) return;
    setLoading(true);
    setError('');
    try {
      const [p, a, favs] = await Promise.all([
        petService.getPet(user.id, id),
        allergyService.getAllergies(user.id, id),
        favoriteClinicService.getFavorites(user.id),
      ]);
      if (!p) { setError('Pet not found'); return; }
      setPet(p);
      setAllergies(a);
      setAllFavorites(favs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pet');
    } finally {
      setLoading(false);
    }
  }

  async function handleEditPet(data: Omit<Pet, 'id' | 'user_id'>) {
    if (!user || !id) return;
    await petService.updatePet(user.id, id, data);
    await loadPet();
  }

  async function handleAddAllergy() {
    if (!newAllergy.trim() || !user || !id) return;
    setAddingAllergy(true);
    try {
      await allergyService.addAllergy(user.id, id, newAllergy.trim());
      setNewAllergy('');
      const a = await allergyService.getAllergies(user.id, id);
      setAllergies(a);
    } finally {
      setAddingAllergy(false);
    }
  }

  async function handleDeleteAllergy(allergyId: string) {
    if (!user || !id) return;
    await allergyService.deleteAllergy(user.id, id, allergyId);
    setAllergies((prev) => prev.filter((a) => a.id !== allergyId));
  }

  async function toggleClinic(clinicId: string) {
    if (!user || !id || !pet) return;
    const has = pet.referenceClinicIds?.includes(clinicId);
    if (has) {
      await petService.removeReferenceClinic(user.id, id, clinicId);
      setPet(prev => prev ? {
        ...prev,
        referenceClinicIds: (prev.referenceClinicIds ?? []).filter(c => c !== clinicId),
      } : prev);
    } else {
      await petService.addReferenceClinic(user.id, id, clinicId);
      setPet(prev => prev ? {
        ...prev,
        referenceClinicIds: [...(prev.referenceClinicIds ?? []), clinicId],
      } : prev);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => { });
  }

  // Reference clinics for this pet
  const referenceClinics = allFavorites.filter(f => pet?.referenceClinicIds?.includes(f.id));
  // Available clinics for picker (favorites not yet associated)
  const availableClinics = allFavorites.filter(f => !pet?.referenceClinicIds?.includes(f.id));

  if (loading) return <PageLayout className="bg-background-light flex flex-col"><LoadingSpinner /></PageLayout>;
  if (error) return <PageLayout className="bg-background-light flex flex-col p-6"><ErrorMessage message={error} /></PageLayout>;
  if (!pet) return null;

  return (
    <PageLayout className="bg-background-light flex flex-col relative">
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center">
          <ArrowLeft size={24} />
        </button>
        <button
          onClick={() => setShowEdit(true)}
          className="size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg"
        >
          <Edit2 size={20} />
        </button>
      </div>

      <div className="h-80 w-full shrink-0 relative">
        {pet.image_url ? (
          <img src={pet.image_url} alt={pet.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <PawPrint size={80} className="text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background-light via-transparent to-transparent" />
      </div>

      <div className="relative -mt-12 px-4 flex flex-col gap-6 pb-24">
        {/* Main Info */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{pet.name}</h1>
              <p className="text-primary font-medium text-sm mt-1">{pet.breed} &bull; {pet.species}</p>
            </div>
            <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <PawPrint size={20} />
            </div>
          </div>
          <div className="h-px w-full bg-slate-100 my-4" />
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center border-r border-slate-100">
              <span className="text-xs text-slate-400 uppercase font-bold">Age</span>
              <span className="text-lg font-bold">{pet.age} Yrs</span>
            </div>
            <div className="flex flex-col items-center border-r border-slate-100">
              <span className="text-xs text-slate-400 uppercase font-bold">Weight</span>
              <span className="text-lg font-bold">{pet.weight} kg</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-slate-400 uppercase font-bold">Status</span>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${pet.status === 'Healthy' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                {pet.status}
              </span>
            </div>
          </div>
        </div>

        {/* Identification */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg text-primary"><BadgeCheck size={20} /></div>
            <h3 className="text-lg font-bold">Identification</h3>
          </div>
          <div className="space-y-3">
            {pet.microchip && (
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Microchip Number</span>
                  <span className="font-mono text-sm font-semibold">{pet.microchip}</span>
                </div>
                <button onClick={() => copyToClipboard(pet.microchip)} className="text-slate-400">
                  <Copy size={18} />
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {pet.color && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <span className="text-xs text-slate-400 block">Color</span>
                  <span className="text-sm font-semibold">{pet.color}</span>
                </div>
              )}
              {pet.registration && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <span className="text-xs text-slate-400 block">Registration</span>
                  <span className="text-sm font-semibold">{pet.registration}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reference Clinics */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <details className="p-5" open>
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><MapPin size={20} /></div>
                <h3 className="text-lg font-bold">Clínicas de referencia</h3>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </summary>
            <div className="mt-4 space-y-2">
              {referenceClinics.length === 0 && !showClinicPicker && (
                <p className="text-xs text-slate-400 italic">Sin clínicas de referencia</p>
              )}

              {referenceClinics.map(clinic => (
                <div key={clinic.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{clinic.name}</p>
                    {clinic.phone && (
                      <p className="text-xs text-slate-400 truncate">{clinic.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {clinic.phone && (
                      <a
                        href={`tel:${clinic.phone.replace(/[\s\-()]/g, '')}`}
                        className="size-8 bg-primary text-white rounded-full flex items-center justify-center active:scale-95 transition-all"
                      >
                        <Phone size={13} />
                      </a>
                    )}
                    {clinic.mapsUrl && (
                      <a
                        href={clinic.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="size-8 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center active:scale-95 transition-all"
                      >
                        <MapPin size={13} />
                      </a>
                    )}
                    <button
                      onClick={() => toggleClinic(clinic.id)}
                      className="size-8 bg-red-50 text-red-400 rounded-full flex items-center justify-center active:scale-95 transition-all"
                      title="Desasociar"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Clinic picker */}
              {showClinicPicker && availableClinics.length > 0 && (
                <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Añadir de favoritas</p>
                  {availableClinics.map(clinic => (
                    <button
                      key={clinic.id}
                      onClick={() => toggleClinic(clinic.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-primary/5 transition-colors text-left"
                    >
                      <div className="size-7 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                        <Plus size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{clinic.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showClinicPicker && availableClinics.length === 0 && allFavorites.length === 0 && (
                <p className="text-xs text-slate-400 mt-2 italic">
                  No tienes clínicas favoritas. Guarda clínicas desde el mapa.
                </p>
              )}

              {showClinicPicker && availableClinics.length === 0 && allFavorites.length > 0 && (
                <p className="text-xs text-slate-400 mt-2 italic">
                  Todas tus clínicas favoritas ya están asociadas.
                </p>
              )}

              <button
                onClick={() => setShowClinicPicker(!showClinicPicker)}
                className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
              >
                {showClinicPicker ? (
                  <><X size={12} /> Cerrar</>
                ) : (
                  <><Plus size={12} /> Añadir clínica</>
                )}
              </button>
            </div>
          </details>
        </div>

        {/* Allergies */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <details className="p-5" open>
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg text-red-500"><AlertTriangle size={20} /></div>
                <h3 className="text-lg font-bold">Allergies</h3>
              </div>
              <ChevronRight size={20} className="text-slate-400" />
            </summary>
            <div className="mt-4 flex flex-wrap gap-2">
              {allergies.map((a) => (
                <span
                  key={a.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-600 border border-red-100"
                >
                  {a.name}
                  <button
                    onClick={() => handleDeleteAllergy(a.id)}
                    className="ml-1 text-red-400 hover:text-red-600"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAllergy()}
                  placeholder="Add allergy"
                  className="px-3 py-1.5 rounded-full text-sm border border-dashed border-slate-200 bg-slate-50 outline-none w-28 focus:border-primary"
                />
                <button
                  onClick={handleAddAllergy}
                  disabled={addingAllergy || !newAllergy.trim()}
                  className="size-7 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </details>
        </div>
      </div>

      <BottomNav active="profile" />

      {showEdit && (
        <PetFormModal
          userId={user!.id}
          pet={pet}
          onSave={handleEditPet}
          onClose={() => setShowEdit(false)}
        />
      )}
    </PageLayout>
  );
}
