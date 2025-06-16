
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { ContainerForm } from '@/components/container/container-form';
import { getBLsFromFirestore } from '@/lib/mock-data';
import type { BillOfLading } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Import useRouter

export default function AddContainerPage() {
  const [availableBls, setAvailableBls] = useState<BillOfLading[]>([]);
  const [isLoadingBls, setIsLoadingBls] = useState(true);
  const { toast } = useToast();
  const router = useRouter(); // Initialize router

  const fetchBls = useCallback(async () => {
    setIsLoadingBls(true);
    try {
      const fetchedBls = await getBLsFromFirestore();
      setAvailableBls(fetchedBls.filter(bl => bl.status === 'en cours')); // Only active BLs
    } catch (error) {
      console.error("Failed to fetch BLs for AddContainerPage:", error);
      toast({ title: "Erreur", description: "Impossible de charger les BLs disponibles.", variant: "destructive" });
    } finally {
      setIsLoadingBls(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBls();
  }, [fetchBls]);

  const handleContainerSaved = () => {
    // Navigate to the containers list page after saving
    router.push('/containers');
  };

  if (isLoadingBls) {
    return (
      <>
        <PageHeader title="Ajouter un Nouveau Conteneur" description="Chargement des Connaissements (BLs) disponibles..." />
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Chargement...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Ajouter un Nouveau Conteneur"
        description="Sélectionnez un Connaissement (BL) et remplissez les informations du conteneur."
      />
      {availableBls.length > 0 ? (
        <ContainerForm 
          onContainerSaved={handleContainerSaved} 
          availableBls={availableBls} 
        />
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          <p>Aucun Connaissement (BL) actif trouvé pour associer un conteneur.</p>
          <p>Veuillez d'abord créer un BL ou vous assurer qu'il y en a un 'en cours'.</p>
          <Button onClick={() => router.push('/bls/add')} className="mt-4">
            Créer un Nouveau BL
          </Button>
        </div>
      )}
    </>
  );
}
