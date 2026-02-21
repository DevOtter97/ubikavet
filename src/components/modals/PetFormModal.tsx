import { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import type { Pet } from '../../types';

interface Props {
  userId: string;
  pet?: Pet;
  onSave: (data: Omit<Pet, 'id' | 'user_id'>) => Promise<void>;
  onClose: () => void;
}

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];
const STATUS_OPTIONS = ['Healthy', 'Checkup Due', 'Under Treatment', 'Recovering'];

export function PetFormModal({ userId, pet, onSave, onClose }: Props) {
  const [name, setName] = useState(pet?.name ?? '');
  const [breed, setBreed] = useState(pet?.breed ?? '');
  const [species, setSpecies] = useState(pet?.species ?? 'Dog');
  const [age, setAge] = useState(String(pet?.age ?? ''));
  const [weight, setWeight] = useState(String(pet?.weight ?? ''));
  const [status, setStatus] = useState(pet?.status ?? 'Healthy');
  const [microchip, setMicrochip] = useState(pet?.microchip ?? '');
  const [color, setColor] = useState(pet?.color ?? '');
  const [registration, setRegistration] = useState(pet?.registration ?? '');

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(pet?.image_url ?? '');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Revoke object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imageFile && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [imageFile, previewUrl]);

  function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5 MB');
      return;
    }
    setError('');
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }
  function handleDragLeave() {
    setDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  async function uploadImage(): Promise<string> {
    if (!imageFile) return previewUrl; // keep existing URL
    setUploading(true);
    try {
      const ext = imageFile.name.split('.').pop() ?? 'jpg';
      const storageRef = ref(storage, `users/${userId}/pet-images/${Date.now()}.${ext}`);
      await uploadBytes(storageRef, imageFile);
      return await getDownloadURL(storageRef);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim() || !breed.trim()) {
      setError('Name and breed are required');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const image_url = await uploadImage();
      await onSave({
        name: name.trim(),
        breed: breed.trim(),
        species,
        age: Number(age) || 0,
        weight: Number(weight) || 0,
        status,
        image_url,
        microchip: microchip.trim(),
        color: color.trim(),
        registration: registration.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const isBusy = saving || uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">{pet ? 'Edit Pet' : 'Add Pet'}</h2>
          <button onClick={onClose} className="size-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{error}</div>
          )}

          {/* ── Image drop area ── */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase">Photo</label>

            {/* Hidden file input */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInputChange}
            />

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative w-full h-44 rounded-2xl border-2 border-dashed cursor-pointer
                flex flex-col items-center justify-center overflow-hidden transition-all
                ${dragging
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : previewUrl
                    ? 'border-transparent'
                    : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                }
              `}
            >
              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white">
                    <Camera size={28} />
                    <span className="text-sm font-semibold">Change photo</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-400 select-none">
                  <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center">
                    <Upload size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-600">Tap or drop an image</p>
                    <p className="text-xs mt-0.5">JPG, PNG, WEBP · max 5 MB</p>
                  </div>
                </div>
              )}
            </div>

            {previewUrl && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPreviewUrl(''); setImageFile(null); }}
                className="text-xs text-red-400 hover:text-red-600 font-medium mt-1"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* ── Rest of the form ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pet name"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Species</label>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
              >
                {SPECIES_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
              >
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Breed *</label>
              <input
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="e.g. Golden Retriever"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Age (years)</label>
              <input
                type="number"
                min="0"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Weight (kg)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Microchip</label>
              <input
                value={microchip}
                onChange={(e) => setMicrochip(e.target.value)}
                placeholder="Chip number"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Color</label>
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Golden"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Registration</label>
              <input
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                placeholder="#REG-0000"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isBusy}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? 'Uploading image...' : saving ? 'Saving...' : pet ? 'Save Changes' : 'Add Pet'}
          </button>
        </div>
      </div>
    </div>
  );
}
