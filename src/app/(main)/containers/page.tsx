
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    getContainersFromFirestore,
    deleteContainerFromFirestore,
    addApprovalRequestToFirestore,
    getPinIssuedRequestForEntity,
    completeApprovalRequestWithPin,
} from '@/lib/mock-data';
import type { Container, ApprovalRequest, BillOfLading } from '@/lib/types';
import { PlusCircle, Search, Eye, Edit, Trash2, Loader2, KeyRound, Box, FileText, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const formatDateForDisplay = (dateString?: string | null) => {
  if (!dateString) return <span className="text-muted-foreground/70">-</span>;
  try {
    return format(parseISO(dateString), 'dd/MM/yy', { locale: fr });
  } catch {
    return <span className="text-destructive">Date?</span>;
  }
};

export default function ContainersPage() {
  const { user, isAdmin } = useAuth();
  const [containers, setContainers] = useState<Container[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [containerTargetedForAction, setContainerTargetedForAction] = useState<Container | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [activePinRequest, setActivePinRequest] = useState<ApprovalRequest | null>(null);
  const [pinActionType, setPinActionType] = useState<'edit' | 'delete' | null>(null);

  const fetchContainers = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedContainers = await getContainersFromFirestore();
      setContainers(fetchedContainers);
    } catch (error) {
      console.error("Failed to fetch containers:", error);
      toast({ title: "Erreur", description: "Impossible de charger la liste des conteneurs.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  const filteredContainers = useMemo(() => {
    if (!searchTerm) return containers;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return containers.filter(c =>
      c.containerNumber.toLowerCase().includes(lowerSearchTerm) ||
      c.type.toLowerCase().includes(lowerSearchTerm) ||
      (c.blNumber && c.blNumber.toLowerCase().includes(lowerSearchTerm)) ||
      c.status.toLowerCase().includes(lowerSearchTerm) ||
      (c.sealNumber && c.sealNumber.toLowerCase().includes(lowerSearchTerm))
    );
  }, [containers, searchTerm]);

  const handleEditContainerAction = async (container: Container) => {
    if (!user) return;
    setContainerTargetedForAction(container);
    setPinActionType('edit');

    if (isAdmin) {
      router.push(`/containers/${container.id}/edit`);
    } else {
      setIsProcessingAction(true);
      try {
        const pinRequest = await getPinIssuedRequestForEntity('container', container.id, 'edit');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setShowPinDialog(true);
        } else {
          toast({ title: "Action Requise", description: "Veuillez demander une approbation avec PIN à un administrateur pour modifier ce conteneur.", variant: "default", duration: 5000 });
          setContainerTargetedForAction(null);
        }
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive" });
      } finally {
        setIsProcessingAction(false);
      }
    }
  };

  const handleDeleteContainerAction = async (container: Container) => {
    if (!user) return;
    setContainerTargetedForAction(container);
    setPinActionType('delete');

    if (isAdmin) {
      setShowReasonDialog(true); // Admin directly goes to confirmation/reason dialog
    } else {
      setIsProcessingAction(true);
      try {
        const pinRequest = await getPinIssuedRequestForEntity('container', container.id, 'delete');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setShowPinDialog(true);
        } else {
          setDeleteReason(''); // Clear reason for new request
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
    if (!pinEntry.trim() || !activePinRequest || !containerTargetedForAction || !pinActionType) {
      toast({ title: "Erreur", description: "PIN requis ou informations manquantes.", variant: "destructive" });
      return;
    }
    if (pinEntry !== activePinRequest.pinCode) {
      toast({ title: "Erreur PIN", description: "Le PIN saisi est incorrect.", variant: "destructive" });
      return;
    }
    if (activePinRequest.pinExpiresAt && new Date() > parseISO(activePinRequest.pinExpiresAt)) {
      toast({ title: "Erreur PIN", description: "Le PIN a expiré.", variant: "destructive" });
      // Reset states related to PIN dialog
      setShowPinDialog(false); setPinEntry(''); setActivePinRequest(null); setContainerTargetedForAction(null);
      return;
    }

    setIsProcessingAction(true);
    try {
      if (pinActionType === 'edit') {
        await completeApprovalRequestWithPin(activePinRequest.id);
        toast({ title: "PIN Validé", description: "Redirection vers la page de modification." });
        router.push(`/containers/${containerTargetedForAction.id}/edit`);
      } else if (pinActionType === 'delete') {
        await deleteContainerFromFirestore(containerTargetedForAction.id, containerTargetedForAction.blId);
        await completeApprovalRequestWithPin(activePinRequest.id);
        setContainers(prev => prev.filter(c => c.id !== containerTargetedForAction!.id));
        toast({ title: "Conteneur Supprimé", description: `Le conteneur ${containerTargetedForAction.containerNumber} a été supprimé via PIN.` });
      }
    } catch (error) {
      toast({ title: "Erreur", description: `Échec de l'action ${pinActionType} avec PIN.`, variant: "destructive" });
    } finally {
      setShowPinDialog(false); setPinEntry(''); setActivePinRequest(null); setContainerTargetedForAction(null);
      setIsProcessingAction(false);
    }
  };

  const handleDeleteContainerDirectly = async () => {
    if (!containerTargetedForAction || !isAdmin) return;
    setIsProcessingAction(true);
    try {
      await deleteContainerFromFirestore(containerTargetedForAction.id, containerTargetedForAction.blId);
      setContainers(prev => prev.filter(c => c.id !== containerTargetedForAction!.id));
      toast({ title: "Conteneur Supprimé", description: "Le conteneur a été supprimé." });
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de la suppression du conteneur.", variant: "destructive" });
    } finally {
      setShowReasonDialog(false); setContainerTargetedForAction(null); setIsProcessingAction(false);
    }
  };

  const handleSubmitDeleteRequest = async () => {
    if (!containerTargetedForAction || !deleteReason.trim() || !user) {
      toast({ title: "Erreur", description: "Veuillez fournir une raison.", variant: "destructive" });
      return;
    }
    setIsProcessingAction(true);
    try {
      await addApprovalRequestToFirestore({
        requestedByUserId: user.uid,
        requestedByUserName: user.displayName || user.email || "Utilisateur inconnu",
        entityType: 'container',
        entityId: containerTargetedForAction.id,
        entityDescription: `Conteneur N° ${containerTargetedForAction.containerNumber} (BL N° ${containerTargetedForAction.blNumber || 'N/A'})`,
        actionType: 'delete',
        reason: deleteReason,
      });
      toast({ title: "Demande Enregistrée", description: `Demande de suppression pour ${containerTargetedForAction.containerNumber} enregistrée.` });
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de l'envoi de la demande.", variant: "destructive" });
    } finally {
      setShowReasonDialog(false); setDeleteReason(''); setContainerTargetedForAction(null); setIsProcessingAction(false);
    }
  };

  if (!user && !isLoading) {
    return <div className="flex justify-center items-center h-64">Veuillez vous connecter pour voir cette page.</div>;
  }

  return (
    <>
      <PageHeader
        title="Gestion des Conteneurs"
        description="Suivez tous les conteneurs et leurs statuts."
        actions={
          <Link href="/containers/add" passHref>
            <Button disabled={isLoading || isProcessingAction}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Conteneur
            </Button>
          </Link>
        }
      />
      <Card className="shadow-lg mb-6">
        <CardHeader><CardTitle>Filtrer les Conteneurs</CardTitle></CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par N° conteneur, type, N° BL, statut..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md pl-8"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Conteneurs</CardTitle>
          <CardDescription>Affichage: {isLoading ? "..." : filteredContainers.length} conteneur(s).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Chargement...</p>
            </div>
          ) : filteredContainers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Box className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">{searchTerm ? "Aucun conteneur ne correspond à votre recherche." : "Aucun conteneur trouvé."}</p>
              {!searchTerm && (
                 <Button asChild className="mt-4"><Link href="/containers/add"><PlusCircle className="mr-2 h-4 w-4"/>Ajouter un Conteneur</Link></Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Conteneur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>N° Plomb</TableHead>
                  <TableHead>N° BL</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContainers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.containerNumber}</TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell>{c.sealNumber || '-'}</TableCell>
                    <TableCell>
                      {c.blNumber && c.blId ? (
                        <Link href={`/bls/${c.blId}`} className="text-primary hover:underline flex items-center gap-1">
                          <FileText className="h-3 w-3"/> {c.blNumber}
                        </Link>
                      ) : <span className="text-muted-foreground italic">N/A</span>}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{c.status}</Badge></TableCell>
                    <TableCell>{formatDateForDisplay(c.createdAt)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => handleEditContainerAction(c)} disabled={isProcessingAction}>
                         <Edit className="mr-1 h-3 w-3"/> Modifier
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteContainerAction(c)} disabled={isProcessingAction}>
                         <Trash2 className="mr-1 h-3 w-3"/> Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reason/Confirmation Dialog for Delete */}
      <AlertDialog open={showReasonDialog} onOpenChange={(isOpen) => {
        if (!isOpen) { setContainerTargetedForAction(null); setDeleteReason(''); if (pinActionType === 'delete') setActivePinRequest(null); }
        setShowReasonDialog(isOpen);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAdmin ? `Supprimer: "${containerTargetedForAction?.containerNumber}"?` : `Demande de Suppression: ${containerTargetedForAction?.containerNumber}`}</AlertDialogTitle>
            {isAdmin ? (
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            ) : (
              <div className="space-y-2 py-2 text-left">
                <Label htmlFor={`deleteContainerReason-${containerTargetedForAction?.id}`}>Raison :</Label>
                <Textarea id={`deleteContainerReason-${containerTargetedForAction?.id}`} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Raison de la suppression..." disabled={isProcessingAction} />
                <p className="text-xs text-muted-foreground">Votre demande sera examinée.</p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isProcessingAction}>Annuler</Button></DialogClose>
            <Button onClick={isAdmin ? handleDeleteContainerDirectly : handleSubmitDeleteRequest} variant={isAdmin ? "destructive" : "default"} disabled={isProcessingAction || (!isAdmin && !deleteReason.trim())}>
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAdmin ? "Confirmer" : "Soumettre Demande"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Entry Dialog */}
      <Dialog open={showPinDialog} onOpenChange={(isOpen) => {
        if (!isOpen) { setPinEntry(''); setActivePinRequest(null); setContainerTargetedForAction(null); setPinActionType(null); }
        setShowPinDialog(isOpen);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary" /> Saisir le PIN</DialogTitle>
            <DialogDescription>Un PIN a été fourni pour {pinActionType === 'edit' ? 'modifier' : 'supprimer'} le conteneur "{containerTargetedForAction?.containerNumber}".</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="pinCodeContainer">Code PIN (6 chiffres)</Label>
            <Input id="pinCodeContainer" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pinEntry} onChange={(e) => setPinEntry(e.target.value.replace(/\D/g, '').substring(0,6))} placeholder="123456" disabled={isProcessingAction} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isProcessingAction}>Annuler</Button></DialogClose>
            <Button onClick={handlePinSubmit} disabled={isProcessingAction || pinEntry.length !== 6}>
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Valider et {pinActionType === 'edit' ? 'Modifier' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
