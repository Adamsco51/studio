
"use client";

import React from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { SecretaryDocumentForm } from '@/components/secretary/document-form';
import { getSecretaryDocumentByIdFromFirestore } from '@/lib/mock-data';
import type { SecretaryDocument } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

export default function EditSecretaryDocumentPage({ params: paramsPromise }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = React.use(paramsPromise);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [document, setDocument] = useState<SecretaryDocument | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && user.jobTitle !== 'Secrétaire' && user.jobTitle !== 'Manager'))) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    if (!documentId || !user) {
      setIsLoading(false);
      return;
    }
    // Only fetch if user has appropriate role or is admin
    if (isAdmin || user.jobTitle === 'Secrétaire' || user.jobTitle === 'Manager') {
      const fetchDocument = async () => {
        setIsLoading(true);
        try {
          const foundDoc = await getSecretaryDocumentByIdFromFirestore(documentId);
          setDocument(foundDoc);
        } catch (error) {
          console.error("Failed to fetch secretary document for editing:", error);
          setDocument(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDocument();
    } else {
      setIsLoading(false);
      setDocument(null); // Explicitly set to null if no access
    }
  }, [documentId, user, isAdmin]); // isAdmin and user.jobTitle included in dependency array

  if (isLoading || authLoading || document === undefined) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement du document...</p>
        </div>
    );
  }
  
  if (!user || (!isAdmin && user.jobTitle !== 'Secrétaire' && user.jobTitle !== 'Manager')) {
    return <div className="flex h-screen items-center justify-center">Accès non autorisé.</div>;
  }


  if (!document) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Document non trouvé ou accès restreint.</p>
        <Link href="/secretary/documents" passHref>
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
        title={`Modifier Document: ${document.title}`}
        description="Mettez à jour les informations de ce document."
        actions={
            <Link href="/secretary/documents" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Annuler
              </Button>
            </Link>
        }
      />
      <SecretaryDocumentForm initialData={document} />
    </>
  );
}
