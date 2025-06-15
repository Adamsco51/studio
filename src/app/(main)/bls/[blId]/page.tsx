
"use client";

import React, { useState, useEffect, useMemo, use, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    getBLByIdFromFirestore,
    getClientByIdFromFirestore,
    getExpensesByBlIdFromFirestore,
    getWorkTypeByIdFromFirestore,
    deleteBLFromFirestore,
    deleteExpenseFromFirestore,
    getEmployeeNameFromMock,
    addApprovalRequestToFirestore,
    getUserProfile,
    getPinIssuedRequestForEntity,
    completeApprovalRequestWithPin,
    getExpenseByIdFromFirestore,
    updateExpenseInFirestore,
    getContainersByBlIdFromFirestore,
    deleteContainerFromFirestore,
} from '@/lib/mock-data';
import type { BillOfLading, Expense, Client, BLStatus, WorkType, ApprovalRequest, Container } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, PlusCircle, DollarSign, FileText, Package, ShoppingCart, Users as ClientIconLucide, User as EmployeeIconLucideUser, Tag, CheckCircle, AlertCircle, Clock, Briefcase, UserCircle2, Loader2, KeyRound, Box, Ship, Truck, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExpenseForm } from '@/components/expense/expense-form';
import { ContainerForm } from '@/components/container/container-form';
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

const getStatusBadgeVariant = (status: BLStatus) => {
  if (status === 'terminé') return 'default';
  if (status === 'en cours') return 'secondary';
  if (status === 'inactif') return 'outline';
  return 'default';
};

const getStatusIcon = (status: BLStatus) => {
  if (status === 'terminé') return <CheckCircle className="mr-1 h-4 w-4 text-green-500" />;
  if (status === 'en cours') return <Clock className="mr-1 h-4 w-4 text-blue-500" />;
  if (status === 'inactif') return <AlertCircle className="mr-1 h-4 w-4 text-gray-500" />;
  return null;
}

const formatDateForDisplay = (dateString?: string | null) => {
  if (!dateString) return <span className="text-muted-foreground/70">-</span>;
  try {
    return format(parseISO(dateString), 'dd/MM/yy', { locale: fr });
  } catch {
    return <span className="text-destructive">Date?</span>;
  }
};


export default function BLDetailPage({ params: paramsPromise }: { params: Promise<{ blId: string }> }) {
  const { blId } = use(paramsPromise);
  const { user, isAdmin } = useAuth();
  const [bl, setBl] = useState<BillOfLading | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [workType, setWorkType] = useState<WorkType | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingContainers, setIsLoadingContainers] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const [createdByUserDisplay, setCreatedByUserDisplay] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [showDeleteBlDialog, setShowDeleteBlDialog] = useState(false);
  const [deleteBlReason, setDeleteBlReason] = useState('');

  const [showDeleteExpenseDialog, setShowDeleteExpenseDialog] = useState(false);
  const [requestingDeleteExpense, setRequestingDeleteExpense] = useState<Expense | null>(null);
  const [deleteExpenseReason, setDeleteExpenseReason] = useState('');

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [activePinRequest, setActivePinRequest] = useState<ApprovalRequest | null>(null);
  const [pinActionType, setPinActionType] = useState<'edit' | 'delete' | null>(null);
  const [pinEntityType, setPinEntityType] = useState<'bl' | 'expense' | 'container' | null>(null);
  const [pinTargetEntityId, setPinTargetEntityId] = useState<string | null>(null);

  const [showEditExpenseDialog, setShowEditExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [showAddContainerDialog, setShowAddContainerDialog] = useState(false);
  const [showEditContainerDialog, setShowEditContainerDialog] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [showDeleteContainerDialog, setShowDeleteContainerDialog] = useState(false);
  const [requestingDeleteContainer, setRequestingDeleteContainer] = useState<Container | null>(null);
  const [deleteContainerReason, setDeleteContainerReason] = useState('');


  const fetchBlAndRelatedData = useCallback(async () => {
    if (!blId || !user) {
      setIsLoading(false);
      setIsLoadingExpenses(false);
      setIsLoadingContainers(false);
      return;
    }
    setIsLoading(true);
    setIsLoadingExpenses(true);
    setIsLoadingContainers(true);
    try {
      const foundBl = await getBLByIdFromFirestore(blId);
      setBl(foundBl);

      if (foundBl) {
        if (foundBl.clientId) {
          const foundClient = await getClientByIdFromFirestore(foundBl.clientId);
          setClient(foundClient);
        }
        if (foundBl.workTypeId) {
          const foundWorkType = await getWorkTypeByIdFromFirestore(foundBl.workTypeId);
          setWorkType(foundWorkType || null);
        }

        const blExpenses = await getExpensesByBlIdFromFirestore(blId);
        setExpenses(blExpenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsLoadingExpenses(false);

        const blContainers = await getContainersByBlIdFromFirestore(blId);
        setContainers(blContainers.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setIsLoadingContainers(false);

        if (foundBl.createdByUserId) {
          const creatorProfile = await getUserProfile(foundBl.createdByUserId);
          setCreatedByUserDisplay(creatorProfile?.displayName || getEmployeeNameFromMock(foundBl.createdByUserId));
        }
      } else {
        toast({ title: "Erreur", description: "Connaissement non trouvé.", variant: "destructive" });
        setIsLoadingExpenses(false);
        setIsLoadingContainers(false);
      }
    } catch (error) {
      console.error("Failed to fetch BL details:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger les détails du BL.", variant: "destructive" });
      setIsLoadingExpenses(false);
      setIsLoadingContainers(false);
    } finally {
      setIsLoading(false);
    }
  }, [blId, user, toast]);

  useEffect(() => {
    fetchBlAndRelatedData();
  }, [fetchBlAndRelatedData]);

  const { totalExpenses, balance, profitStatus, profit } = useMemo(() => {
    if (!bl) return { totalExpenses: 0, balance: 0, profitStatus: 'N/A', profit: false };
    const currentTotalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const currentBalance = bl.allocatedAmount - currentTotalExpenses;
    return {
      totalExpenses: currentTotalExpenses,
      balance: currentBalance,
      profitStatus: currentBalance >= 0 ? 'Bénéfice' : 'Perte',
      profit: currentBalance >= 0,
    };
  }, [bl, expenses]);

  const handleExpenseAddedOrUpdated = (savedExpense: Expense) => {
    fetchBlAndRelatedData(); 
    if (showEditExpenseDialog) setShowEditExpenseDialog(false);
    setEditingExpense(null);
  };

  const handleContainerSaved = (savedContainer: Container) => {
    fetchBlAndRelatedData(); 
    if (showAddContainerDialog) setShowAddContainerDialog(false);
    if (showEditContainerDialog) setShowEditContainerDialog(false);
    setEditingContainer(null);
  };


  const handleEditBlAction = async () => {
    if (!bl || !user) return;
    setPinTargetEntityId(bl.id);
    if (isAdmin) {
      router.push(`/bls/${bl.id}/edit`);
    } else {
      setIsProcessingRequest(true);
      try {
        const pinRequest = await getPinIssuedRequestForEntity('bl', bl.id, 'edit');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setPinActionType('edit');
          setPinEntityType('bl');
          setShowPinDialog(true);
        } else {
          setEditRequestReason('');
          setShowEditRequestDialog(true);
        }
      } catch (error) {
         toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive" });
      } finally {
        setIsProcessingRequest(false);
      }
    }
  };

  const handleDeleteBlAction = async () => {
    if (!bl || !user) return;
    setPinTargetEntityId(bl.id);
     if (isAdmin) {
      setShowDeleteBlDialog(true);
    } else {
      setIsProcessingRequest(true);
      try {
        const pinRequest = await getPinIssuedRequestForEntity('bl', bl.id, 'delete');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setPinActionType('delete');
          setPinEntityType('bl');
          setShowPinDialog(true);
        } else {
          setDeleteBlReason('');
          setShowDeleteBlDialog(true);
        }
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive" });
      } finally {
        setIsProcessingRequest(false);
      }
    }
  };

  const handleDeleteExpenseAction = async (expense: Expense) => {
    if(!user || !bl) return;
    setRequestingDeleteExpense(expense);
    setPinTargetEntityId(expense.id);
    setPinActionType('delete');
    setPinEntityType('expense');
    if (isAdmin) {
      setShowDeleteExpenseDialog(true);
    } else {
       setIsProcessingRequest(true);
      try {
        const pinRequest = await getPinIssuedRequestForEntity('expense', expense.id, 'delete');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setShowPinDialog(true);
        } else {
          setDeleteExpenseReason('');
          setShowDeleteExpenseDialog(true);
        }
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive" });
      } finally {
        setIsProcessingRequest(false);
      }
    }
  };

  const handleEditExpenseAction = async (expense: Expense) => {
    if (!user || !bl) return;
    setEditingExpense(expense);
    setPinTargetEntityId(expense.id);
    setPinActionType('edit');
    setPinEntityType('expense');

    if (isAdmin) {
      setShowEditExpenseDialog(true);
    } else {
      setIsProcessingRequest(true);
      try {
        const pinRequest = await getPinIssuedRequestForEntity('expense', expense.id, 'edit');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setShowPinDialog(true);
        } else {
          toast({ title: "Action Requise", description: "Veuillez demander une approbation avec PIN à un administrateur pour modifier cette dépense.", variant: "default", duration: 5000 });
          setEditingExpense(null);
          setPinTargetEntityId(null);
        }
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants pour la modification de la dépense.", variant: "destructive" });
      } finally {
        setIsProcessingRequest(false);
      }
    }
  };

  const handleEditContainerAction = async (container: Container) => {
    if (!user || !bl) return;
    setEditingContainer(container);
    setPinTargetEntityId(container.id);
    setPinActionType('edit');
    setPinEntityType('container');

    if (isAdmin) {
      setShowEditContainerDialog(true);
    } else {
      setIsProcessingRequest(true);
      try {
        const pinRequest = await getPinIssuedRequestForEntity('container', container.id, 'edit');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setShowPinDialog(true);
        } else {
          toast({ title: "Action Requise", description: "Veuillez demander une approbation avec PIN à un administrateur pour modifier ce conteneur.", variant: "default", duration: 5000 });
          setEditingContainer(null);
          setPinTargetEntityId(null);
        }
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants pour la modification du conteneur.", variant: "destructive" });
      } finally {
        setIsProcessingRequest(false);
      }
    }
  };

  const handleDeleteContainerAction = async (container: Container) => {
    if (!user || !bl) return;
    setRequestingDeleteContainer(container);
    setPinTargetEntityId(container.id);
    setPinActionType('delete');
    setPinEntityType('container');

    if (isAdmin) {
      setShowDeleteContainerDialog(true);
    } else {
      setIsProcessingRequest(true);
      try {
        const pinRequest = await getPinIssuedRequestForEntity('container', container.id, 'delete');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setShowPinDialog(true);
        } else {
          setDeleteContainerReason('');
          setShowDeleteContainerDialog(true);
        }
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants pour la suppression du conteneur.", variant: "destructive" });
      } finally {
        setIsProcessingRequest(false);
      }
    }
  };


  const handlePinSubmit = async () => {
    if (!pinEntry.trim() || !activePinRequest || !pinActionType || !pinEntityType || !pinTargetEntityId) {
      toast({ title: "Erreur", description: "PIN requis ou informations manquantes.", variant: "destructive" });
      return;
    }
    if (pinEntry !== activePinRequest.pinCode) {
      toast({ title: "Erreur PIN", description: "Le PIN saisi est incorrect.", variant: "destructive" });
      return;
    }
    if (activePinRequest.pinExpiresAt && new Date() > new Date(activePinRequest.pinExpiresAt)) {
        toast({ title: "Erreur PIN", description: "Le PIN a expiré.", variant: "destructive" });
        setShowPinDialog(false);
        setPinEntry('');
        setActivePinRequest(null);
        setPinTargetEntityId(null);
        return;
    }

    setIsProcessingRequest(true);
    try {
      if (pinEntityType === 'bl') {
        if (pinActionType === 'edit') {
          await completeApprovalRequestWithPin(activePinRequest.id);
          toast({ title: "PIN Validé", description: "Redirection vers la page de modification." });
          router.push(`/bls/${pinTargetEntityId}/edit`);
        } else if (pinActionType === 'delete') {
          await deleteBLFromFirestore(pinTargetEntityId);
          await completeApprovalRequestWithPin(activePinRequest.id);
          toast({ title: "BL Supprimé", description: `Le BL N° ${bl?.blNumber} a été supprimé avec succès via PIN.` });
          router.push('/bls');
          router.refresh();
        }
      } else if (pinEntityType === 'expense') {
         if (pinActionType === 'delete' && requestingDeleteExpense && requestingDeleteExpense.id === pinTargetEntityId) {
            await deleteExpenseFromFirestore(requestingDeleteExpense.id);
            await completeApprovalRequestWithPin(activePinRequest.id);
            toast({ title: "Dépense Supprimée", description: `La dépense "${requestingDeleteExpense.label}" a été supprimée via PIN.` });
            fetchBlAndRelatedData(); 
         } else if (pinActionType === 'edit' && editingExpense && editingExpense.id === pinTargetEntityId) {
            await completeApprovalRequestWithPin(activePinRequest.id);
            toast({ title: "PIN Validé", description: "Vous pouvez maintenant modifier la dépense." });
            setShowEditExpenseDialog(true);
         }
      } else if (pinEntityType === 'container') {
        if (pinActionType === 'delete' && requestingDeleteContainer && requestingDeleteContainer.id === pinTargetEntityId && bl) {
          await deleteContainerFromFirestore(requestingDeleteContainer.id, bl.id);
          await completeApprovalRequestWithPin(activePinRequest.id);
          toast({ title: "Conteneur Supprimé", description: `Le conteneur "${requestingDeleteContainer.containerNumber}" a été supprimé via PIN.` });
          fetchBlAndRelatedData(); 
        } else if (pinActionType === 'edit' && editingContainer && editingContainer.id === pinTargetEntityId) {
          await completeApprovalRequestWithPin(activePinRequest.id);
          toast({ title: "PIN Validé", description: "Vous pouvez maintenant modifier le conteneur." });
          setShowEditContainerDialog(true);
        }
      }
      setShowPinDialog(false);
      setPinEntry('');
      setActivePinRequest(null);
      if (pinActionType === 'delete') {
        if (pinEntityType === 'bl') { /* BL deleted, page will redirect */ }
        else if (pinEntityType === 'expense') setRequestingDeleteExpense(null);
        else if (pinEntityType === 'container') setRequestingDeleteContainer(null);
      }
      setPinTargetEntityId(null);
    } catch (error) {
      console.error(`Erreur lors de l'action ${pinActionType} avec PIN:`, error);
      toast({ title: "Erreur", description: `Échec de l'action ${pinActionType} avec PIN.`, variant: "destructive" });
    } finally {
      setIsProcessingRequest(false);
    }
  };


  const handleDeleteExpenseDirectly = async (expenseId: string) => {
    if (!isAdmin) return;
    setIsDeleting(true); 
    try {
      await deleteExpenseFromFirestore(expenseId);
      toast({ title: "Dépense Supprimée", description: "La dépense a été supprimée." });
      fetchBlAndRelatedData(); 
    } catch (error) {
        console.error("Failed to delete expense:", error);
        toast({ title: "Erreur", description: "Échec de la suppression de la dépense.", variant: "destructive" });
    } finally {
        setShowDeleteExpenseDialog(false);
        setRequestingDeleteExpense(null);
        setIsDeleting(false);
    }
  };

  const handleDeleteContainerDirectly = async (containerId: string) => {
    if (!isAdmin || !bl) return;
    setIsDeleting(true);
    try {
        await deleteContainerFromFirestore(containerId, bl.id);
        toast({ title: "Conteneur Supprimé", description: "Le conteneur a été supprimé." });
        fetchBlAndRelatedData(); 
    } catch (error) {
        console.error("Failed to delete container:", error);
        toast({ title: "Erreur", description: "Échec de la suppression du conteneur.", variant: "destructive" });
    } finally {
        setShowDeleteContainerDialog(false);
        setRequestingDeleteContainer(null);
        setIsDeleting(false);
    }
  };

  const handleDeleteBLDirectly = async () => {
    if (!bl || !bl.id || !isAdmin) return;
    setIsDeleting(true);
    try {
        await deleteBLFromFirestore(bl.id);
        toast({ title: "BL Supprimé", description: `Le BL N° ${bl.blNumber} a été supprimé.` });
        router.push('/bls');
        router.refresh();
    } catch (error) {
        console.error("Failed to delete BL:", error);
        toast({ title: "Erreur", description: "Échec de la suppression du BL.", variant: "destructive" });
    } finally {
        setIsDeleting(false);
        setShowDeleteBlDialog(false);
    }
  };

  const handleSubmitEditRequest = async () => {
    if (!editRequestReason.trim() || !user || !bl) {
      toast({ title: "Erreur", description: "Veuillez fournir une raison et être connecté.", variant: "destructive" });
      return;
    }
    setIsProcessingRequest(true);
    try {
        await addApprovalRequestToFirestore({
            requestedByUserId: user.uid,
            requestedByUserName: user.displayName || user.email || "Utilisateur inconnu",
            entityType: 'bl',
            entityId: bl.id,
            entityDescription: `BL N° ${bl.blNumber}`,
            actionType: 'edit',
            reason: editRequestReason,
        });
        toast({ title: "Demande Enregistrée", description: "Votre demande de modification a été enregistrée." });
    } catch (error) {
        toast({ title: "Erreur", description: "Échec de l'envoi de la demande.", variant: "destructive" });
    } finally {
        setEditRequestReason('');
        setShowEditRequestDialog(false);
        setIsProcessingRequest(false);
    }
  };

  const handleSubmitDeleteBlRequest = async () => {
    if (!deleteBlReason.trim() || !user || !bl) {
        toast({ title: "Erreur", description: "Veuillez fournir une raison et être connecté.", variant: "destructive" });
        return;
    }
    setIsProcessingRequest(true);
    try {
        await addApprovalRequestToFirestore({
            requestedByUserId: user.uid,
            requestedByUserName: user.displayName || user.email || "Utilisateur inconnu",
            entityType: 'bl',
            entityId: bl.id,
            entityDescription: `BL N° ${bl.blNumber}`,
            actionType: 'delete',
            reason: deleteBlReason,
        });
        toast({ title: "Demande Enregistrée", description: "Votre demande de suppression de BL a été enregistrée." });
    } catch (error) {
        toast({ title: "Erreur", description: "Échec de l'envoi de la demande.", variant: "destructive" });
    } finally {
        setDeleteBlReason('');
        setShowDeleteBlDialog(false);
        setIsProcessingRequest(false);
    }
  };

  const handleSubmitDeleteExpenseRequest = async () => {
    if (!requestingDeleteExpense || !deleteExpenseReason.trim() || !user || !bl) {
        toast({ title: "Erreur", description: "Infos manquantes pour la demande.", variant: "destructive" });
        return;
    }
    setIsProcessingRequest(true);
    try {
        await addApprovalRequestToFirestore({
            requestedByUserId: user.uid,
            requestedByUserName: user.displayName || user.email || "Utilisateur inconnu",
            entityType: 'expense',
            entityId: requestingDeleteExpense.id,
            entityDescription: `Dépense: ${requestingDeleteExpense.label} (BL N° ${bl.blNumber})`,
            actionType: 'delete',
            reason: deleteExpenseReason,
        });
        toast({ title: "Demande Enregistrée", description: "Demande de suppression de dépense enregistrée." });
    } catch (error) {
        toast({ title: "Erreur", description: "Échec de l'envoi de la demande.", variant: "destructive" });
    } finally {
        setDeleteExpenseReason('');
        setShowDeleteExpenseDialog(false);
        setRequestingDeleteExpense(null);
        setIsProcessingRequest(false);
    }
  };

  const handleSubmitDeleteContainerRequest = async () => {
    if (!requestingDeleteContainer || !deleteContainerReason.trim() || !user || !bl) {
        toast({ title: "Erreur", description: "Infos manquantes pour la demande.", variant: "destructive" });
        return;
    }
    setIsProcessingRequest(true);
    try {
        await addApprovalRequestToFirestore({
            requestedByUserId: user.uid,
            requestedByUserName: user.displayName || user.email || "Utilisateur inconnu",
            entityType: 'container',
            entityId: requestingDeleteContainer.id,
            entityDescription: `Conteneur N° ${requestingDeleteContainer.containerNumber} (BL N° ${bl.blNumber})`,
            actionType: 'delete',
            reason: deleteContainerReason,
        });
        toast({ title: "Demande Enregistrée", description: "Demande de suppression de conteneur enregistrée." });
    } catch (error) {
        toast({ title: "Erreur", description: "Échec de l'envoi de la demande.", variant: "destructive" });
    } finally {
        setDeleteContainerReason('');
        setShowDeleteContainerDialog(false);
        setRequestingDeleteContainer(null);
        setIsProcessingRequest(false);
    }
  };


  if (isLoading || (!bl && isLoading)) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement du connaissement...</p>
        </div>
    );
  }

  if (!bl) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Connaissement non trouvé ou erreur de chargement.</p>
        <Link href="/bls" passHref>
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des BLs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`BL N°: ${bl.blNumber}`}
        description={`Détails du connaissement pour ${client?.name || 'client inconnu'}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/bls" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
            </Link>
            <Button variant="outline" onClick={handleEditBlAction} disabled={isProcessingRequest || isDeleting}>
              {(isProcessingRequest && pinEntityType === 'bl' && pinActionType === 'edit') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Edit className="mr-2 h-4 w-4" /> Modifier BL
            </Button>
            <Button variant="destructive" onClick={handleDeleteBlAction} disabled={isProcessingRequest || isDeleting}>
              {(isDeleting && isAdmin) || (isProcessingRequest && pinEntityType === 'bl' && pinActionType === 'delete') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer BL
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Informations du BL</span>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(bl.status)} className={cn(
                    "capitalize",
                    bl.status === 'terminé' && 'bg-green-100 text-green-700 border-green-300',
                    bl.status === 'en cours' && 'bg-blue-100 text-blue-700 border-blue-300',
                    bl.status === 'inactif' && 'bg-gray-100 text-gray-700 border-gray-300',
                  )}>
                    {getStatusIcon(bl.status)}
                    {bl.status}
                  </Badge>
                  <Badge variant={profit ? 'default' : 'destructive'} className={`${profit ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                    {profitStatus}
                  </Badge>
                </div>
              </CardTitle>
               {client && (
                <CardDescription>
                  Client: <Link href={`/clients/${client.id}`} className="text-primary hover:underline">{client.name}</Link>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-sm text-muted-foreground">N° BL</p><p className="font-semibold">{bl.blNumber}</p></div>
              <div><p className="text-sm text-muted-foreground">Montant Alloué</p><p className="font-semibold text-green-600">{bl.allocatedAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</p></div>
              <div><p className="text-sm text-muted-foreground">Date de création</p><p className="font-semibold">{bl.createdAt ? format(parseISO(bl.createdAt), 'dd MMMM yyyy, HH:mm', { locale: fr }) : 'N/A'}</p></div>
              {createdByUserDisplay && (<div><p className="text-sm text-muted-foreground flex items-center"><UserCircle2 className="mr-2 h-4 w-4"/>Créé par</p><p className="font-semibold">{createdByUserDisplay}</p></div>)}
              <div><p className="text-sm text-muted-foreground">Dépenses Totales</p><p className="font-semibold text-red-600">{totalExpenses.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</p></div>
              <div className="md:col-span-2"><p className="text-sm text-muted-foreground">Solde Actuel</p><p className={`text-2xl font-bold ${profit ? 'text-green-600' : 'text-red-600'}`}>{balance.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</p></div>
              <div><p className="text-sm text-muted-foreground flex items-center"><Briefcase className="mr-2 h-4 w-4"/>Type de Travail</p><p className="font-semibold">{workType?.name || 'N/A'}</p></div>
               <div className="md:col-span-2"><p className="text-sm text-muted-foreground flex items-center"><Tag className="mr-2 h-4 w-4"/>Catégories Manuelles</p>{bl.categories && bl.categories.length > 0 ? (<div className="flex flex-wrap gap-2 mt-1">{bl.categories.map((cat, idx) => <Badge key={`manual-cat-${idx}`} variant="outline">{cat}</Badge>)}</div>) : (<p className="text-sm text-muted-foreground italic">Aucune catégorie.</p>)}</div>
              {bl.description && (<div className="md:col-span-2"><p className="text-sm text-muted-foreground">Description</p><p className="font-medium bg-secondary/30 p-2 rounded-md text-sm">{bl.description}</p></div>)}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Box className="h-6 w-6 text-primary"/>Conteneurs Associés</CardTitle>
              <Button size="sm" onClick={() => setShowAddContainerDialog(true)} disabled={isProcessingRequest}>
                <PlusCircle className="mr-2 h-4 w-4"/> Ajouter Conteneur
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingContainers ? (
                <div className="flex justify-center items-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Chargement des conteneurs...</p></div>
              ) : containers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">N° Conteneur</TableHead>
                        <TableHead className="whitespace-nowrap">Type</TableHead>
                        <TableHead className="whitespace-nowrap">Statut</TableHead>
                        <TableHead className="whitespace-nowrap text-center" title="Date Embarquement Navire"><Ship className="h-4 w-4 inline-block mr-1"/>Emb. Nav.</TableHead>
                        <TableHead className="whitespace-nowrap text-center" title="Date Déchargement Navire">Dé. Nav.</TableHead>
                        <TableHead className="whitespace-nowrap text-center" title="Date Chargement Camion"><Truck className="h-4 w-4 inline-block mr-1"/>Ch. Cam.</TableHead>
                        <TableHead className="whitespace-nowrap text-center" title="Date Arrivée Destination"><CalendarDays className="h-4 w-4 inline-block mr-1"/>Arr. Dest.</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {containers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium whitespace-nowrap">{c.containerNumber}</TableCell>
                          <TableCell className="whitespace-nowrap">{c.type}</TableCell>
                          <TableCell><Badge variant="secondary">{c.status}</Badge></TableCell>
                          <TableCell className="text-center whitespace-nowrap">{formatDateForDisplay(c.shippingDate)}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">{formatDateForDisplay(c.dischargeDate)}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">{formatDateForDisplay(c.truckLoadingDate)}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">{formatDateForDisplay(c.destinationArrivalDate)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              <Button variant="ghost" size="sm" title="Modifier Conteneur" onClick={() => handleEditContainerAction(c)}
                                disabled={isProcessingRequest && pinEntityType === 'container' && pinActionType === 'edit' && pinTargetEntityId === c.id}>
                                {(isProcessingRequest && pinEntityType === 'container' && pinActionType === 'edit' && pinTargetEntityId === c.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Edit className="h-4 w-4" />}
                              </Button>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" title="Supprimer Conteneur" onClick={() => handleDeleteContainerAction(c)}
                                 disabled={(isProcessingRequest && pinEntityType === 'container' && pinActionType === 'delete' && pinTargetEntityId === c.id) || (isDeleting && isAdmin && requestingDeleteContainer?.id === c.id)}>
                                 {((isProcessingRequest && pinEntityType === 'container' && pinActionType === 'delete' && pinTargetEntityId === c.id) || (isDeleting && isAdmin && requestingDeleteContainer?.id === c.id)) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground"><Package className="mx-auto h-12 w-12 opacity-50" /><p className="mt-2">Aucun conteneur associé à ce BL.</p></div>
              )}
            </CardContent>
          </Card>


          <Card className="shadow-lg">
            <CardHeader><CardTitle>Dépenses Associées</CardTitle></CardHeader>
            <CardContent>
              {isLoadingExpenses ? (
                 <div className="flex justify-center items-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Chargement des dépenses...</p></div>
              ) : expenses.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Libellé</TableHead><TableHead>Date</TableHead><TableHead>Employé</TableHead><TableHead className="text-right">Montant</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {expenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="font-medium">{exp.label}</TableCell>
                        <TableCell>{format(parseISO(exp.date), 'dd/MM/yy HH:mm', { locale: fr })}</TableCell>
                        <TableCell>{getEmployeeNameFromMock(exp.employeeId)}</TableCell>
                        <TableCell className="text-right">{exp.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <Button variant="ghost" size="sm" title="Modifier Dépense" onClick={() => handleEditExpenseAction(exp)}
                              disabled={isProcessingRequest && pinEntityType === 'expense' && pinActionType === 'edit' && pinTargetEntityId === exp.id}>
                              {(isProcessingRequest && pinEntityType === 'expense' && pinActionType === 'edit' && pinTargetEntityId === exp.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Edit className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteExpenseAction(exp)}
                              disabled={(isProcessingRequest && pinEntityType === 'expense' && pinActionType === 'delete' && pinTargetEntityId === exp.id) || (isDeleting && isAdmin && requestingDeleteExpense?.id === exp.id)} title="Supprimer Dépense">
                              {((isProcessingRequest && pinEntityType === 'expense' && pinActionType === 'delete' && pinTargetEntityId === exp.id) || (isDeleting && isAdmin && requestingDeleteExpense?.id === exp.id)) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground"><DollarSign className="mx-auto h-12 w-12 opacity-50" /><p className="mt-2">Aucune dépense enregistrée.</p></div>
              )}
            </CardContent>
            <CardFooter><ExpenseForm blId={bl.id} onExpenseAddedOrUpdated={handleExpenseAddedOrUpdated} /></CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            {client && (<Card className="shadow-md"><CardHeader><CardTitle className="flex items-center gap-2"><ClientIconLucide className="h-5 w-5 text-primary"/> Infos Client</CardTitle></CardHeader><CardContent className="text-sm space-y-1"><p className="font-semibold">{client.name}</p><p className="text-muted-foreground">{client.contactPerson}</p><p className="text-muted-foreground">{client.email}</p><p className="text-muted-foreground">{client.phone}</p><Button variant="link" size="sm" asChild className="p-0 h-auto"><Link href={`/clients/${client.id}`}>Voir fiche client <ArrowLeft className="transform rotate-180 ml-1 h-3 w-3"/></Link></Button></CardContent></Card>)}
            <Card className="shadow-md"><CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-accent"/> Actions Rapides</CardTitle></CardHeader><CardContent className="space-y-2"><Button className="w-full justify-start" variant="outline" disabled>Générer un rapport (PDF)</Button><Button className="w-full justify-start" variant="outline" disabled>Exporter pour comptabilité</Button><Button className="w-full justify-start" variant="outline" disabled>Archiver le BL</Button></CardContent></Card>
        </div>
      </div>

      <Dialog open={showAddContainerDialog} onOpenChange={setShowAddContainerDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Ajouter un Conteneur au BL N° {bl.blNumber}</DialogTitle><DialogDescription>Remplissez les informations du nouveau conteneur.</DialogDescription></DialogHeader>
          <ContainerForm blId={bl.id} onContainerSaved={handleContainerSaved} setDialogOpen={setShowAddContainerDialog} />
        </DialogContent>
      </Dialog>

      <Dialog open={showEditContainerDialog} onOpenChange={(open) => { if (!open) setEditingContainer(null); setShowEditContainerDialog(open); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Modifier Conteneur N° {editingContainer?.containerNumber || "sélectionné"}</DialogTitle><DialogDescription>Mettez à jour les informations de ce conteneur.</DialogDescription></DialogHeader>
          {editingContainer && bl && <ContainerForm blId={bl.id} initialData={editingContainer} onContainerSaved={handleContainerSaved} setDialogOpen={setShowEditContainerDialog} />}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showDeleteContainerDialog} onOpenChange={(isOpen) => { if (!isOpen) { setRequestingDeleteContainer(null); setDeleteContainerReason(''); if (pinEntityType === 'container' && pinActionType === 'delete') setPinTargetEntityId(null); } setShowDeleteContainerDialog(isOpen); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAdmin ? `Supprimer Conteneur ${requestingDeleteContainer?.containerNumber}?` : `Demande de Suppression: ${requestingDeleteContainer?.containerNumber || "sélectionné"}`}</AlertDialogTitle>
            {isAdmin ? (
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            ) : (
              <div className="space-y-2 py-2 text-left"><Label htmlFor={`deleteContainerReason-${requestingDeleteContainer?.id}`}>Raison :</Label><Textarea id={`deleteContainerReason-${requestingDeleteContainer?.id}`} placeholder="Raison de la suppression..." value={deleteContainerReason} onChange={(e) => setDeleteContainerReason(e.target.value)} className="min-h-[100px]" disabled={isProcessingRequest}/><p className="text-xs text-muted-foreground">Votre demande sera examinée.</p></div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isProcessingRequest || (isDeleting && isAdmin)} onClick={() => { setShowDeleteContainerDialog(false); setRequestingDeleteContainer(null); setDeleteContainerReason(''); if (pinEntityType === 'container' && pinActionType === 'delete') setPinTargetEntityId(null);}}>Annuler</Button></DialogClose>
            <Button onClick={isAdmin && requestingDeleteContainer ? () => handleDeleteContainerDirectly(requestingDeleteContainer.id) : handleSubmitDeleteContainerRequest} variant={isAdmin ? "destructive" : "default"} disabled={isProcessingRequest || (isDeleting && isAdmin) || (!isAdmin && !deleteContainerReason.trim())}>
              {(isProcessingRequest || (isDeleting && isAdmin)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isAdmin ? "Confirmer" : "Soumettre Demande"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showEditRequestDialog} onOpenChange={(isOpen) => { if (!isOpen) setEditRequestReason(''); setShowEditRequestDialog(isOpen); }}>
        <DialogContent><DialogHeader><DialogTitle>Demande de Modification du BL</DialogTitle><DialogDescription>Expliquez pourquoi vous souhaitez modifier ce BL.</DialogDescription></DialogHeader><div className="space-y-2 py-2"><Label htmlFor="editReasonBl">Raison :</Label><Textarea id="editReasonBl" placeholder="Ex: Correction..." value={editRequestReason} onChange={(e) => setEditRequestReason(e.target.value)} className="min-h-[100px]" disabled={isProcessingRequest}/></div><DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={isProcessingRequest} onClick={() => {setEditRequestReason(''); setShowEditRequestDialog(false);}}>Annuler</Button></DialogClose><Button type="button" onClick={handleSubmitEditRequest} disabled={isProcessingRequest || !editRequestReason.trim()}>{isProcessingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Soumettre</Button></DialogFooter></DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteBlDialog} onOpenChange={(isOpen) => { if (!isOpen) setDeleteBlReason(''); setShowDeleteBlDialog(isOpen); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{isAdmin ? "Supprimer ce BL ?" : "Demande de Suppression de BL"}</AlertDialogTitle>{isAdmin ? (<AlertDialogDescription>Action irréversible. Supprimera BL N° {bl.blNumber} et ses dépenses.</AlertDialogDescription>) : (<div className="space-y-2 py-2 text-left"><Label htmlFor="deleteBlReason">Raison :</Label><Textarea id="deleteBlReason" placeholder="Pourquoi supprimer..." value={deleteBlReason} onChange={(e) => setDeleteBlReason(e.target.value)} className="min-h-[100px]" disabled={isProcessingRequest}/><p className="text-xs text-muted-foreground">Demande examinée par admin.</p></div>)}</AlertDialogHeader><AlertDialogFooter><DialogClose asChild><Button variant="outline" disabled={(isDeleting && isAdmin) || (isProcessingRequest && !isAdmin)} onClick={() => {setDeleteBlReason(''); setShowDeleteBlDialog(false);}}>Annuler</Button></DialogClose><Button onClick={isAdmin ? handleDeleteBLDirectly : handleSubmitDeleteBlRequest} variant={isAdmin ? "destructive" : "default"} disabled={(isDeleting && isAdmin) || (isProcessingRequest && !isAdmin) || (!isAdmin && !deleteBlReason.trim())}>{((isDeleting && isAdmin) || (isProcessingRequest && !isAdmin)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isAdmin ? "Confirmer Suppression" : "Soumettre Demande"}</Button></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

       <Dialog open={showEditExpenseDialog} onOpenChange={(open) => { if (!open) { setEditingExpense(null); if (pinEntityType === 'expense' && pinActionType === 'edit') setPinTargetEntityId(null); } setShowEditExpenseDialog(open); }}>
        <DialogContent className="sm:max-w-[480px]"><DialogHeader><DialogTitle>Modifier Dépense: {editingExpense?.label || "Dépense"}</DialogTitle><DialogDescription>Mettez à jour cette dépense.</DialogDescription></DialogHeader>{editingExpense && bl && (<ExpenseForm initialData={editingExpense} blId={bl.id} onExpenseAddedOrUpdated={handleExpenseAddedOrUpdated} setDialogOpen={setShowEditExpenseDialog} />)}</DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteExpenseDialog} onOpenChange={(isOpen) => { if (!isOpen) { setRequestingDeleteExpense(null); setDeleteExpenseReason(''); if (pinEntityType === 'expense' && pinActionType === 'delete') setPinTargetEntityId(null); } setShowDeleteExpenseDialog(isOpen); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{isAdmin ? "Supprimer cette dépense ?" : `Demande de Suppression: ${requestingDeleteExpense?.label || "Dépense sélectionnée"}`}</AlertDialogTitle>{isAdmin && requestingDeleteExpense ? (<AlertDialogDescription>Action irréversible pour "{requestingDeleteExpense.label}" ({requestingDeleteExpense.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}).</AlertDialogDescription>) : requestingDeleteExpense && (<div className="space-y-2 py-2 text-left"><p className="text-sm text-muted-foreground">Montant : {requestingDeleteExpense.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</p><Label htmlFor={`deleteExpenseReason-${requestingDeleteExpense.id}`}>Raison :</Label><Textarea id={`deleteExpenseReason-${requestingDeleteExpense.id}`} placeholder="Pourquoi supprimer..." value={deleteExpenseReason} onChange={(e) => setDeleteExpenseReason(e.target.value)} className="min-h-[100px]" disabled={isProcessingRequest}/><p className="text-xs text-muted-foreground">Demande examinée par admin.</p></div>)}</AlertDialogHeader><AlertDialogFooter><DialogClose asChild><Button variant="outline" disabled={isProcessingRequest || (isDeleting && isAdmin)} onClick={() => { setShowDeleteExpenseDialog(false); setRequestingDeleteExpense(null); setDeleteExpenseReason(''); if (pinEntityType === 'expense' && pinActionType === 'delete') setPinTargetEntityId(null);}}>Annuler</Button></DialogClose><Button onClick={isAdmin && requestingDeleteExpense ? () => handleDeleteExpenseDirectly(requestingDeleteExpense.id) : handleSubmitDeleteExpenseRequest} variant={isAdmin ? "destructive" : "default"} disabled={isProcessingRequest || (isDeleting && isAdmin) || (!isAdmin && !deleteExpenseReason.trim())}>{(isProcessingRequest || (isDeleting && isAdmin)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isAdmin ? "Confirmer" : "Soumettre Demande"}</Button></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>


      <Dialog open={showPinDialog} onOpenChange={(isOpen) => { if (!isOpen) { setPinEntry(''); setActivePinRequest(null); setPinTargetEntityId(null); setPinActionType(null); setPinEntityType(null); } setShowPinDialog(isOpen); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary" /> Saisir le PIN</DialogTitle>
            <DialogDescription>
              Un PIN a été fourni pour {pinActionType === 'edit' ? 'modifier' : 'supprimer'} 
              {pinEntityType === 'bl' && `le BL N° ${bl?.blNumber}`}
              {pinEntityType === 'expense' && `la dépense "${editingExpense?.label || requestingDeleteExpense?.label || "l'élément"}"`}
              {pinEntityType === 'container' && `le conteneur N° "${editingContainer?.containerNumber || requestingDeleteContainer?.containerNumber || "l'élément"}"`}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2"><Label htmlFor="pinCode">Code PIN (6 chiffres)</Label><Input id="pinCode" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pinEntry} onChange={(e) => setPinEntry(e.target.value.replace(/\D/g, '').substring(0,6))} placeholder="123456" disabled={isProcessingRequest}/></div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isProcessingRequest} onClick={() => { if (pinEntityType === 'expense' && pinActionType === 'edit') setEditingExpense(null); if (pinEntityType === 'expense' && pinActionType === 'delete') setRequestingDeleteExpense(null); if (pinEntityType === 'container' && pinActionType === 'edit') setEditingContainer(null); if (pinEntityType === 'container' && pinActionType === 'delete') setRequestingDeleteContainer(null); }}>Annuler</Button></DialogClose>
            <Button onClick={handlePinSubmit} disabled={isProcessingRequest || pinEntry.length !== 6}>{isProcessingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Valider le PIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
