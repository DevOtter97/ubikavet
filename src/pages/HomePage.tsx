import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  PawPrint,
  Plus,
  FileText,
  MapPin,
  Heart,
  Syringe,
  User,
} from 'lucide-react';
import { cn, computeVaccineStatus } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { petService, vaccineService } from '../services/firestore';
import { BottomNav } from '../components/BottomNav';
import { PageLayout } from '../components/PageLayout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { PetFormModal } from '../components/modals/PetFormModal';
import type { Pet, Vaccine } from '../types';

interface Reminder {
  petName: string;
  vaccineName: string;
  daysLeft: number;
  status: 'due-soon' | 'overdue';
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAddPet, setShowAddPet] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const loadedPets = await petService.getPets(user.id);
      setPets(loadedPets);

      // Load vaccines for all pets to compute reminders
      const allVaccines: Array<Vaccine & { petName: string }> = [];
      await Promise.all(
        loadedPets.map(async (pet) => {
          const vaccines = await vaccineService.getVaccines(user.id, pet.id);
          vaccines.forEach((v) => allVaccines.push({ ...v, petName: pet.name }));
        }),
      );

      const upcomingReminders: Reminder[] = allVaccines
        .map((v) => {
          const status = computeVaccineStatus(v.due_date);
          const daysLeft = Math.round(
            (new Date(v.due_date).getTime() - Date.now()) / 86400000,
          );
          return { petName: v.petName, vaccineName: v.name, daysLeft, status };
        })
        .filter((r) => r.status === 'due-soon' || r.status === 'overdue')
        .sort((a, b) => a.daysLeft - b.daysLeft);

      setReminders(upcomingReminders);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPet(data: Omit<Pet, 'id' | 'user_id'>) {
    if (!user) return;
    await petService.addPet(user.id, data);
    await loadData();
  }

  return (
    <PageLayout className="bg-blue-gray-light flex flex-col">
      <header className="bg-white px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <PawPrint size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Cartilla Veterinaria</h1>
            <p className="text-xs text-slate-500 font-medium">Good Morning, {user?.name || 'there'}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-white shadow-sm"
        >
          <User size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar">
        {/* Reminders */}
        <section className="px-6 pt-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Reminders</h2>
          </div>
          {reminders.length === 0 ? (
            <div className="bg-white p-4 rounded-2xl shadow-sm text-center text-sm text-slate-400">
              No upcoming vaccine reminders
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6 snap-x">
              {reminders.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    'snap-center shrink-0 w-[85%] bg-white p-4 rounded-2xl shadow-sm border-l-4 flex items-start gap-4',
                    r.status === 'overdue' ? 'border-red-500' : 'border-primary',
                  )}
                >
                  <div className={cn(
                    'size-10 rounded-full flex items-center justify-center shrink-0',
                    r.status === 'overdue' ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary',
                  )}>
                    <Syringe size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">
                      {r.vaccineName} {r.status === 'overdue' ? 'Overdue' : 'Due Soon'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {r.petName} •{' '}
                      {r.status === 'overdue'
                        ? `${Math.abs(r.daysLeft)} days ago`
                        : `in ${r.daysLeft} day${r.daysLeft !== 1 ? 's' : ''}`}
                    </p>
                    <button
                      onClick={() => navigate('/calendar')}
                      className="mt-2 text-xs font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-full"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="px-6 mt-6 grid grid-cols-3 gap-4">
          <button onClick={() => setShowAddPet(true)} className="flex flex-col items-center gap-2 group">
            <div className="size-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 group-active:scale-95 transition-all">
              <Plus size={24} />
            </div>
            <span className="text-xs font-medium text-slate-600">Add Pet</span>
          </button>
          <button onClick={() => navigate('/records')} className="flex flex-col items-center gap-2 group">
            <div className="size-14 bg-white text-slate-600 rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-all">
              <FileText size={24} />
            </div>
            <span className="text-xs font-medium text-slate-600">Records</span>
          </button>
          <button onClick={() => navigate('/clinics')} className="flex flex-col items-center gap-2 group">
            <div className="size-14 bg-white text-slate-600 rounded-2xl flex items-center justify-center shadow-sm group-active:scale-95 transition-all relative">
              <MapPin size={24} />
              <Heart size={14} fill="#ef4444" strokeWidth={0} className="absolute bottom-2 right-2 text-red-500 drop-shadow-sm" />
            </div>
            <span className="text-xs font-medium text-slate-600">My Clinics</span>
          </button>
        </section>

        {/* My Pets */}
        <section className="px-6 mt-8 pb-4">
          <h2 className="text-lg font-bold mb-4">My Pets</h2>

          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}

          {!loading && pets.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <PawPrint size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No pets yet. Add your first pet!</p>
            </div>
          )}

          <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
            {pets.map(pet => (
              <motion.div
                key={pet.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/pet/${pet.id}`)}
                className={cn(
                  'rounded-2xl p-4 relative overflow-hidden cursor-pointer',
                  pet.species === 'Dog' ? 'bg-sage-light' : 'bg-blue-100/50',
                )}
              >
                <div className="absolute -right-6 -top-6 size-32 bg-black/5 rounded-full" />
                <div className="flex items-center gap-4 relative z-10">
                  {pet.image_url ? (
                    <img
                      src={pet.image_url}
                      alt={pet.name}
                      className="size-16 rounded-2xl object-cover shadow-md border-2 border-white"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="size-16 rounded-2xl bg-white/60 flex items-center justify-center text-primary shadow-md border-2 border-white">
                      <PawPrint size={28} />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{pet.name}</h3>
                        <p className="text-sm text-slate-500">{pet.breed}</p>
                      </div>
                      <span className={cn(
                        'px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide',
                        pet.status === 'Healthy' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600',
                      )}>
                        {pet.status}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Age</span>
                        <span className="text-sm font-semibold text-slate-700">{pet.age} yrs</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Weight</span>
                        <span className="text-sm font-semibold text-slate-700">{pet.weight} kg</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav active="home" />

      {showAddPet && (
        <PetFormModal
          userId={user!.id}
          onSave={handleAddPet}
          onClose={() => setShowAddPet(false)}
        />
      )}
    </PageLayout>
  );
}
