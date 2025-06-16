
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { AccountingEntryForm } from '@/components/accounting/entry-form';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AddAccountingEntryPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && user.jobTitle !== 'Comptable' && user.jobTitle !== 'Manager'))) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, authLoading, router]);

  if (authLoading || !user || (!isAdmin && user.jobTitle !== 'Comptable' && user.jobTitle !== 'Manager')) {
    return <div className="flex h-screen items-center justify-center">Chargement ou accès non autorisé...</div>;
  }

  return (
    <>
      <PageHeader
        title="Nouvelle Écriture Comptable"
        description="Remplissez les informations ci-dessous pour créer une nouvelle écriture."
      />
      <AccountingEntryForm />
    </>
  );
}

