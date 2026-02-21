import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PawPrint,
  Plus,
  ArrowLeft,
  Stethoscope,
  FileCheck,
  Calendar,
  Trash2,
  FileText,
  Image,
  File,
} from 'lucide-react';
import { cn, computeVaccineStatus } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { petService, recordService, vaccineService } from '../services/firestore';
import { BottomNav } from '../components/BottomNav';
import { PageLayout } from '../components/PageLayout';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { RecordFormModal } from '../components/modals/RecordFormModal';
import { VaccineFormModal } from '../components/modals/VaccineFormModal';
import type { Pet, HealthRecord, Vaccine } from '../types';

type Tab = 'records' | 'vaccines';

export default function RecordsPage() {
  const { petId: paramPetId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>(paramPetId ?? '');
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('records');
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showAddVaccine, setShowAddVaccine] = useState(false);
  const [editRecord, setEditRecord] = useState<HealthRecord | undefined>();
  const [editVaccine, setEditVaccine] = useState<Vaccine | undefined>();

  const pet = pets.find(p => p.id === selectedPetId);

  useEffect(() => {
    if (!user) return;
    petService.getPets(user.id).then((p) => {
      setPets(p);
      if (!selectedPetId && p.length > 0) setSelectedPetId(p[0].id);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !selectedPetId) return;
    loadRecordsAndVaccines();
  }, [user, selectedPetId]);

  async function loadRecordsAndVaccines() {
    if (!user || !selectedPetId) return;
    setLoading(true);
    setError('');
    try {
      const [r, v] = await Promise.all([
        recordService.getRecords(user.id, selectedPetId),
        vaccineService.getVaccines(user.id, selectedPetId),
      ]);
      // Recompute vaccine statuses
      const updated = v.map(vac => ({ ...vac, status: computeVaccineStatus(vac.due_date) }));
      setRecords(r);
      setVaccines(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRecord(data: Omit<HealthRecord, 'id' | 'pet_id'>) {
    if (!user || !selectedPetId) return;
    await recordService.addRecord(user.id, selectedPetId, data);
    await loadRecordsAndVaccines();
  }

  async function handleEditRecord(data: Omit<HealthRecord, 'id' | 'pet_id'>) {
    if (!user || !selectedPetId || !editRecord) return;
    await recordService.updateRecord(user.id, selectedPetId, editRecord.id, data);
    setEditRecord(undefined);
    await loadRecordsAndVaccines();
  }

  async function handleDeleteRecord(recordId: string) {
    if (!user || !selectedPetId) return;
    await recordService.deleteRecord(user.id, selectedPetId, recordId);
    setRecords(prev => prev.filter(r => r.id !== recordId));
  }

  async function handleAddVaccine(data: Omit<Vaccine, 'id' | 'pet_id'>) {
    if (!user || !selectedPetId) return;
    await vaccineService.addVaccine(user.id, selectedPetId, data);
    await loadRecordsAndVaccines();
  }

  async function handleEditVaccine(data: Omit<Vaccine, 'id' | 'pet_id'>) {
    if (!user || !selectedPetId || !editVaccine) return;
    await vaccineService.updateVaccine(user.id, selectedPetId, editVaccine.id, data);
    setEditVaccine(undefined);
    await loadRecordsAndVaccines();
  }

  async function handleDeleteVaccine(vaccineId: string) {
    if (!user || !selectedPetId) return;
    await vaccineService.deleteVaccine(user.id, selectedPetId, vaccineId);
    setVaccines(prev => prev.filter(v => v.id !== vaccineId));
  }

  // Group records by month/year
  const groupedRecords = records.reduce<Record<string, HealthRecord[]>>((acc, r) => {
    const key = r.date.slice(0, 7); // YYYY-MM
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <PageLayout className="bg-white flex flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white/90 px-4 py-3 backdrop-blur-md border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">Health Records</h1>
        <button
          onClick={() => tab === 'records' ? setShowAddRecord(true) : setShowAddVaccine(true)}
          className="size-10 flex items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Plus size={24} />
        </button>
      </header>

      {loading && !pet && <LoadingSpinner />}
      {error && <div className="p-4"><ErrorMessage message={error} /></div>}

      {/* Pet selector */}
      {pets.length > 1 && (
        <div className="px-4 pt-4 flex gap-2 overflow-x-auto no-scrollbar">
          {pets.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPetId(p.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium shrink-0 transition-colors',
                selectedPetId === p.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600',
              )}
            >
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="size-5 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <PawPrint size={14} />
              )}
              {p.name}
            </button>
          ))}
        </div>
      )}

      {pet && (
        <>
          <div className="px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {pet.image_url ? (
                  <img src={pet.image_url} alt={pet.name} className="size-16 rounded-full object-cover border-2 border-white ring-2 ring-primary/20 shadow-md" referrerPolicy="no-referrer" />
                ) : (
                  <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary"><PawPrint size={24} /></div>
                )}
                <div className="absolute -bottom-1 -right-1 size-6 bg-white rounded-full shadow-md flex items-center justify-center text-primary"><PawPrint size={14} /></div>
              </div>
              <div>
                <h2 className="text-xl font-bold">{pet.name}</h2>
                <p className="text-sm font-medium text-slate-500">{pet.breed} &bull; {pet.age} yrs</p>
                <div className="mt-1 flex gap-2">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', pet.status === 'Healthy' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-700')}>{pet.status}</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">{pet.weight}kg</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-2 sticky top-[64px] bg-white z-10">
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setTab('records')}
                className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all', tab === 'records' ? 'bg-white text-primary shadow-sm' : 'text-slate-500')}
              >
                Medical History
              </button>
              <button
                onClick={() => setTab('vaccines')}
                className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all', tab === 'vaccines' ? 'bg-white text-primary shadow-sm' : 'text-slate-500')}
              >
                Vaccinations
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="flex-1 bg-slate-50/50 p-4 space-y-6 pb-24">
              {tab === 'records' && (
                <>
                  {records.length === 0 ? (
                    <p className="text-center text-slate-400 py-10 text-sm">No records yet. Tap + to add one.</p>
                  ) : (
                    Object.entries(groupedRecords).map(([key, recs]) => (
                      <div key={key} className="relative">
                        <div className="mb-4 inline-block bg-slate-200 px-2 py-1 rounded text-xs font-bold text-slate-600">
                          {monthLabel(key)}
                        </div>
                        <div className="relative pl-6 border-l-2 border-slate-200 ml-3 space-y-4">
                          {recs.map(record => (
                            <div key={record.id} className="relative">
                              <div className="absolute -left-[31px] top-4 size-4 rounded-full border-2 border-primary bg-white" />
                              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600"><Stethoscope size={16} /></div>
                                    <span className="text-xs font-medium text-slate-500">{record.date} &bull; {record.type}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <button onClick={() => setEditRecord(record)} className="p-1 text-slate-400 hover:text-primary">
                                      <Calendar size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteRecord(record.id)} className="p-1 text-slate-400 hover:text-red-500">
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                                <h3 className="text-base font-bold mb-1">{record.title}</h3>
                                <p className="text-sm text-slate-500">{[record.location, record.doctor].filter(Boolean).join(' \u2022 ')}</p>
                                {record.notes && <p className="text-xs text-slate-400 mt-1">{record.notes}</p>}
                                {/* Attachments */}
                                {record.attachments && record.attachments.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {record.attachments.map((att, ai) => (
                                      <a
                                        key={ai}
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-xs text-slate-600 hover:border-primary hover:text-primary transition-colors"
                                      >
                                        {att.type === 'xray' ? <Image size={12} className="text-blue-500" /> :
                                          att.type === 'report' ? <FileText size={12} className="text-green-600" /> :
                                            att.type === 'note' ? <FileText size={12} className="text-amber-500" /> :
                                              <File size={12} className="text-slate-400" />}
                                        <span className="truncate max-w-[100px]">{att.name}</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {tab === 'vaccines' && (
                <>
                  {vaccines.length === 0 ? (
                    <p className="text-center text-slate-400 py-10 text-sm">No vaccines yet. Tap + to add one.</p>
                  ) : (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
                      {vaccines.map(v => (
                        <div key={v.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'size-10 rounded-full flex items-center justify-center',
                              v.status === 'up-to-date' ? 'bg-green-100 text-green-600' :
                                v.status === 'due-soon' ? 'bg-orange-100 text-orange-600' :
                                  'bg-red-100 text-red-600',
                            )}>
                              {v.status === 'up-to-date' ? <FileCheck size={20} /> : <Calendar size={20} />}
                            </div>
                            <div>
                              <p className="font-bold text-sm">{v.name}</p>
                              <p className={cn('text-xs font-medium',
                                v.status === 'up-to-date' ? 'text-green-600' :
                                  v.status === 'due-soon' ? 'text-orange-600' : 'text-red-600',
                              )}>
                                {v.status === 'up-to-date' ? `Valid until ${v.due_date}` :
                                  v.status === 'due-soon' ? `Due: ${v.due_date}` :
                                    `Overdue since ${v.due_date}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setEditVaccine(v)} className="p-1.5 text-slate-400 hover:text-primary">
                              <Calendar size={16} />
                            </button>
                            <button onClick={() => handleDeleteVaccine(v.id)} className="p-1.5 text-slate-400 hover:text-red-500">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {!pet && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 p-6">
          <PawPrint size={48} className="opacity-30" />
          <p className="text-sm">No pets found. Add a pet first.</p>
        </div>
      )}

      <BottomNav active="records" />

      {showAddRecord && user && (
        <RecordFormModal userId={user.id} petId={selectedPetId} onSave={handleAddRecord} onClose={() => setShowAddRecord(false)} />
      )}
      {editRecord && user && (
        <RecordFormModal userId={user.id} petId={selectedPetId} record={editRecord} onSave={handleEditRecord} onClose={() => setEditRecord(undefined)} />
      )}
      {showAddVaccine && (
        <VaccineFormModal species={pet?.species} onSave={handleAddVaccine} onClose={() => setShowAddVaccine(false)} />
      )}
      {editVaccine && (
        <VaccineFormModal species={pet?.species} vaccine={editVaccine} onSave={handleEditVaccine} onClose={() => setEditVaccine(undefined)} />
      )}
    </PageLayout>
  );
}
