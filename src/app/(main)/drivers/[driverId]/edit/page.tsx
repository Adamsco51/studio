
"use client";

import React from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { DriverForm } from '@/components/driver/driver-form';
import { getDriverByIdFromFirestore } from '@/lib/mock-data';
import type { Driver } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function EditDriverPage({ params: paramsPromise }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = React.use(paramsPromise);
  const [driver, setDriver] = useState<Driver | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!driverId) {
        setIsLoading(false);
        return;
    }
    const fetchDriver = async () => {
      setIsLoading(true);
      try {
        const foundDriver = await getDriverByIdFromFirestore(driverId);
        setDriver(foundDriver);
      } catch (error) {
        console.error("Failed to fetch driver for editing:", error);
        setDriver(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDriver();
  }, [driverId]);

  if (isLoading || driver === undefined) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement du chauffeur...</p>
        </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Chauffeur non trouvé.</p>
        <Link href="/drivers" passHref>
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des chauffeurs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Modifier Chauffeur: ${driver.name}`}
        description="Mettez à jour les informations de ce chauffeur."
        actions={
            <Link href="/drivers" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Annuler
              </Button>
            </Link>
        }
      />
      <DriverForm initialData={driver} />
    </>
  );
}
