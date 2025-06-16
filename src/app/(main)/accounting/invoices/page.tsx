
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDigit, PlusCircle, Construction } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AccountingInvoicesPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && user.jobTitle !== 'Comptable' && user.jobTitle !== 'Manager'))) {
      router.push('/dashboard'); // Redirect if not authorized
    }
  }, [user, isAdmin, authLoading, router]);
  
  if (authLoading || !user || (!isAdmin && user.jobTitle !== 'Comptable' && user.jobTitle !== 'Manager')) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p className="text-muted-foreground">Chargement ou accès non autorisé...</p>
        </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Gestion de la Facturation (Comptabilité)"
        description="Suivez les factures, devis, bons de commande et autres écritures comptables."
        actions={
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Facture (Bientôt)
          </Button>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Écritures Comptables Récentes</CardTitle>
          <CardDescription>Liste des opérations financières.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
           <Construction className="mx-auto h-16 w-16 text-primary opacity-50" />
          <p className="mt-4 text-lg font-semibold text-muted-foreground">
            Module de Comptabilité en Construction
          </p>
          <p className="text-sm text-muted-foreground">
            Cette section permettra bientôt de gérer les factures, devis, bons de commande et plus.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
