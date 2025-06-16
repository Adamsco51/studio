
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDigit, PlusCircle, Construction, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { getAccountingEntriesFromFirestore } from '@/lib/mock-data';
import type { AccountingEntry } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function AccountingInvoicesPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && user.jobTitle !== 'Comptable' && user.jobTitle !== 'Manager'))) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, authLoading, router]);

  const fetchEntries = useCallback(async () => {
    if (user && (isAdmin || user.jobTitle === 'Comptable' || user.jobTitle === 'Manager')) {
        setIsLoading(true);
        try {
            const fetchedEntries = await getAccountingEntriesFromFirestore();
            setEntries(fetchedEntries);
        } catch (error) {
            console.error("Failed to fetch accounting entries:", error);
            toast({ title: "Erreur", description: "Impossible de charger les écritures comptables.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
  }, [user, isAdmin, toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);
  
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
        title="Gestion de la Facturation et Comptabilité"
        description="Suivez les factures, devis, bons de commande et autres écritures comptables."
        actions={
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Écriture (Bientôt)
          </Button>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Écritures Comptables Récentes</CardTitle>
           <CardDescription>
            {isLoading ? "Chargement..." : `${entries.length} écriture(s) trouvée(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Chargement des écritures...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <FileDigit className="mx-auto h-16 w-16 text-primary opacity-50" />
              <p className="mt-4 text-lg font-semibold text-muted-foreground">
                Aucune Écriture Comptable pour le Moment
              </p>
              <p className="text-sm text-muted-foreground">
                Commencez par ajouter une nouvelle écriture.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Réf.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date Émission</TableHead>
                  <TableHead>Client/BL</TableHead>
                  <TableHead className="text-right">Montant Total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.referenceNumber}</TableCell>
                    <TableCell><Badge variant="outline">{entry.entryType}</Badge></TableCell>
                    <TableCell>{format(parseISO(entry.issueDate), 'dd MMM yyyy', { locale: fr })}</TableCell>
                    <TableCell>
                        {entry.relatedClientId || entry.relatedBlId || <span className="text-muted-foreground italic">N/A</span>}
                    </TableCell>
                    <TableCell className="text-right">{entry.totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: entry.currency })}</TableCell>
                    <TableCell><Badge variant="secondary">{entry.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" disabled>Voir</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="mt-6 text-center py-6 border-t border-dashed">
              <Construction className="mx-auto h-12 w-12 text-muted-foreground opacity-70" />
              <p className="mt-3 text-sm text-muted-foreground">
                La création et la gestion détaillée des factures, devis, et autres écritures comptables seront bientôt disponibles.
              </p>
            </div>
        </CardContent>
      </Card>
    </>
  );
}

