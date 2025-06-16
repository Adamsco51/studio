
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileArchive, PlusCircle, Construction, Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { getSecretaryDocumentsFromFirestore } from '@/lib/mock-data';
import type { SecretaryDocument } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function SecretaryDocumentsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<SecretaryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && user.jobTitle !== 'Secrétaire' && user.jobTitle !== 'Manager'))) {
      router.push('/dashboard');
    }
  }, [user, isAdmin, authLoading, router]);

  const fetchDocuments = useCallback(async () => {
    if (user && (isAdmin || user.jobTitle === 'Secrétaire' || user.jobTitle === 'Manager')) {
        setIsLoading(true);
        try {
            const fetchedDocs = await getSecretaryDocumentsFromFirestore();
            setDocuments(fetchedDocs);
        } catch (error) {
            console.error("Failed to fetch secretary documents:", error);
            toast({ title: "Erreur", description: "Impossible de charger les documents.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }
  }, [user, isAdmin, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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
        description="Créez, gérez et archivez les documents administratifs."
        actions={
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Document (Bientôt)
          </Button>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Documents</CardTitle>
          <CardDescription>
            {isLoading ? "Chargement..." : `${documents.length} document(s) trouvé(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Chargement des documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileArchive className="mx-auto h-16 w-16 text-primary opacity-50" />
              <p className="mt-4 text-lg font-semibold text-muted-foreground">
                Aucun Document pour le Moment
              </p>
              <p className="text-sm text-muted-foreground">
                Commencez par ajouter un nouveau document.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell><Badge variant="outline">{doc.documentType}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{doc.status}</Badge></TableCell>
                    <TableCell>{format(parseISO(doc.createdAt), 'dd MMM yyyy', { locale: fr })}</TableCell>
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
                La création et la modification avancée de documents avec éditeur (Quill) et l'envoi par email seront bientôt disponibles.
              </p>
            </div>
        </CardContent>
      </Card>
    </>
  );
}

