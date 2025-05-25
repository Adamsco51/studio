
"use client";

import React from 'react'; 
import { PageHeader } from '@/components/shared/page-header';
import { ClientForm } from '@/components/client/client-form';
import { getClientByIdFromFirestore } from '@/lib/mock-data'; // Use Firestore function
import type { Client } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function EditClientPage({ params: paramsPromise }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = React.use(paramsPromise); 
  const [client, setClient] = useState<Client | null | undefined>(undefined); 
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setIsLoading(false);
      return;
    }
    const fetchClient = async () => {
      setIsLoading(true);
      try {
        const foundClient = await getClientByIdFromFirestore(clientId);
        setClient(foundClient);
      } catch (error) {
        console.error("Failed to fetch client for editing:", error);
        setClient(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClient();
  }, [clientId]);

  if (isLoading || client === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Chargement du client...</p>
      </div>
    );
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
