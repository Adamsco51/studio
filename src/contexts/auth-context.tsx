
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUserType } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import type { AuthUser } from '@/lib/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUserType | null) => {
      if (firebaseUser) {
        const appUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          // Use email as displayName if displayName is not set, or a generic "User"
          displayName: firebaseUser.displayName || firebaseUser.email || "Utilisateur",
        };
        setUser(appUser);
        // Check if the logged-in user is the admin
        setIsAdmin(firebaseUser.uid === process.env.NEXT_PUBLIC_ADMIN_UID);
        // In a real app, you might fetch user roles from Firestore here
        // e.g., fetchUserRole(firebaseUser.uid).then(role => setRole(role));
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {!loading && children}
      {loading && <div className="flex h-screen items-center justify-center">Chargement de l'authentification...</div>}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
