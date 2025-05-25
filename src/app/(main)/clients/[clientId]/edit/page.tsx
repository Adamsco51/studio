
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { ClientForm } from '@/components/client/client-form';
import { MOCK_CLIENTS } from '@/lib/mock-data';
import type { Client } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EditClientPage({ params }: { params: { clientId: string } }) {
  const [client, setClient] = useState<Client | null | undefined>(undefined); // undefined for loading state
  const router = useRouter();

  useEffect(() => {
    const foundClient = MOCK_CLIENTS.find(c => c.id === params.clientId);
    setClient(foundClient || null);
  }, [params.clientId]);

  if (client === undefined) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  if (!client) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Client non trouvé.</p>
        <Link href="/clients" passHref>
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des clients
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <>
      <PageHeader
        title={`Modifier Client: ${client.name}`}
        description="Mettez à jour les informations de ce client."
        actions={
            <Link href={`/clients/${client.id}`} passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Annuler
              </Button>
            </Link>
        }
      />
      <ClientForm initialData={client} />
    </>
  );
}
