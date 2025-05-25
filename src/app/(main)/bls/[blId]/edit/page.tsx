
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { BLForm } from '@/components/bl/bl-form';
import { MOCK_BILLS_OF_LADING, MOCK_CLIENTS, MOCK_WORK_TYPES } from '@/lib/mock-data';
import type { BillOfLading } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditBLPage({ params }: { params: { blId: string } }) {
  const [bl, setBl] = useState<BillOfLading | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    const foundBl = MOCK_BILLS_OF_LADING.find(b => b.id === params.blId);
    setBl(foundBl || null);
  }, [params.blId]);

  if (bl === undefined) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
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
      <BLForm initialData={bl} clients={MOCK_CLIENTS} workTypes={MOCK_WORK_TYPES} />
    </>
  );
}
