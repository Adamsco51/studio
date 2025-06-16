
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUserType } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import type { AuthUser, UserProfile, UserProfileJobTitle } from '@/lib/types';
import { getUserProfile, createUserProfile } from '@/lib/mock-data';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  refreshAuthContextUser: () => Promise<void>; // Function to refresh user data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchAndSetUser = useCallback(async (firebaseUser: FirebaseUserType | null) => {
    if (firebaseUser) {
      let userRole: 'admin' | 'employee' = 'employee';
      let userJobTitle: UserProfileJobTitle = 'Agent Opérationnel';
      let userProfile = await getUserProfile(firebaseUser.uid);

      if (firebaseUser.uid === process.env.NEXT_PUBLIC_ADMIN_UID) {
        if (!userProfile || userProfile.role !== 'admin') {
          try {
            await createUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, 'admin', 'Manager');
            userProfile = await getUserProfile(firebaseUser.uid);
          } catch (error) {
            console.error("Error ensuring admin profile:", error);
          }
        }
      }
      
      if (userProfile) {
        userRole = userProfile.role;
        userJobTitle = userProfile.jobTitle || 'Agent Opérationnel';
      } else if (firebaseUser.uid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
        try {
          await createUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, 'employee', 'Agent Opérationnel');
          userProfile = await getUserProfile(firebaseUser.uid);
          if(userProfile) {
              userRole = userProfile.role;
              userJobTitle = userProfile.jobTitle || 'Agent Opérationnel';
          }
        } catch (error) {
          console.error("Error creating default user profile:", error);
        }
      }

      const appUser: AuthUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || userProfile?.displayName || firebaseUser.email || "Utilisateur",
        role: userRole,
        jobTitle: userJobTitle,
      };
      setUser(appUser);
      setIsAdmin(userRole === 'admin');
      
    } else {
      setUser(null);
      setIsAdmin(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true); // Set loading true when starting to listen
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        fetchAndSetUser(firebaseUser);
    });
    return () => unsubscribe();
  }, [fetchAndSetUser]);

  const refreshAuthContextUser = useCallback(async () => {
    const currentFirebaseUser = auth.currentUser;
    setLoading(true);
    await fetchAndSetUser(currentFirebaseUser);
  }, [fetchAndSetUser]);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, refreshAuthContextUser }}>
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
