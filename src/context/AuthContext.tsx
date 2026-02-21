import { createContext, useState, useEffect, type ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { userService } from '../services/firestore';
import type { User } from '../types';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

async function mapFirebaseUser(fbUser: FirebaseUser): Promise<User> {
  const stored = await userService.getUser(fbUser.uid);
  return {
    id: fbUser.uid,
    email: fbUser.email ?? '',
    name: stored?.name ?? fbUser.displayName ?? 'User',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const u = await mapFirebaseUser(fbUser);
        setUser(u);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const uid = result.user.uid;
    const existing = await userService.getUser(uid);
    if (!existing) {
      await userService.createUser(uid, {
        name: result.user.displayName ?? 'User',
        email: result.user.email ?? '',
      });
    }
  }

  async function signup(email: string, password: string, name: string) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await userService.createUser(result.user.uid, { name, email });
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, signup, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}
