
"use client";

import React from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { ContainerForm } from '@/components/container/container-form';
import { getContainerByIdFromFirestore, getBLsFromFirestore } from '@/lib/mock-data';
import type { Container, BillOfLading } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function EditContainerPage({ params: paramsPromise }: { params: Promise<{ containerId: string }> }) {
  const { containerId } = React.use(paramsPromise);
  const [container, setContainer] = useState<Container | null | undefined>(undefined);
  const [availableBls, setAvailableBls] = useState<BillOfLading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    if (!containerId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [foundContainer, fetchedBls] = await Promise.all([
        getContainerByIdFromFirestore(containerId),
        getBLsFromFirestore(),
      ]);
      setContainer(foundContainer);
      setAvailableBls(fetchedBls.filter(bl => bl.status === 'en cours' || (foundContainer && bl.id === foundContainer.blId)));
    } catch (error) {
      console.error("Failed to fetch container or BLs for editing:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données pour la modification.", variant: "destructive" });
      setContainer(null);
    } finally {
      setIsLoading(false);
    }
  }, [containerId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleContainerSaved = () => {
    // Navigate to the containers list page or BL detail page after saving
    router.push(container?.blId ? `/bls/${container.blId}` : '/containers');
  };

  if (isLoading || container === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Chargement du conteneur...</p>
      </div>
    );
  }

  if (!container) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Conteneur non trouvé.</p>
        <Link href="/containers" passHref>
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des conteneurs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Modifier Conteneur: ${container.containerNumber}`}
        description={`BL Associé: ${container.blNumber || container.blId}`}
        actions={
          <Link href={container.blId ? `/bls/${container.blId}` : '/containers'} passHref>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Annuler
            </Button>
          </Link>
        }
      />
      <ContainerForm 
        initialData={container} 
        blId={container.blId} // Pass blId from fetched container
        availableBls={availableBls} // Pass available BLs, ContainerForm won't show selector if blId is provided
        onContainerSaved={handleContainerSaved} 
      />
    </>
  );
}
