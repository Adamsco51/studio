
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { SecretaryDocumentForm } from '@/components/secretary/document-form';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AddSecretaryDocumentPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && user.jobTitle !== 'Secrétaire' && user.jobTitle !== 'Manager'))) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, authLoading, router]);

  if (authLoading || !user || (!isAdmin && user.jobTitle !== 'Secrétaire' && user.jobTitle !== 'Manager')) {
    return <div className="flex h-screen items-center justify-center">Chargement ou accès non autorisé...</div>;
  }

  return (
    <>
      <PageHeader
        title="Nouveau Document (Secrétariat)"
        description="Remplissez les informations ci-dessous pour créer un nouveau document."
      />
      <SecretaryDocumentForm />
    </>
  );
}
