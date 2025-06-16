
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileArchive, PlusCircle, Construction } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SecretaryDocumentsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && user.jobTitle !== 'Secrétaire' && user.jobTitle !== 'Manager'))) {
      router.push('/dashboard'); // Redirect if not authorized
    }
  }, [user, isAdmin, authLoading, router]);

  if (authLoading || !user || (!isAdmin && user.jobTitle !== 'Secrétaire' && user.jobTitle !== 'Manager')) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p className="text-muted-foreground">Chargement ou accès non autorisé...</p>
        </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Gestion des Documents (Secrétariat)"
        description="Créez, gérez et envoyez des documents administratifs."
        actions={
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Document (Bientôt)
          </Button>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Documents Récents</CardTitle>
          <CardDescription>Liste des documents gérés par le secrétariat.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Construction className="mx-auto h-16 w-16 text-primary opacity-50" />
          <p className="mt-4 text-lg font-semibold text-muted-foreground">
            Module de Gestion Documentaire en Construction
          </p>
          <p className="text-sm text-muted-foreground">
            Cette section permettra bientôt de créer des modèles, saisir des documents et les envoyer.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
