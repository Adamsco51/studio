
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUserType } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import type { AuthUser, UserProfile } from '@/lib/types';
import { getUserProfile, createUserProfile } from '@/lib/mock-data'; // Import Firestore service functions

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUserType | null) => {
      if (firebaseUser) {
        let userRole: 'admin' | 'employee' = 'employee'; // Default role
        let userJobTitle: UserProfile['jobTitle'] = 'Agent Opérationnel'; // Default job title
        let userProfile = await getUserProfile(firebaseUser.uid);

        // Ensure admin user has admin role in Firestore
        if (firebaseUser.uid === process.env.NEXT_PUBLIC_ADMIN_UID) {
          if (!userProfile || userProfile.role !== 'admin') {
            // Create or update profile for designated admin
            try {
              await createUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, 'admin', 'Manager');
              userProfile = await getUserProfile(firebaseUser.uid); // Re-fetch to get the latest profile
            } catch (error) {
              console.error("Error ensuring admin profile:", error);
            }
          }
        }
        
        if (userProfile) {
          userRole = userProfile.role;
          userJobTitle = userProfile.jobTitle || 'Agent Opérationnel';
        } else if (firebaseUser.uid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
          // If profile doesn't exist and not the designated admin, create one with default 'employee' role
          try {
            await createUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, 'employee', 'Agent Opérationnel');
            userProfile = await getUserProfile(firebaseUser.uid); // Re-fetch
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
