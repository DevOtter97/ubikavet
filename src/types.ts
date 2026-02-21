export type VaccineStatus = 'up-to-date' | 'due-soon' | 'overdue';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

export interface Pet {
  id: string;
  user_id: string;
  name: string;
  breed: string;
  species: string;
  age: number;
  weight: number;
  status: string;
  image_url: string;
  microchip: string;
  color: string;
  registration: string;
  referenceClinicIds?: string[];
}

export interface RecordAttachment {
  type: 'note' | 'report' | 'xray' | 'other';
  name: string;
  url: string;
}

export interface HealthRecord {
  id: string;
  pet_id: string;
  date: string;
  type: string;
  title: string;
  location: string;
  doctor: string;
  notes: string;
  attachments?: RecordAttachment[];
}

export interface Vaccine {
  id: string;
  pet_id: string;
  name: string;
  due_date: string;
  status: VaccineStatus;
}

export interface Allergy {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  petId: string;
  petName: string;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:MM
  type: string;
  clinic?: string;
  notes?: string;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviews_count: number;
  image_url: string;
  open_until: string;
}

export interface FavoriteClinic {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  lat: number;
  lng: number;
  mapsUrl: string | null;
  savedAt?: string;
}
