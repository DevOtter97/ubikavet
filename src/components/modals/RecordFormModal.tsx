import { useState, useEffect, useRef } from 'react';
import { X, Paperclip, FileText, Image, File, Trash2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import type { HealthRecord, RecordAttachment } from '../../types';

interface Props {
  userId: string;
  petId: string;
  record?: HealthRecord;
  onSave: (data: Omit<HealthRecord, 'id' | 'pet_id'>) => Promise<void>;
  onClose: () => void;
}

const RECORD_TYPES = ['Annual Checkup', 'Vaccination', 'Surgery', 'Dental', 'Emergency', 'Consultation', 'Lab Work', 'Other'];

const ATTACHMENT_TYPES: { value: RecordAttachment['type']; label: string }[] = [
  { value: 'note', label: 'Nota' },
  { value: 'report', label: 'Informe' },
  { value: 'xray', label: 'Radiografía' },
  { value: 'other', label: 'Otro' },
];

function attachmentIcon(type: RecordAttachment['type']) {
  switch (type) {
    case 'xray': return <Image size={14} className="text-blue-500" />;
    case 'report': return <FileText size={14} className="text-green-600" />;
    case 'note': return <FileText size={14} className="text-amber-500" />;
    default: return <File size={14} className="text-slate-400" />;
  }
}

function attachmentLabel(type: RecordAttachment['type']) {
  return ATTACHMENT_TYPES.find(t => t.value === type)?.label ?? type;
}

export function RecordFormModal({ userId, petId, record, onSave, onClose }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(record?.date ?? today);
  const [type, setType] = useState(record?.type ?? 'Annual Checkup');
  const [title, setTitle] = useState(record?.title ?? '');
  const [location, setLocation] = useState(record?.location ?? '');
  const [doctor, setDoctor] = useState(record?.doctor ?? '');
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Attachments
  const [existingAttachments, setExistingAttachments] = useState<RecordAttachment[]>(record?.attachments ?? []);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; type: RecordAttachment['type'] }[]>([]);
  const [attachType, setAttachType] = useState<RecordAttachment['type']>('report');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newPending = files.map(file => ({ file, type: attachType }));
    setPendingFiles(prev => [...prev, ...newPending]);
    e.target.value = '';
  }

  function removePending(idx: number) {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function removeExisting(idx: number) {
    setExistingAttachments(prev => prev.filter((_, i) => i !== idx));
  }

  async function uploadFiles(): Promise<RecordAttachment[]> {
    const uploaded: RecordAttachment[] = [];
    for (const { file, type: attachmentType } of pendingFiles) {
      const ext = file.name.split('.').pop() ?? 'bin';
      const storageRef = ref(storage, `users/${userId}/pets/${petId}/records/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      uploaded.push({ type: attachmentType, name: file.name, url });
    }
    return uploaded;
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const uploadedAttachments = await uploadFiles();
      const allAttachments = [...existingAttachments, ...uploadedAttachments];

      await onSave({
        date,
        type,
        title: title.trim(),
        location: location.trim(),
        doctor: doctor.trim(),
        notes: notes.trim(),
        ...(allAttachments.length > 0 ? { attachments: allAttachments } : {}),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const totalAttachments = existingAttachments.length + pendingFiles.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">{record ? 'Edit Record' : 'Add Record'}</h2>
          <button onClick={onClose} className="size-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{error}</div>
          )}

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
              <label className="text-xs font-semibold text-slate-500 uppercase">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
              >
                {RECORD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. General Wellness Exam"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Clinic / Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. City Paws Vet"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Doctor</label>
              <input
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                placeholder="e.g. Dr. Smith"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
              />
            </div>
          </div>

          {/* ── Attachments ── */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-500 uppercase">
              Adjuntos {totalAttachments > 0 && `(${totalAttachments})`}
            </label>

            {/* Existing attachments */}
            {existingAttachments.map((att, i) => (
              <div key={`existing-${i}`} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                {attachmentIcon(att.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{att.name}</p>
                  <p className="text-[10px] text-slate-400">{attachmentLabel(att.type)}</p>
                </div>
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary font-semibold mr-1">
                  Ver
                </a>
                <button onClick={() => removeExisting(i)} className="text-red-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {/* Pending files */}
            {pendingFiles.map((pf, i) => (
              <div key={`pending-${i}`} className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50/50 border border-blue-100">
                {attachmentIcon(pf.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{pf.file.name}</p>
                  <p className="text-[10px] text-slate-400">{attachmentLabel(pf.type)} · {(pf.file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => removePending(i)} className="text-red-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {/* Add attachment controls */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />

            <div className="flex items-center gap-2">
              <select
                value={attachType}
                onChange={(e) => setAttachType(e.target.value as RecordAttachment['type'])}
                className="px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-primary"
              >
                {ATTACHMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-xs font-semibold text-slate-500 hover:border-primary hover:text-primary transition-colors"
              >
                <Paperclip size={14} />
                Adjuntar archivo
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold mt-2 disabled:opacity-50"
          >
            {saving ? (pendingFiles.length > 0 ? 'Subiendo archivos...' : 'Saving...') : record ? 'Save Changes' : 'Add Record'}
          </button>
        </div>
      </div>
    </div>
  );
}
