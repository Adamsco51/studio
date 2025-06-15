
"use client";

import React from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { TruckForm } from '@/components/truck/truck-form';
import { getTruckByIdFromFirestore } from '@/lib/mock-data';
import type { Truck } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function EditTruckPage({ params: paramsPromise }: { params: Promise<{ truckId: string }> }) {
  const { truckId } = React.use(paramsPromise);
  const [truck, setTruck] = useState<Truck | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!truckId) {
        setIsLoading(false);
        return;
    }
    const fetchTruck = async () => {
      setIsLoading(true);
      try {
        const foundTruck = await getTruckByIdFromFirestore(truckId);
        setTruck(foundTruck);
      } catch (error) {
        console.error("Failed to fetch truck for editing:", error);
        setTruck(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTruck();
  }, [truckId]);

  if (isLoading || truck === undefined) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement du camion...</p>
        </div>
    );
  }

  if (!truck) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Camion non trouvé.</p>
        <Link href="/trucks" passHref>
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des camions
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Modifier Camion: ${truck.registrationNumber}`}
        description="Mettez à jour les informations de ce camion."
        actions={
            <Link href="/trucks" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Annuler
              </Button>
            </Link>
        }
      />
      <TruckForm initialData={truck} />
    </>
  );
}
