
"use client";

import React from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { AccountingEntryForm } from '@/components/accounting/entry-form';
import { getAccountingEntryByIdFromFirestore } from '@/lib/mock-data';
import type { AccountingEntry } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function EditAccountingEntryPage({ params: paramsPromise }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = React.use(paramsPromise);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [entry, setEntry] = useState<AccountingEntry | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && user.jobTitle !== 'Comptable' && user.jobTitle !== 'Manager'))) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    if (!entryId || !user) {
      setIsLoading(false);
      return;
    }
    if (isAdmin || user.jobTitle === 'Comptable' || user.jobTitle === 'Manager') {
      const fetchEntry = async () => {
        setIsLoading(true);
        try {
          const foundEntry = await getAccountingEntryByIdFromFirestore(entryId);
          setEntry(foundEntry);
        } catch (error) {
          console.error("Failed to fetch accounting entry for editing:", error);
          setEntry(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchEntry();
    } else {
        setIsLoading(false);
        setEntry(null);
    }
  }, [entryId, user, isAdmin]);

  if (isLoading || authLoading || entry === undefined) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement de l'écriture...</p>
        </div>
    );
  }
  
  if (!user || (!isAdmin && user.jobTitle !== 'Comptable' && user.jobTitle !== 'Manager')) {
    return <div className="flex h-screen items-center justify-center">Accès non autorisé.</div>;
  }


  if (!entry) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Écriture non trouvée ou accès restreint.</p>
        <Link href="/accounting/invoices" passHref>
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
        title={`Modifier Écriture: ${entry.referenceNumber}`}
        description="Mettez à jour les informations de cette écriture comptable."
        actions={
            <Link href="/accounting/invoices" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Annuler
              </Button>
            </Link>
        }
      />
      <AccountingEntryForm initialData={entry} />
    </>
  );
}

