
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDigit, PlusCircle, Construction, Loader2, AlertTriangle, Edit, Trash2, KeyRound, UserCircle2, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { 
    getAccountingEntriesFromFirestore,
    deleteAccountingEntryFromFirestore,
    addApprovalRequestToFirestore,
    getPinIssuedRequestForEntity,
    completeApprovalRequestWithPin,
} from '@/lib/mock-data';
import type { AccountingEntry, ApprovalRequest } from '@/lib/types';
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
  DialogHeader as DialogHead, // Aliased
  DialogTitle as DialogTitl,   // Aliased
  DialogDescription as DialogDesc, // Aliased
  DialogFooter as DialogFoot,     // Aliased
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AccountingInvoicesPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [entryTargetedForAction, setEntryTargetedForAction] = useState<AccountingEntry | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [currentActionType, setCurrentActionType] = useState<'edit' | 'delete' | null>(null);
  
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [activePinRequest, setActivePinRequest] = useState<ApprovalRequest | null>(null);
  const [pinActionType, setPinActionType] = useState<'edit' | 'delete' | null>(null);

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
            setEntries(fetchedEntries); // Already sorted by updatedAt in mock-data
        } catch (error) {
            console.error("Failed to fetch accounting entries:", error);
            toast({ title: "Erreur", description: "Impossible de charger les écritures comptables.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    } else if (!user && !authLoading) {
        setIsLoading(false);
    }
  }, [user, isAdmin, authLoading, toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleEditAction = async (entry: AccountingEntry) => {
    if (!user) return;
    setEntryTargetedForAction(entry);
    setCurrentActionType('edit');
    setPinActionType('edit');

    const canEditDirectly = isAdmin || user.jobTitle === 'Comptable' || user.jobTitle === 'Manager';

    if (canEditDirectly) {
        router.push(`/accounting/invoices/${entry.id}/edit`);
    } else {
        setIsProcessingAction(true);
        try {
            const pinRequest = await getPinIssuedRequestForEntity('accountingEntry', entry.id, 'edit');
            if (pinRequest) {
                setActivePinRequest(pinRequest);
                setShowPinDialog(true);
            } else {
                setActionReason('');
                setShowReasonDialog(true); 
            }
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive" });
        } finally {
            setIsProcessingAction(false);
        }
    }
  };

  const handleDeleteAction = async (entry: AccountingEntry) => {
    if (!user) return;
    setEntryTargetedForAction(entry);
    setCurrentActionType('delete');
    setPinActionType('delete');
    
    const canDeleteDirectly = isAdmin || user.jobTitle === 'Comptable' || user.jobTitle === 'Manager';

    if (canDeleteDirectly) {
        setShowReasonDialog(true); 
    } else {
        setIsProcessingAction(true);
        try {
            const pinRequest = await getPinIssuedRequestForEntity('accountingEntry', entry.id, 'delete');
            if (pinRequest) {
                setActivePinRequest(pinRequest);
                setShowPinDialog(true);
            } else {
                setActionReason('');
                setShowReasonDialog(true); 
            }
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive" });
        } finally {
            setIsProcessingAction(false);
        }
    }
  };

  const handlePinSubmit = async () => {
    if (!pinEntry.trim() || !activePinRequest || !entryTargetedForAction || !pinActionType) return;
    if (pinEntry !== activePinRequest.pinCode) {
      toast({ title: "PIN Incorrect", variant: "destructive" });
      return;
    }
    if (activePinRequest.pinExpiresAt && new Date() > parseISO(activePinRequest.pinExpiresAt)) {
      toast({ title: "PIN Expiré", variant: "destructive" });
      setShowPinDialog(false); setPinEntry(''); setActivePinRequest(null); setEntryTargetedForAction(null); setPinActionType(null);
      return;
    }
    setIsProcessingAction(true);
    try {
      await completeApprovalRequestWithPin(activePinRequest.id);
      if (pinActionType === 'edit') {
        router.push(`/accounting/invoices/${entryTargetedForAction.id}/edit`);
      } else if (pinActionType === 'delete') {
        await deleteAccountingEntryFromFirestore(entryTargetedForAction.id);
        fetchEntries();
        toast({ title: "Écriture Supprimée", description: `L'écriture "${entryTargetedForAction.referenceNumber}" a été supprimée.` });
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de l'action avec PIN.", variant: "destructive" });
    } finally {
      setShowPinDialog(false); setPinEntry(''); setActivePinRequest(null); setEntryTargetedForAction(null); setPinActionType(null);
      setIsProcessingAction(false);
    }
  };

  const handleReasonDialogSubmit = async () => {
    if (!entryTargetedForAction || !currentActionType || !user) return;

    const canPerformDirectAction = isAdmin || user.jobTitle === 'Comptable' || user.jobTitle === 'Manager';

    if (currentActionType === 'delete' && canPerformDirectAction) {
        setIsProcessingAction(true);
        try {
            await deleteAccountingEntryFromFirestore(entryTargetedForAction.id);
            fetchEntries();
            toast({ title: "Écriture Supprimée", description: `"${entryTargetedForAction.referenceNumber}" a été supprimée.` });
        } catch (error) {
            toast({ title: "Erreur de Suppression", variant: "destructive" });
        } finally {
            setIsProcessingAction(false);
        }
    } else { 
        if (!actionReason.trim()) {
            toast({ title: "Raison Requise", description: "Veuillez fournir une raison pour votre demande.", variant: "destructive" });
            return;
        }
        setIsProcessingAction(true);
        try {
            await addApprovalRequestToFirestore({
                requestedByUserId: user.uid,
                requestedByUserName: user.displayName || user.email || "Utilisateur Inconnu",
                entityType: 'accountingEntry',
                entityId: entryTargetedForAction.id,
                entityDescription: `Écriture Comptable: ${entryTargetedForAction.referenceNumber}`,
                actionType: currentActionType,
                reason: actionReason,
            });
            toast({ title: "Demande Envoyée", description: "Votre demande a été soumise pour approbation." });
        } catch (error) {
            toast({ title: "Erreur d'Envoi", description: "Impossible d'envoyer la demande.", variant: "destructive" });
        } finally {
            setIsProcessingAction(false);
        }
    }
    setShowReasonDialog(false); setActionReason(''); setEntryTargetedForAction(null); setCurrentActionType(null);
  };
  
  if (authLoading || (!user && !isLoading)) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  
  if (!isAdmin && user && user.jobTitle !== 'Comptable' && user.jobTitle !== 'Manager') {
     return <div className="flex h-screen items-center justify-center">Accès non autorisé.</div>;
  }


  return (
    <>
      <PageHeader
        title="Gestion de la Facturation et Comptabilité"
        description="Suivez les factures, devis, bons de commande et autres écritures comptables."
        actions={
          <Link href="/accounting/invoices/add" passHref>
            <Button disabled={isProcessingAction}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nouvelle Écriture
            </Button>
          </Link>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Écritures Comptables Récentes</CardTitle>
           <CardDescription>
            {isLoading ? "Chargement..." : `${entries.length} écriture(s) trouvée(s). Trié par dernière modification.`}
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Réf.</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Émission</TableHead>
                    <TableHead>Client/BL</TableHead>
                    <TableHead className="text-right">Montant Total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé par</TableHead>
                    <TableHead>Modifié le</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                           <UserCircle2 className="h-3.5 w-3.5"/> {entry.createdByUserName || 'N/A'}
                        </div>
                         <div className="text-xs text-muted-foreground/80 mt-0.5 flex items-center gap-1">
                           <CalendarDays className="h-3 w-3"/> {format(parseISO(entry.createdAt), 'dd MMM yy', { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.updatedAt ? format(parseISO(entry.updatedAt), 'dd MMM yyyy, HH:mm', { locale: fr }) : '-'}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="sm" onClick={() => handleEditAction(entry)} disabled={isProcessingAction}>
                           <Edit className="mr-1 h-3 w-3"/> Modifier
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteAction(entry)} disabled={isProcessingAction}>
                           <Trash2 className="mr-1 h-3 w-3"/> Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reason/Confirmation Dialog */}
      <AlertDialog open={showReasonDialog} onOpenChange={(isOpen) => {
        if (!isOpen) { setEntryTargetedForAction(null); setActionReason(''); setCurrentActionType(null); }
        setShowReasonDialog(isOpen);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {currentActionType === 'delete' && (isAdmin || user?.jobTitle === 'Comptable' || user?.jobTitle === 'Manager')
                ? `Confirmer la Suppression: "${entryTargetedForAction?.referenceNumber}"?` 
                : `Demande de ${currentActionType === 'edit' ? 'Modification' : 'Suppression'}: ${entryTargetedForAction?.referenceNumber}`}
            </AlertDialogTitle>
            {currentActionType === 'delete' && (isAdmin || user?.jobTitle === 'Comptable' || user?.jobTitle === 'Manager') ? (
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            ) : (
              <div className="space-y-2 py-2 text-left">
                <Label htmlFor={`actionReasonAccounting-${entryTargetedForAction?.id}`}>Raison :</Label>
                <Textarea id={`actionReasonAccounting-${entryTargetedForAction?.id}`} value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder={`Raison de la ${currentActionType === 'edit' ? 'modification' : 'suppression'}...`} disabled={isProcessingAction} />
                <p className="text-xs text-muted-foreground">Votre demande sera examinée.</p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setShowReasonDialog(false); setEntryTargetedForAction(null); setActionReason(''); setCurrentActionType(null);}} disabled={isProcessingAction}>Annuler</AlertDialogCancel>
            <Button onClick={handleReasonDialogSubmit} 
                variant={currentActionType === 'delete' && (isAdmin || user?.jobTitle === 'Comptable' || user?.jobTitle === 'Manager') ? "destructive" : "default"} 
                 disabled={isProcessingAction || (
                    !(isAdmin || user?.jobTitle === 'Comptable' || user?.jobTitle === 'Manager') && 
                    currentActionType !== 'delete' && 
                    !actionReason.trim() 
                )}>
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Entry Dialog */}
      <Dialog open={showPinDialog} onOpenChange={(isOpen) => {
        if (!isOpen) { setPinEntry(''); setActivePinRequest(null); setEntryTargetedForAction(null); setCurrentActionType(null); setPinActionType(null); }
        setShowPinDialog(isOpen);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHead>
            <DialogTitl className="flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary" /> Saisir le PIN</DialogTitl>
            <DialogDesc>Un PIN a été fourni pour {pinActionType === 'edit' ? 'modifier' : 'supprimer'} l'écriture "{entryTargetedForAction?.referenceNumber}".</DialogDesc>
          </DialogHead>
          <div className="py-2 space-y-2">
            <Label htmlFor="pinCodeAccounting">Code PIN (6 chiffres)</Label>
            <Input id="pinCodeAccounting" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pinEntry} onChange={(e) => setPinEntry(e.target.value.replace(/\D/g, '').substring(0,6))} placeholder="123456" disabled={isProcessingAction} />
          </div>
          <DialogFoot>
            <DialogClose asChild><Button variant="outline" disabled={isProcessingAction} onClick={() => { setPinEntry(''); setActivePinRequest(null); setEntryTargetedForAction(null); setCurrentActionType(null); setPinActionType(null);}}>Annuler</Button></DialogClose>
            <Button onClick={handlePinSubmit} disabled={isProcessingAction || pinEntry.length !== 6}>
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Valider et {pinActionType === 'edit' ? 'Modifier' : 'Supprimer'}
            </Button>
          </DialogFoot>
        </DialogContent>
      </Dialog>
    </>
  );
}

