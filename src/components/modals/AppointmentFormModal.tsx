import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Appointment, Pet } from '../../types';

interface Props {
  appointment?: Appointment;
  pets: Pet[];
  defaultDate?: string;
  onSave: (data: Omit<Appointment, 'id'>) => Promise<void>;
  onClose: () => void;
}

const APPOINTMENT_TYPES = ['Vaccination', 'Annual Checkup', 'Dental Cleaning', 'Surgery', 'Emergency', 'Grooming', 'Consultation', 'Other'];

export function AppointmentFormModal({ appointment, pets, defaultDate, onSave, onClose }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [petId, setPetId] = useState(appointment?.petId ?? pets[0]?.id ?? '');
  const [date, setDate] = useState(appointment?.date ?? defaultDate ?? today);
  const [time, setTime] = useState(appointment?.time ?? '10:00');
  const [type, setType] = useState(appointment?.type ?? 'Annual Checkup');
  const [clinic, setClinic] = useState(appointment?.clinic ?? '');
  const [notes, setNotes] = useState(appointment?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedPet = pets.find(p => p.id === petId);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  async function handleSave() {
    if (!petId) {
      setError('Please select a pet');
      return;
    }
    if (!date || !time) {
      setError('Date and time are required');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({
        petId,
        petName: selectedPet?.name ?? '',
        date,
        time,
        type,
        clinic: clinic.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">{appointment ? 'Edit Appointment' : 'New Appointment'}</h2>
          <button onClick={onClose} className="size-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{error}</div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Pet</label>
            <select
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
            >
              {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
            >
              {APPOINTMENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Clinic (optional)</label>
            <input
              value={clinic}
              onChange={(e) => setClinic(e.target.value)}
              placeholder="e.g. City Paws Vet"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : appointment ? 'Save Changes' : 'Book Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}
