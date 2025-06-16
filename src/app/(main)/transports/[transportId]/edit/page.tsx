
"use client";

import React from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { TransportForm } from '@/components/transport/transport-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function EditTransportPage({ params: paramsPromise }: { params: Promise<{ transportId: string }> }) {
  const { transportId } = React.use(paramsPromise);
  
  // TransportForm will fetch its own initial data based on transportId
  // Or it can accept initialData directly if we pre-fetch here (more complex for server components)

  return (
    <>
      <PageHeader
        title="Modifier le Transport"
        description={`Mise à jour des informations du transport N° ${transportId}`}
        actions={
            <Link href="/transports" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Annuler
              </Button>
            </Link>
        }
      />
      <TransportForm transportId={transportId} />
    </>
  );
}
