
"use client";

import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { CompanyProfile } from '@/lib/types';
import { getCompanyProfileFromFirestore } from '@/lib/mock-data'; // Assuming this function exists and fetches the profile

interface CompanyProfileContextType {
  companyProfile: CompanyProfile | null;
  loadingProfile: boolean;
  refreshProfile: () => Promise<void>; // Function to manually refresh the profile
}

const CompanyProfileContext = createContext<CompanyProfileContextType | undefined>(undefined);

const DEFAULT_APP_NAME = "TransitFlow"; // Default name if nothing is fetched or set

export function CompanyProfileProvider({ children }: { children: ReactNode }) {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const profile = await getCompanyProfileFromFirestore();
      setCompanyProfile(profile);
    } catch (error) {
      console.error("Error fetching company profile for context:", error);
      // Set a default or handle error appropriately if needed
      setCompanyProfile({ appName: DEFAULT_APP_NAME }); 
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]); // fetchProfile is memoized by useCallback

  return (
    <CompanyProfileContext.Provider value={{ companyProfile, loadingProfile, refreshProfile: fetchProfile }}>
      {children}
    </CompanyProfileContext.Provider>
  );
}

export function useCompanyProfile() {
  const context = useContext(CompanyProfileContext);
  if (context === undefined) {
    throw new Error('useCompanyProfile must be used within a CompanyProfileProvider');
  }
  return context;
}
