
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react'; 
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    getWorkTypesFromFirestore, 
    deleteWorkTypeFromFirestore, 
    addApprovalRequestToFirestore,
    getPinIssuedRequestForEntity, 
    completeApprovalRequestWithPin 
} from '@/lib/mock-data'; 
import type { WorkType, ApprovalRequest } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Search, Loader2, KeyRound } from 'lucide-react'; 
import { Input } from '@/components/ui/input';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth-context';

export default function WorkTypesPage() { 
  const { user, isAdmin } = useAuth();
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [workTypeTargetedForAction, setWorkTypeTargetedForAction] = useState<WorkType | null>(null);
  const [editReason, setEditReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [showEditReasonDialog, setShowEditReasonDialog] = useState(false);
  const [showDeleteReasonDialog, setShowDeleteReasonDialog] = useState(false);

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [activePinRequest, setActivePinRequest] = useState<ApprovalRequest | null>(null);
  const [pinActionType, setPinActionType] = useState<'edit' | 'delete' | null>(null);

  const fetchWorkTypes = useCallback(async () => {
    if (!user) {
      setIsLoading(false); 
      return;
    }
    setIsLoading(true);
    try {
      const fetchedWorkTypes = await getWorkTypesFromFirestore();
      setWorkTypes(fetchedWorkTypes.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("Failed to fetch work types:", error);
      toast({ title: "Erreur", description: "Impossible de charger les types de travail.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  },[user, toast]);

  useEffect(() => {
    fetchWorkTypes();
  }, [fetchWorkTypes]);

  const filteredWorkTypes = useMemo(() => {
    if (!searchTerm) return workTypes;
    return workTypes.filter(wt => 
      wt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wt.description && wt.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [workTypes, searchTerm]);

  const handleEditWorkTypeAction = async (workType: WorkType) => {
    if (!user) return;
    setWorkTypeTargetedForAction(workType);

    if (isAdmin) {
      router.push(`/work-types/${workType.id}/edit`);
    } else {
      setIsProcessingAction(true);
      try {
        const pinRequest = await getPinIssuedRequestForEntity('workType', workType.id, 'edit');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setPinActionType('edit');
          setShowPinDialog(true);
        } else {
          setEditReason('');
          setShowEditReasonDialog(true);
        }
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive" });
      } finally {
        setIsProcessingAction(false);
      }
    }
  };

  const handleDeleteWorkTypeAction = async (workType: WorkType) => {
    if (!user) return;
    setWorkTypeTargetedForAction(workType);

    if (isAdmin) {
        setShowDeleteReasonDialog(true); // For admin, this is direct delete confirmation
    } else {
        setIsProcessingAction(true);
        try {
            const pinRequest = await getPinIssuedRequestForEntity('workType', workType.id, 'delete');
            if (pinRequest) {
                setActivePinRequest(pinRequest);
                setPinActionType('delete');
                setShowPinDialog(true);
            } else {
                setDeleteReason('');
                setShowDeleteReasonDialog(true); // For non-admin, this is to enter reason
            }
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive" });
        } finally {
            setIsProcessingAction(false);
        }
    }
  };

  const handlePinSubmit = async () => {
    if (!pinEntry.trim() || !activePinRequest || !pinActionType || !workTypeTargetedForAction) {
        toast({ title: "Erreur", description: "PIN requis ou informations manquantes.", variant: "destructive" });
        return;
    }
    if (pinEntry !== activePinRequest.pinCode) {
        toast({ title: "Erreur", description: "PIN incorrect.", variant: "destructive" });
        return;
    }
    if (activePinRequest.pinExpiresAt && new Date() > parseISO(activePinRequest.pinExpiresAt)) {
        toast({ title: "Erreur", description: "Le PIN a expiré.", variant: "destructive" });
        setShowPinDialog(false);
        setPinEntry('');
        setActivePinRequest(null);
        return;
    }

    setIsProcessingAction(true);
    try {
        if (pinActionType === 'edit') {
            await completeApprovalRequestWithPin(activePinRequest.id);
            toast({ title: "PIN Validé", description: "Redirection vers la page de modification." });
            router.push(`/work-types/${workTypeTargetedForAction.id}/edit`);
        } else if (pinActionType === 'delete') {
            await deleteWorkTypeFromFirestore(workTypeTargetedForAction.id);
            await completeApprovalRequestWithPin(activePinRequest.id);
            setWorkTypes(prev => prev.filter(wt => wt.id !== workTypeTargetedForAction!.id));
            toast({ title: "Type de Travail Supprimé", description: `"${workTypeTargetedForAction.name}" a été supprimé via PIN.` });
        }
        setShowPinDialog(false);
        setPinEntry('');
        setActivePinRequest(null);
        setWorkTypeTargetedForAction(null);
    } catch (error) {
        console.error(`Erreur lors de l'action ${pinActionType} avec PIN:`, error);
        toast({ title: "Erreur", description: `Échec de l'action ${pinActionType} avec PIN.`, variant: "destructive" });
    } finally {
        setIsProcessingAction(false);
    }
  };

  const handleDeleteWorkTypeDirectly = async () => {
    if (!isAdmin || !workTypeTargetedForAction) return;
    setIsProcessingAction(true);
    try {
      await deleteWorkTypeFromFirestore(workTypeTargetedForAction.id);
      setWorkTypes(prev => prev.filter(wt => wt.id !== workTypeTargetedForAction!.id));
      toast({
        title: "Type de Travail Supprimé",
        description: "Le type de travail a été supprimé avec succès.",
      });
      setShowDeleteReasonDialog(false);
      setWorkTypeTargetedForAction(null);
    } catch (error) {
      console.error("Failed to delete work type:", error);
      toast({ title: "Erreur", description: "Échec de la suppression.", variant: "destructive" });
    } finally {
        setIsProcessingAction(false);
    }
  };

  const handleSubmitEditRequest = async () => {
    if (!workTypeTargetedForAction || !editReason.trim() || !user) {
      toast({ title: "Erreur", description: "Veuillez fournir une raison et être connecté.", variant: "destructive" });
      return;
    }
    setIsProcessingAction(true);
    try {
        await addApprovalRequestToFirestore({
            requestedByUserId: user.uid,
            requestedByUserName: user.displayName || user.email || "Utilisateur inconnu",
            entityType: 'workType',
            entityId: workTypeTargetedForAction.id,
            entityDescription: `Type de Travail: ${workTypeTargetedForAction.name}`,
            actionType: 'edit',
            reason: editReason,
        });
        toast({
            title: "Demande Enregistrée",
            description: `Votre demande de modification pour "${workTypeTargetedForAction.name}" a été enregistrée.`,
        });
        setEditReason('');
        setShowEditReasonDialog(false); 
        setWorkTypeTargetedForAction(null);
    } catch (error) {
        console.error("Failed to submit edit request for work type:", error);
        toast({ title: "Erreur", description: "Échec de l'envoi de la demande de modification.", variant: "destructive" });
    } finally {
        setIsProcessingAction(false);
    }
  };

  const handleSubmitDeleteRequest = async () => {
    if (!workTypeTargetedForAction || !deleteReason.trim() || !user) {
        toast({ title: "Erreur", description: "Veuillez fournir une raison et être connecté.", variant: "destructive" });
        return;
    }
    setIsProcessingAction(true);
    try {
        await addApprovalRequestToFirestore({
            requestedByUserId: user.uid,
            requestedByUserName: user.displayName || user.email || "Utilisateur inconnu",
            entityType: 'workType',
            entityId: workTypeTargetedForAction.id,
            entityDescription: `Type de Travail: ${workTypeTargetedForAction.name}`,
            actionType: 'delete',
            reason: deleteReason,
        });
        toast({
            title: "Demande Enregistrée",
            description: `Votre demande de suppression pour "${workTypeTargetedForAction.name}" a été enregistrée.`,
        });
        setDeleteReason('');
        setShowDeleteReasonDialog(false);
        setWorkTypeTargetedForAction(null); 
    } catch (error) {
        console.error("Failed to submit delete request for work type:", error);
        toast({ title: "Erreur", description: "Échec de l'envoi de la demande de suppression.", variant: "destructive" });
    } finally {
        setIsProcessingAction(false);
    }
  };

  if (isLoading && !user) { 
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement...</p>
        </div>
    );
  }
  if (!user && !isLoading) {
    return <div className="flex justify-center items-center h-64">Veuillez vous connecter pour voir cette page.</div>;
  }


  return (
    <>
      <PageHeader
        title="Gestion des Types de Travail"
        description="Configurez les différents types de services ou de travaux que vous proposez."
        actions={
          <Link href="/work-types/add" passHref>
            <Button disabled={isProcessingAction}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Type
            </Button>
          </Link>
        }
      />
       <Card className="shadow-lg mb-6">
        <CardHeader>
          <CardTitle>Filtrer les Types de Travail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom ou description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm pl-8"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Types de Travail</CardTitle>
          <CardDescription>
            Aperçu de tous les types de travail enregistrés, triés par date de création (plus récents en premier).
            Nombre de types affichés: {isLoading ? "Chargement..." : filteredWorkTypes.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Chargement des types de travail...</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date Création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkTypes.map((wt) => (
                <TableRow key={wt.id}>
                  <TableCell className="font-medium">{wt.name}</TableCell>
                  <TableCell>{wt.description || 'N/A'}</TableCell>
                  <TableCell>{wt.createdAt ? format(parseISO(wt.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr }) : 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="outline" size="sm" onClick={() => handleEditWorkTypeAction(wt)} disabled={isProcessingAction && workTypeTargetedForAction?.id === wt.id}>
                        {(isProcessingAction && workTypeTargetedForAction?.id === wt.id && pinActionType === 'edit') ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <Edit className="mr-1 h-4 w-4" />} Modifier
                    </Button>
                   
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteWorkTypeAction(wt)} disabled={isProcessingAction && workTypeTargetedForAction?.id === wt.id}>
                        {(isProcessingAction && workTypeTargetedForAction?.id === wt.id && pinActionType === 'delete') ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <Trash2 className="mr-1 h-4 w-4" />} Supprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
           {!isLoading && filteredWorkTypes.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
                {searchTerm ? "Aucun type de travail ne correspond à votre recherche." : "Aucun type de travail trouvé."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Reason Dialog */}
      <Dialog open={showEditReasonDialog} onOpenChange={(isOpen) => {
        if(!isOpen) { setWorkTypeTargetedForAction(null); setEditReason(''); }
        setShowEditReasonDialog(isOpen);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demande de Modification: {workTypeTargetedForAction?.name}</DialogTitle>
            <DialogDescription>
              Expliquez pourquoi vous souhaitez modifier ce type de travail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor={`editReason-${workTypeTargetedForAction?.id}`}>Raison :</Label>
            <Textarea id={`editReason-${workTypeTargetedForAction?.id}`} value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Raison de la demande..." disabled={isProcessingAction}/>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isProcessingAction}>Annuler</Button></DialogClose>
            <Button onClick={handleSubmitEditRequest} disabled={isProcessingAction || !editReason.trim()}>
                {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Reason/Confirmation Dialog */}
      <AlertDialog open={showDeleteReasonDialog} onOpenChange={(isOpen) => {
        if(!isOpen) { setWorkTypeTargetedForAction(null); setDeleteReason(''); }
        setShowDeleteReasonDialog(isOpen);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAdmin ? `Supprimer: "${workTypeTargetedForAction?.name}"?` : `Demande de Suppression: ${workTypeTargetedForAction?.name}`}</AlertDialogTitle>
              {isAdmin ? (
              <AlertDialogDescription>
                  Cette action est irréversible et supprimera le type de travail "{workTypeTargetedForAction?.name}".
                  Les BLs utilisant ce type pourraient être affectés.
              </AlertDialogDescription>
              ) : (
                <div className="space-y-2 py-2 text-left">
                  <Label htmlFor={`deleteReason-${workTypeTargetedForAction?.id}`}>Raison :</Label>
                  <Textarea id={`deleteReason-${workTypeTargetedForAction?.id}`} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Raison de la demande de suppression..." disabled={isProcessingAction}/>
                  <p className="text-xs text-muted-foreground">Votre demande sera examinée par un administrateur.</p>
                </div>
              )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setShowDeleteReasonDialog(false); setWorkTypeTargetedForAction(null); setDeleteReason('');}} disabled={isProcessingAction}>Annuler</AlertDialogCancel>
            <Button 
              onClick={isAdmin ? handleDeleteWorkTypeDirectly : handleSubmitDeleteRequest}
              variant={isAdmin ? "destructive" : "default"}
              disabled={isProcessingAction || (!isAdmin && !deleteReason.trim())}
            >
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAdmin ? "Confirmer" : "Soumettre"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       {/* PIN Entry Dialog */}
       <Dialog open={showPinDialog} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setPinEntry('');
          setActivePinRequest(null);
          setWorkTypeTargetedForAction(null);
          setPinActionType(null);
        }
        setShowPinDialog(isOpen);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
                <KeyRound className="mr-2 h-5 w-5 text-primary" /> Saisir le PIN
            </DialogTitle>
            <DialogDescription>
              Un PIN vous a été fourni par un administrateur pour {pinActionType === 'edit' ? 'modifier' : 'supprimer'} le type de travail "{workTypeTargetedForAction?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="pinCodeWorkType">Code PIN (6 chiffres)</Label>
            <Input
              id="pinCodeWorkType"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pinEntry}
              onChange={(e) => setPinEntry(e.target.value.replace(/\D/g, '').substring(0,6))}
              placeholder="123456"
              disabled={isProcessingAction}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" disabled={isProcessingAction}>Annuler</Button>
            </DialogClose>
            <Button onClick={handlePinSubmit} disabled={isProcessingAction || pinEntry.length !== 6}>
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Valider et {pinActionType === 'edit' ? 'Modifier' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    