
"use client";

import React from 'react'; // Import React
import { PageHeader } from '@/components/shared/page-header';
import { BLForm } from '@/components/bl/bl-form';
import { getBLByIdFromFirestore } from '@/lib/mock-data'; // Use Firestore function
import type { BillOfLading } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function EditBLPage({ params: paramsPromise }: { params: Promise<{ blId: string }> }) {
  const { blId } = React.use(paramsPromise); 
  const [bl, setBl] = useState<BillOfLading | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!blId) {
        setIsLoading(false);
        return;
    }
    const fetchBl = async () => {
      setIsLoading(true);
      try {
        const foundBl = await getBLByIdFromFirestore(blId);
        setBl(foundBl);
      } catch (error) {
        console.error("Failed to fetch BL for editing:", error);
        setBl(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBl();
  }, [blId]);

  if (isLoading || bl === undefined) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement du BL...</p>
        </div>
    );
  }

  if (!bl) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Connaissement non trouvé.</p>
        <Link href="/bls" passHref>
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des BLs
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <>
      <PageHeader
        title={`Modifier BL N°: ${bl.blNumber}`}
        description="Mettez à jour les informations de ce connaissement."
        actions={
            <Link href={`/bls/${bl.id}`} passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Annuler
              </Button>
            </Link>
        }
      />
      <BLForm initialData={bl} />
    </>
  );
}
