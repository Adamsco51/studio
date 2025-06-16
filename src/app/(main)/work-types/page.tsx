
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button, buttonVariants } from '@/components/ui/button'; // Added buttonVariants import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    getWorkTypesFromFirestore,
    deleteWorkTypeFromFirestore,
    addApprovalRequestToFirestore,
    getPinIssuedRequestForEntity,
    completeApprovalRequestWithPin,
} from '@/lib/mock-data';
import type { WorkType, ApprovalRequest } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Search, Loader2, KeyRound, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
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
  DialogDescription as DialogDesc, 
  DialogFooter as DialogFoot,     
  DialogHeader as DialogHead,     
  DialogTitle as DialogTitl,      
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils'; // Added cn import

export default function WorkTypesPage() {
  const { user, isAdmin } = useAuth();
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [workTypeTargetedForAction, setWorkTypeTargetedForAction] = useState<WorkType | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [currentActionType, setCurrentActionType] = useState<'edit' | 'delete' | null>(null);

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
      (wt.description && wt.description.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [workTypes, searchTerm]);

  const handleEditWorkTypeAction = async (workType: WorkType) => {
    if (!user) return;
    setWorkTypeTargetedForAction(workType);
    setCurrentActionType('edit'); 

    if (isAdmin || workType.createdByUserId === user.uid) {
      router.push(`/work-types/${workType.id}/edit`);
    } else {
      setIsProcessingAction(true);
      setPinActionType('edit'); 
      try {
        const pinRequest = await getPinIssuedRequestForEntity('workType', workType.id, 'edit');
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

  const handleDeleteWorkTypeAction = async (workType: WorkType) => {
    if (!user) return;
    setWorkTypeTargetedForAction(workType);
    setCurrentActionType('delete'); 

    if (isAdmin || workType.createdByUserId === user.uid) {
        setShowReasonDialog(true); 
    } else {
        setIsProcessingAction(true);
        setPinActionType('delete'); 
        try {
            const pinRequest = await getPinIssuedRequestForEntity('workType', workType.id, 'delete');
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
        setShowPinDialog(false); setPinEntry(''); setActivePinRequest(null); setWorkTypeTargetedForAction(null); setPinActionType(null);
        return;
    }

    setIsProcessingAction(true);
    try {
        await completeApprovalRequestWithPin(activePinRequest.id);
        if (pinActionType === 'edit') {
            toast({ title: "PIN Validé", description: "Redirection vers la page de modification." });
            router.push(`/work-types/${workTypeTargetedForAction.id}/edit`);
        } else if (pinActionType === 'delete') {
            await deleteWorkTypeFromFirestore(workTypeTargetedForAction.id);
            fetchWorkTypes(); 
            toast({ title: "Type de Travail Supprimé", description: `"${workTypeTargetedForAction.name}" a été supprimé via PIN.` });
        }
    } catch (error) {
        console.error(`Erreur lors de l'action ${pinActionType} avec PIN:`, error);
        toast({ title: "Erreur", description: `Échec de l'action ${pinActionType} avec PIN.`, variant: "destructive" });
    } finally {
        setShowPinDialog(false); setPinEntry(''); setActivePinRequest(null); setWorkTypeTargetedForAction(null); setPinActionType(null);
        setIsProcessingAction(false);
    }
  };

  const handleReasonDialogSubmit = async () => {
    if (!workTypeTargetedForAction || !currentActionType || !user) return;

    if (isAdmin || workTypeTargetedForAction.createdByUserId === user.uid) { 
        if (currentActionType === 'delete') {
            setIsProcessingAction(true);
            try {
                await deleteWorkTypeFromFirestore(workTypeTargetedForAction.id);
                fetchWorkTypes(); 
                toast({ title: "Type de Travail Supprimé", description: `"${workTypeTargetedForAction.name}" a été supprimé.` });
            } catch (error) {
                toast({ title: "Erreur de Suppression", variant: "destructive" });
            } finally {
                setIsProcessingAction(false);
            }
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
                requestedByUserName: user.displayName || user.email || "Utilisateur inconnu",
                entityType: 'workType',
                entityId: workTypeTargetedForAction.id,
                entityDescription: `Type de Travail: ${workTypeTargetedForAction.name}`,
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
    setShowReasonDialog(false); setActionReason(''); setWorkTypeTargetedForAction(null); setCurrentActionType(null);
  };


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
            Affichage: {isLoading ? "..." : filteredWorkTypes.length} type(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Chargement des types de travail...</p>
            </div>
          ) : filteredWorkTypes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
                <Briefcase className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">
                {searchTerm
                    ? "Aucun type de travail ne correspond à votre recherche."
                    : "Aucun type de travail n'a été trouvé. Commencez par en ajouter un !"
                }
                </p>
                 {(!searchTerm) && (
                    <Button asChild className="mt-4">
                        <Link href="/work-types/add"><PlusCircle className="mr-2 h-4 w-4" />Ajouter un Type</Link>
                    </Button>
                )}
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                        <Button variant="outline" size="sm" onClick={() => handleEditWorkTypeAction(wt)}
                            disabled={isProcessingAction && currentActionType === 'edit' && workTypeTargetedForAction?.id === wt.id}>
                            {(isProcessingAction && currentActionType === 'edit' && workTypeTargetedForAction?.id === wt.id) ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <Edit className="mr-1 h-4 w-4" />} Modifier
                        </Button>

                        <Button variant="destructive" size="sm" onClick={() => handleDeleteWorkTypeAction(wt)}
                            disabled={isProcessingAction && currentActionType === 'delete' && workTypeTargetedForAction?.id === wt.id}>
                            {(isProcessingAction && currentActionType === 'delete' && workTypeTargetedForAction?.id === wt.id) ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <Trash2 className="mr-1 h-4 w-4" />} Supprimer
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

      <AlertDialog open={showReasonDialog} onOpenChange={(isOpen) => {
        if (!isOpen) { setWorkTypeTargetedForAction(null); setActionReason(''); setCurrentActionType(null); }
        setShowReasonDialog(isOpen);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {currentActionType === 'delete' && (isAdmin || workTypeTargetedForAction?.createdByUserId === user?.uid) 
                ? `Confirmer la Suppression: "${workTypeTargetedForAction?.name}"?` 
                : `Demande de ${currentActionType === 'edit' ? 'Modification' : 'Suppression'}: ${workTypeTargetedForAction?.name}`}
            </AlertDialogTitle>
            {currentActionType === 'delete' && (isAdmin || workTypeTargetedForAction?.createdByUserId === user?.uid) ? (
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            ) : (
              <div className="space-y-2 py-2 text-left">
                <Label htmlFor={`actionReason-${workTypeTargetedForAction?.id}`}>Raison :</Label>
                <Textarea id={`actionReason-${workTypeTargetedForAction?.id}`} value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder={`Raison de la ${currentActionType === 'edit' ? 'modification' : 'suppression'}...`} disabled={isProcessingAction} />
                <p className="text-xs text-muted-foreground">Votre demande sera examinée.</p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setShowReasonDialog(false); setWorkTypeTargetedForAction(null); setActionReason(''); setCurrentActionType(null);}} disabled={isProcessingAction}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleReasonDialogSubmit} 
                className={cn(currentActionType === 'delete' && (isAdmin || workTypeTargetedForAction?.createdByUserId === user?.uid) ? buttonVariants({variant: "destructive"}) : "")}
                disabled={isProcessingAction || (currentActionType !== 'delete' && !(isAdmin || workTypeTargetedForAction?.createdByUserId === user?.uid) && !actionReason.trim())}>
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <Dialog open={showPinDialog} onOpenChange={(isOpen) => {
        if (!isOpen) { setPinEntry(''); setActivePinRequest(null); setWorkTypeTargetedForAction(null); setCurrentActionType(null); setPinActionType(null); }
        setShowPinDialog(isOpen);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHead> 
            <DialogTitl className="flex items-center"> 
                <KeyRound className="mr-2 h-5 w-5 text-primary" /> Saisir le PIN
            </DialogTitl>
            <DialogDesc> 
              Un PIN vous a été fourni par un administrateur pour {pinActionType === 'edit' ? 'modifier' : 'supprimer'} le type de travail "{workTypeTargetedForAction?.name || "sélectionné"}".
            </DialogDesc>
          </DialogHead>
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
          <DialogFoot> 
            <DialogClose asChild>
                <Button variant="outline" disabled={isProcessingAction} onClick={() => { setPinEntry(''); setActivePinRequest(null); setWorkTypeTargetedForAction(null); setCurrentActionType(null); setPinActionType(null);}}>Annuler</Button>
            </DialogClose>
            <Button onClick={handlePinSubmit} disabled={isProcessingAction || pinEntry.length !== 6}>
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Valider et {pinActionType === 'edit' ? 'Modifier' : 'Supprimer'}
            </Button>
          </DialogFoot>
        </DialogContent>
      </Dialog>
    </>
  );
}

