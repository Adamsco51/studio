
"use client";

import React from 'react'; 
import { PageHeader } from '@/components/shared/page-header';
import { WorkTypeForm } from '@/components/work-type/work-type-form';
import { getWorkTypeByIdFromFirestore } from '@/lib/mock-data'; // Firestore function
import type { WorkType } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function EditWorkTypePage({ params: paramsPromise }: { params: Promise<{ workTypeId: string }> }) {
  const { workTypeId } = React.use(paramsPromise); 
  const [workType, setWorkType] = useState<WorkType | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!workTypeId) {
        setIsLoading(false);
        return;
    }
    const fetchWorkType = async () => {
      setIsLoading(true);
      try {
        const found = await getWorkTypeByIdFromFirestore(workTypeId);
        setWorkType(found);
      } catch (error) {
        console.error("Failed to fetch work type for editing:", error);
        setWorkType(null); 
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkType();
  }, [workTypeId]);

  if (isLoading || workType === undefined) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement du type de travail...</p>
        </div>
    );
  }

  if (!workType) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Type de travail non trouvé.</p>
        <Link href="/work-types" passHref>
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Modifier Type de Travail`}
        description={`Mettez à jour: ${workType.name}`}
         actions={
            <Link href="/work-types" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Annuler
              </Button>
            </Link>
        }
      />
      <WorkTypeForm initialData={workType} />
    </>
  );
}
