
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileArchive, PlusCircle, Construction, Loader2, AlertTriangle, Edit, Trash2, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { 
    getSecretaryDocumentsFromFirestore, 
    deleteSecretaryDocumentFromFirestore,
    addApprovalRequestToFirestore,
    getPinIssuedRequestForEntity,
    completeApprovalRequestWithPin,
} from '@/lib/mock-data';
import type { SecretaryDocument, ApprovalRequest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDesc, // Aliased to avoid conflict
  DialogFooter as DialogFoot,       // Aliased to avoid conflict
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function SecretaryDocumentsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<SecretaryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [docTargetedForAction, setDocTargetedForAction] = useState<SecretaryDocument | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [currentActionType, setCurrentActionType] = useState<'edit' | 'delete' | null>(null);
  
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [activePinRequest, setActivePinRequest] = useState<ApprovalRequest | null>(null);
  const [pinActionType, setPinActionType] = useState<'edit' | 'delete' | null>(null);


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
            setDocuments(fetchedDocs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
            console.error("Failed to fetch secretary documents:", error);
            toast({ title: "Erreur", description: "Impossible de charger les documents.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    } else if (!user && !authLoading) {
        setIsLoading(false);
    }
  }, [user, isAdmin, authLoading, toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleEditAction = async (doc: SecretaryDocument) => {
    if (!user) return;
    setDocTargetedForAction(doc);
    setCurrentActionType('edit');
    setPinActionType('edit');

    const canEditDirectly = isAdmin || user.jobTitle === 'Secrétaire' || user.jobTitle === 'Manager';

    if (canEditDirectly) {
        router.push(`/secretary/documents/${doc.id}/edit`);
    } else {
        setIsProcessingAction(true);
        try {
            const pinRequest = await getPinIssuedRequestForEntity('secretaryDocument', doc.id, 'edit');
            if (pinRequest) {
                setActivePinRequest(pinRequest);
                setShowPinDialog(true);
            } else {
                setActionReason('');
                setShowReasonDialog(true); // To request approval
            }
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive" });
        } finally {
            setIsProcessingAction(false);
        }
    }
  };

  const handleDeleteAction = async (doc: SecretaryDocument) => {
    if (!user) return;
    setDocTargetedForAction(doc);
    setCurrentActionType('delete');
    setPinActionType('delete');
    
    const canDeleteDirectly = isAdmin || user.jobTitle === 'Secrétaire' || user.jobTitle === 'Manager';

    if (canDeleteDirectly) {
        setShowReasonDialog(true); // This dialog will lead to direct delete confirmation
    } else {
        // For users without job title and not admin, check for PIN first.
        setIsProcessingAction(true);
        try {
            const pinRequest = await getPinIssuedRequestForEntity('secretaryDocument', doc.id, 'delete');
            if (pinRequest) {
                setActivePinRequest(pinRequest);
                setShowPinDialog(true);
            } else {
                setActionReason('');
                setShowReasonDialog(true); // To request approval
            }
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive" });
        } finally {
            setIsProcessingAction(false);
        }
    }
  };

  const handlePinSubmit = async () => {
    if (!pinEntry.trim() || !activePinRequest || !docTargetedForAction || !pinActionType) return;
    if (pinEntry !== activePinRequest.pinCode) {
      toast({ title: "PIN Incorrect", variant: "destructive" });
      return;
    }
     if (activePinRequest.pinExpiresAt && new Date() > parseISO(activePinRequest.pinExpiresAt)) {
      toast({ title: "PIN Expiré", variant: "destructive" });
      setShowPinDialog(false); setPinEntry(''); setActivePinRequest(null); setDocTargetedForAction(null); setPinActionType(null);
      return;
    }
    setIsProcessingAction(true);
    try {
      await completeApprovalRequestWithPin(activePinRequest.id);
      if (pinActionType === 'edit') {
        router.push(`/secretary/documents/${docTargetedForAction.id}/edit`);
      } else if (pinActionType === 'delete') {
        await deleteSecretaryDocumentFromFirestore(docTargetedForAction.id);
        fetchDocuments();
        toast({ title: "Document Supprimé", description: `Le document "${docTargetedForAction.title}" a été supprimé.` });
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de l'action avec PIN.", variant: "destructive" });
    } finally {
      setShowPinDialog(false); setPinEntry(''); setActivePinRequest(null); setDocTargetedForAction(null); setPinActionType(null);
      setIsProcessingAction(false);
    }
  };

  const handleReasonDialogSubmit = async () => {
    if (!docTargetedForAction || !currentActionType || !user) return;

    const canPerformDirectAction = isAdmin || user.jobTitle === 'Secrétaire' || user.jobTitle === 'Manager';

    if (currentActionType === 'delete' && canPerformDirectAction) {
        setIsProcessingAction(true);
        try {
            await deleteSecretaryDocumentFromFirestore(docTargetedForAction.id);
            fetchDocuments();
            toast({ title: "Document Supprimé", description: `"${docTargetedForAction.title}" a été supprimé.` });
        } catch (error) {
            toast({ title: "Erreur de Suppression", variant: "destructive" });
        } finally {
            setIsProcessingAction(false);
        }
    } else { 
        // Submit approval request (for edit by non-job-title/non-admin, or delete by non-job-title/non-admin)
        if (!actionReason.trim()) {
            toast({ title: "Raison Requise", description: "Veuillez fournir une raison pour votre demande.", variant: "destructive" });
            return;
        }
        setIsProcessingAction(true);
        try {
            await addApprovalRequestToFirestore({
                requestedByUserId: user.uid,
                requestedByUserName: user.displayName || user.email || "Utilisateur Inconnu",
                entityType: 'secretaryDocument',
                entityId: docTargetedForAction.id,
                entityDescription: `Document: ${docTargetedForAction.title}`,
                actionType: currentActionType, // 'edit' or 'delete'
                reason: actionReason,
            });
            toast({ title: "Demande Envoyée", description: "Votre demande a été soumise pour approbation." });
        } catch (error) {
            toast({ title: "Erreur d'Envoi", description: "Impossible d'envoyer la demande.", variant: "destructive" });
        } finally {
            setIsProcessingAction(false);
        }
    }
    setShowReasonDialog(false); setActionReason(''); setDocTargetedForAction(null); setCurrentActionType(null);
  };


  if (authLoading || (!user && !isLoading)) { // Adjusted loading condition
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  
  if (!isAdmin && user && user.jobTitle !== 'Secrétaire' && user.jobTitle !== 'Manager') {
     return <div className="flex h-screen items-center justify-center">Accès non autorisé.</div>;
  }


  return (
    <>
      <PageHeader
        title="Gestion des Documents (Secrétariat)"
        description="Créez, gérez et archivez les documents administratifs."
        actions={
          <Link href="/secretary/documents/add" passHref>
            <Button disabled={isProcessingAction}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Document
            </Button>
          </Link>
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
            <div className="overflow-x-auto">
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
                      <TableCell>{format(parseISO(doc.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr })}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="sm" onClick={() => handleEditAction(doc)} disabled={isProcessingAction}>
                           <Edit className="mr-1 h-3 w-3"/> Modifier
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteAction(doc)} disabled={isProcessingAction}>
                           <Trash2 className="mr-1 h-3 w-3"/> Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-6 text-center py-6 border-t border-dashed">
              <Construction className="mx-auto h-12 w-12 text-muted-foreground opacity-70" />
              <p className="mt-3 text-sm text-muted-foreground">
                L'intégration de l'éditeur de texte riche (Quill) et l'envoi par email seront bientôt disponibles.
              </p>
            </div>
        </CardContent>
      </Card>

      {/* Reason/Confirmation Dialog */}
      <AlertDialog open={showReasonDialog} onOpenChange={(isOpen) => {
        if (!isOpen) { setDocTargetedForAction(null); setActionReason(''); setCurrentActionType(null); }
        setShowReasonDialog(isOpen);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {currentActionType === 'delete' && (isAdmin || user?.jobTitle === 'Secrétaire' || user?.jobTitle === 'Manager')
                ? `Confirmer la Suppression: "${docTargetedForAction?.title}"?` 
                : `Demande de ${currentActionType === 'edit' ? 'Modification' : 'Suppression'}: ${docTargetedForAction?.title}`}
            </AlertDialogTitle>
            {currentActionType === 'delete' && (isAdmin || user?.jobTitle === 'Secrétaire' || user?.jobTitle === 'Manager') ? (
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            ) : (
              <div className="space-y-2 py-2 text-left">
                <Label htmlFor={`actionReason-${docTargetedForAction?.id}`}>Raison :</Label>
                <Textarea id={`actionReason-${docTargetedForAction?.id}`} value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder={`Raison de la ${currentActionType === 'edit' ? 'modification' : 'suppression'}...`} disabled={isProcessingAction} />
                <p className="text-xs text-muted-foreground">Votre demande sera examinée.</p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowReasonDialog(false); setDocTargetedForAction(null); setActionReason(''); setCurrentActionType(null);}} disabled={isProcessingAction}>Annuler</AlertDialogCancel>
            <Button onClick={handleReasonDialogSubmit} 
                variant={currentActionType === 'delete' && (isAdmin || user?.jobTitle === 'Secrétaire' || user?.jobTitle === 'Manager') ? "destructive" : "default"} 
                disabled={isProcessingAction || (
                    !(isAdmin || user?.jobTitle === 'Secrétaire' || user?.jobTitle === 'Manager') && // If not admin/job title for direct action
                    currentActionType !== 'delete' && // And not a direct delete confirmation
                    !actionReason.trim() // Then reason is required
                )}>
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Entry Dialog */}
      <Dialog open={showPinDialog} onOpenChange={(isOpen) => {
        if (!isOpen) { setPinEntry(''); setActivePinRequest(null); setDocTargetedForAction(null); setCurrentActionType(null); setPinActionType(null); }
        setShowPinDialog(isOpen);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary" /> Saisir le PIN</DialogTitle>
            <DialogDesc>Un PIN a été fourni pour {pinActionType === 'edit' ? 'modifier' : 'supprimer'} le document "{docTargetedForAction?.title}".</DialogDesc>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="pinCodeSecDoc">Code PIN (6 chiffres)</Label>
            <Input id="pinCodeSecDoc" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pinEntry} onChange={(e) => setPinEntry(e.target.value.replace(/\D/g, '').substring(0,6))} placeholder="123456" disabled={isProcessingAction} />
          </div>
          <DialogFoot>
            <DialogClose asChild><Button variant="outline" disabled={isProcessingAction} onClick={() => { setPinEntry(''); setActivePinRequest(null); setDocTargetedForAction(null); setCurrentActionType(null); setPinActionType(null);}}>Annuler</Button></DialogClose>
            <Button onClick={handlePinSubmit} disabled={isProcessingAction || pinEntry.length !== 6}>
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Valider et {pinActionType === 'edit' ? 'Modifier' : 'Supprimer'}
            </Button>
          </DialogFoot>
        </DialogContent>
      </Dialog>
    </>
  );
}

