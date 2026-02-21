import { useState, useEffect } from 'react';
import { X, Shield, ShieldCheck } from 'lucide-react';
import type { Vaccine } from '../../types';
import { computeVaccineStatus } from '../../lib/utils';

interface Props {
  species?: string;
  vaccine?: Vaccine;
  onSave: (data: Omit<Vaccine, 'id' | 'pet_id'>) => Promise<void>;
  onClose: () => void;
}

interface VaccinePreset {
  name: string;
  mandatory: boolean;
}

// ── Vacunas por especie (España) ─────────────────────────────────────────────

const VACCINES_BY_SPECIES: Record<string, VaccinePreset[]> = {
  Dog: [
    // Obligatorias
    { name: 'Rabia', mandatory: true },
    // Esenciales / recomendadas
    { name: 'Moquillo (Distemper)', mandatory: false },
    { name: 'Parvovirus canino', mandatory: false },
    { name: 'Hepatitis infecciosa (Adenovirus)', mandatory: false },
    { name: 'Leptospirosis', mandatory: false },
    { name: 'Parainfluenza canina', mandatory: false },
    // Opcionales según estilo de vida
    { name: 'Tos de las perreras (Bordetella)', mandatory: false },
    { name: 'Leishmaniosis', mandatory: false },
    { name: 'Enfermedad de Lyme (Borrelia)', mandatory: false },
    { name: 'Coronavirus canino', mandatory: false },
  ],
  Cat: [
    // Obligatoria en muchas comunidades
    { name: 'Rabia', mandatory: true },
    // Esenciales / recomendadas
    { name: 'Panleucopenia felina', mandatory: false },
    { name: 'Rinotraqueítis (Herpesvirus felino)', mandatory: false },
    { name: 'Calicivirus felino', mandatory: false },
    // Opcionales
    { name: 'Leucemia felina (FeLV)', mandatory: false },
    { name: 'Clamidiosis felina', mandatory: false },
    { name: 'PIF (Peritonitis infecciosa felina)', mandatory: false },
  ],
  Rabbit: [
    { name: 'Mixomatosis', mandatory: false },
    { name: 'Enfermedad hemorrágica vírica (EHV)', mandatory: false },
    { name: 'EHV-2 (nueva variante)', mandatory: false },
  ],
  Bird: [
    { name: 'Enfermedad de Newcastle', mandatory: false },
    { name: 'Viruela aviar', mandatory: false },
    { name: 'Enfermedad de Marek', mandatory: false },
  ],
  Other: [
    { name: 'Rabia', mandatory: false },
  ],
};

function getPresetsForSpecies(species?: string): VaccinePreset[] {
  if (!species) return [];
  // Try exact match first, then fallback to "Other"
  return VACCINES_BY_SPECIES[species] ?? VACCINES_BY_SPECIES['Other'] ?? [];
}

export function VaccineFormModal({ species, vaccine, onSave, onClose }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const presets = getPresetsForSpecies(species);
  const [name, setName] = useState(vaccine?.name ?? '');
  const [customName, setCustomName] = useState('');
  const [dueDate, setDueDate] = useState(vaccine?.due_date ?? today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const mandatoryPresets = presets.filter(v => v.mandatory);
  const optionalPresets = presets.filter(v => !v.mandatory);

  async function handleSave() {
    const finalName = name === '__other__' ? customName.trim() : name;
    if (!finalName) {
      setError('El nombre de la vacuna es obligatorio');
      return;
    }
    if (!dueDate) {
      setError('La fecha es obligatoria');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({
        name: finalName,
        due_date: dueDate,
        status: computeVaccineStatus(dueDate),
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
          <h2 className="text-lg font-bold">{vaccine ? 'Editar vacuna' : 'Añadir vacuna'}</h2>
          <button onClick={onClose} className="size-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{error}</div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Vacuna</label>
            <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
            >
              <option value="">Seleccionar vacuna...</option>

              {mandatoryPresets.length > 0 && (
                <optgroup label="🛡️ Obligatorias">
                  {mandatoryPresets.map(v => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                  ))}
                </optgroup>
              )}

              {optionalPresets.length > 0 && (
                <optgroup label="💉 Recomendadas / Opcionales">
                  {optionalPresets.map(v => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                  ))}
                </optgroup>
              )}

              <optgroup label="Otra">
                <option value="__other__">Otra vacuna...</option>
              </optgroup>
            </select>
          </div>

          {/* Mandatory/optional indicator */}
          {name && name !== '__other__' && (
            <div className="flex items-center gap-2">
              {presets.find(v => v.name === name)?.mandatory ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                  <Shield size={12} /> Obligatoria en España
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  <ShieldCheck size={12} /> Recomendada
                </span>
              )}
            </div>
          )}

          {name === '__other__' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Nombre de la vacuna</label>
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Escribir nombre..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Fecha de vencimiento</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {saving ? 'Guardando...' : vaccine ? 'Guardar cambios' : 'Añadir vacuna'}
          </button>
        </div>
      </div>
    </div>
  );
}
