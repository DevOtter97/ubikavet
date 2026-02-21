import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User, Pet, HealthRecord, Vaccine, Allergy, Appointment, FavoriteClinic } from '../types';

// ─── User Service ────────────────────────────────────────────────────────────

export const userService = {
  async getUser(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as User;
  },

  async createUser(uid: string, data: { name: string; email: string }) {
    await setDoc(doc(db, 'users', uid), {
      ...data,
      createdAt: serverTimestamp(),
    });
  },

  async updateUser(uid: string, data: Partial<{ name: string; email: string }>) {
    await updateDoc(doc(db, 'users', uid), data);
  },
};

// ─── Pet Service ─────────────────────────────────────────────────────────────

export const petService = {
  async getPets(userId: string): Promise<Pet[]> {
    const snap = await getDocs(collection(db, 'users', userId, 'pets'));
    return snap.docs.map((d) => ({ id: d.id, user_id: userId, ...d.data() } as Pet));
  },

  async getPet(userId: string, petId: string): Promise<Pet | null> {
    const snap = await getDoc(doc(db, 'users', userId, 'pets', petId));
    if (!snap.exists()) return null;
    return { id: snap.id, user_id: userId, ...snap.data() } as Pet;
  },

  async addPet(userId: string, data: Omit<Pet, 'id' | 'user_id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'users', userId, 'pets'), data);
    return ref.id;
  },

  async updatePet(userId: string, petId: string, data: Partial<Omit<Pet, 'id' | 'user_id'>>) {
    await updateDoc(doc(db, 'users', userId, 'pets', petId), data);
  },

  async deletePet(userId: string, petId: string) {
    await deleteDoc(doc(db, 'users', userId, 'pets', petId));
  },

  async addReferenceClinic(userId: string, petId: string, clinicId: string) {
    await updateDoc(doc(db, 'users', userId, 'pets', petId), {
      referenceClinicIds: arrayUnion(clinicId),
    });
  },

  async removeReferenceClinic(userId: string, petId: string, clinicId: string) {
    await updateDoc(doc(db, 'users', userId, 'pets', petId), {
      referenceClinicIds: arrayRemove(clinicId),
    });
  },
};

// ─── Record Service ───────────────────────────────────────────────────────────

export const recordService = {
  async getRecords(userId: string, petId: string): Promise<HealthRecord[]> {
    const q = query(
      collection(db, 'users', userId, 'pets', petId, 'records'),
      orderBy('date', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, pet_id: petId, ...d.data() } as HealthRecord));
  },

  async addRecord(
    userId: string,
    petId: string,
    data: Omit<HealthRecord, 'id' | 'pet_id'>,
  ): Promise<string> {
    const ref = await addDoc(
      collection(db, 'users', userId, 'pets', petId, 'records'),
      data,
    );
    return ref.id;
  },

  async updateRecord(
    userId: string,
    petId: string,
    recordId: string,
    data: Partial<Omit<HealthRecord, 'id' | 'pet_id'>>,
  ) {
    await updateDoc(
      doc(db, 'users', userId, 'pets', petId, 'records', recordId),
      data,
    );
  },

  async deleteRecord(userId: string, petId: string, recordId: string) {
    await deleteDoc(doc(db, 'users', userId, 'pets', petId, 'records', recordId));
  },
};

// ─── Vaccine Service ──────────────────────────────────────────────────────────

export const vaccineService = {
  async getVaccines(userId: string, petId: string): Promise<Vaccine[]> {
    const snap = await getDocs(
      collection(db, 'users', userId, 'pets', petId, 'vaccines'),
    );
    return snap.docs.map((d) => ({ id: d.id, pet_id: petId, ...d.data() } as Vaccine));
  },

  async addVaccine(
    userId: string,
    petId: string,
    data: Omit<Vaccine, 'id' | 'pet_id'>,
  ): Promise<string> {
    const ref = await addDoc(
      collection(db, 'users', userId, 'pets', petId, 'vaccines'),
      data,
    );
    return ref.id;
  },

  async updateVaccine(
    userId: string,
    petId: string,
    vaccineId: string,
    data: Partial<Omit<Vaccine, 'id' | 'pet_id'>>,
  ) {
    await updateDoc(
      doc(db, 'users', userId, 'pets', petId, 'vaccines', vaccineId),
      data,
    );
  },

  async deleteVaccine(userId: string, petId: string, vaccineId: string) {
    await deleteDoc(doc(db, 'users', userId, 'pets', petId, 'vaccines', vaccineId));
  },
};

// ─── Allergy Service ──────────────────────────────────────────────────────────

export const allergyService = {
  async getAllergies(userId: string, petId: string): Promise<Allergy[]> {
    const snap = await getDocs(
      collection(db, 'users', userId, 'pets', petId, 'allergies'),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Allergy));
  },

  async addAllergy(userId: string, petId: string, name: string): Promise<string> {
    const ref = await addDoc(
      collection(db, 'users', userId, 'pets', petId, 'allergies'),
      { name },
    );
    return ref.id;
  },

  async deleteAllergy(userId: string, petId: string, allergyId: string) {
    await deleteDoc(doc(db, 'users', userId, 'pets', petId, 'allergies', allergyId));
  },
};

// ─── Appointment Service ──────────────────────────────────────────────────────

export const appointmentService = {
  async getAppointments(userId: string): Promise<Appointment[]> {
    const q = query(
      collection(db, 'users', userId, 'appointments'),
      orderBy('date', 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
  },

  async addAppointment(
    userId: string,
    data: Omit<Appointment, 'id'>,
  ): Promise<string> {
    const ref = await addDoc(collection(db, 'users', userId, 'appointments'), data);
    return ref.id;
  },

  async updateAppointment(
    userId: string,
    appointmentId: string,
    data: Partial<Omit<Appointment, 'id'>>,
  ) {
    await updateDoc(doc(db, 'users', userId, 'appointments', appointmentId), data);
  },

  async deleteAppointment(userId: string, appointmentId: string) {
    await deleteDoc(doc(db, 'users', userId, 'appointments', appointmentId));
  },
};

// ─── Favorite Clinic Service ──────────────────────────────────────────────────

export const favoriteClinicService = {
  async getFavorites(userId: string): Promise<FavoriteClinic[]> {
    const snap = await getDocs(collection(db, 'users', userId, 'favoriteClinics'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FavoriteClinic));
  },

  async addFavorite(userId: string, data: Omit<FavoriteClinic, 'id'>): Promise<string> {
    // Use a hash of name+lat+lng as doc ID to prevent duplicates
    const docId = btoa(`${data.name}|${data.lat}|${data.lng}`).replace(/[/+=]/g, '_');
    await setDoc(doc(db, 'users', userId, 'favoriteClinics', docId), {
      ...data,
      savedAt: new Date().toISOString(),
    });
    return docId;
  },

  async removeFavorite(userId: string, favoriteId: string) {
    await deleteDoc(doc(db, 'users', userId, 'favoriteClinics', favoriteId));
  },

  async isFavorite(userId: string, name: string, lat: number, lng: number): Promise<string | null> {
    const docId = btoa(`${name}|${lat}|${lng}`).replace(/[/+=]/g, '_');
    const snap = await getDoc(doc(db, 'users', userId, 'favoriteClinics', docId));
    return snap.exists() ? docId : null;
  },
};
