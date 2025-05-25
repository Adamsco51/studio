
"use client";

import React from 'react'; // Import React
import { PageHeader } from '@/components/shared/page-header';
import { WorkTypeForm } from '@/components/work-type/work-type-form';
import { MOCK_WORK_TYPES } from '@/lib/mock-data';
import type { WorkType } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function EditWorkTypePage({ params: paramsPromise }: { params: Promise<{ workTypeId: string }> }) {
  const { workTypeId } = React.use(paramsPromise); // Resolve params using React.use
  const [workType, setWorkType] = useState<WorkType | null | undefined>(undefined); // undefined for loading state

  useEffect(() => {
    if (!workTypeId) return; // Ensure workTypeId is resolved
    const found = MOCK_WORK_TYPES.find(wt => wt.id === workTypeId);
    setWorkType(found || null);
  }, [workTypeId]);

  if (workType === undefined) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
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
