
"use client";

import React, { useState, useEffect, useMemo, use, useCallback } from 'react'; 
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    getExpensesFromFirestore,
    getBLsFromFirestore,
    getClientsFromFirestore,
    deleteExpenseFromFirestore,
    getEmployeeNameFromMock,
    addApprovalRequestToFirestore,
    getPinIssuedRequestForEntity,
    completeApprovalRequestWithPin,
    getExpenseByIdFromFirestore, 
} from '@/lib/mock-data';
import type { Expense, BillOfLading, Client, ApprovalRequest } from '@/lib/types';
import { PlusCircle, Search, Trash2, FileText, User as UserIconLucide, CalendarIcon as CalendarIconLucide, FilterX, Eye, Edit, Loader2, KeyRound, DollarSign } from 'lucide-react'; 
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  DialogTrigger, 
  DialogClose,
} from "@/components/ui/dialog";
import { ExpenseForm } from '@/components/expense/expense-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

interface ExpenseWithDetails extends Expense {
  blNumber?: string;
  clientName?: string;
  employeeName?: string;
}

export default function ExpensesPage() {
  const { user, isAdmin } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  const [allBls, setAllBls] = useState<BillOfLading[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [selectedBlId, setSelectedBlId] = useState<string | undefined>(undefined);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const [expenseTargetedForAction, setExpenseTargetedForAction] = useState<ExpenseWithDetails | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [showEditExpenseDialog, setShowEditExpenseDialog] = useState(false); 
  const [showReasonDialog, setShowReasonDialog] = useState(false);

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [activePinRequest, setActivePinRequest] = useState<ApprovalRequest | null>(null);
  const [pinActionType, setPinActionType] = useState<'edit' | 'delete' | null>(null);


  const fetchData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [fetchedExpenses, fetchedBls, fetchedClients] = await Promise.all([
            getExpensesFromFirestore(),
            getBLsFromFirestore(),
            getClientsFromFirestore(),
        ]);
        setAllBls(fetchedBls);
        setAllClients(fetchedClients);

        const detailedExpenses = fetchedExpenses.map(exp => {
            const bl = fetchedBls.find(b => b.id === exp.blId);
            const client = bl ? fetchedClients.find(c => c.id === bl.clientId) : undefined;
            return {
                ...exp,
                blNumber: bl?.blNumber,
                clientName: client?.name,
                employeeName: getEmployeeNameFromMock(exp.employeeId),
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setExpenses(detailedExpenses);

    } catch (error) {
        console.error("Failed to fetch data for expenses page:", error);
        toast({ title: "Erreur de chargement", description: "Impossible de charger les données de base.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]); 

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedBlId(undefined);
    setSelectedClientId(undefined);
    setSelectedDate(undefined);
  };

  const filteredExpenses = useMemo(() => {
    let tempExpenses = expenses;

    if (selectedBlId) {
      tempExpenses = tempExpenses.filter(exp => exp.blId === selectedBlId);
    }

    if (selectedClientId) {
      const clientBls = allBls.filter(bl => bl.clientId === selectedClientId);
      const clientBlIds = clientBls.map(bl => bl.id);
      tempExpenses = tempExpenses.filter(exp => exp.blId && clientBlIds.includes(exp.blId));
    }

    if (selectedDate) {
      tempExpenses = tempExpenses.filter(exp => {
        if (!exp.date) return false;
        const expenseDate = parseISO(exp.date);
        return expenseDate.getFullYear() === selectedDate.getFullYear() &&
               expenseDate.getMonth() === selectedDate.getMonth() &&
               expenseDate.getDate() === selectedDate.getDate();
      });
    }

    if (!searchTerm) return tempExpenses;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return tempExpenses.filter(exp =>
      exp.label.toLowerCase().includes(lowerSearchTerm) ||
      (exp.blNumber && exp.blNumber.toLowerCase().includes(lowerSearchTerm)) ||
      (exp.clientName && exp.clientName.toLowerCase().includes(lowerSearchTerm)) ||
      (exp.employeeName && exp.employeeName.toLowerCase().includes(lowerSearchTerm)) ||
      exp.amount.toString().includes(lowerSearchTerm),
    );
  }, [expenses, searchTerm, selectedBlId, selectedClientId, selectedDate, allBls]);

  const handleDeleteExpenseAction = async (expense: ExpenseWithDetails) => {
    if (!user) return;
    setExpenseTargetedForAction(expense);
    setPinActionType('delete');

    if (isAdmin) {
      setShowReasonDialog(true);
    } else {
      setIsProcessingAction(true);
      try {
        const pinRequest = await getPinIssuedRequestForEntity('expense', expense.id, 'delete');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setShowPinDialog(true);
        } else {
          setDeleteReason('');
          setShowReasonDialog(true);
        }
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive" });
      } finally {
        setIsProcessingAction(false);
      }
    }
  };

  const handleEditExpenseAction = async (expense: ExpenseWithDetails) => {
    if (!user) return;
    setExpenseTargetedForAction(expense); 
    setPinActionType('edit');

    if (isAdmin) {
      setShowEditExpenseDialog(true); 
    } else {
       setIsProcessingAction(true);
       try {
        const pinRequest = await getPinIssuedRequestForEntity('expense', expense.id, 'edit');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setShowPinDialog(true); 
        } else {
          toast({ title: "Action Requise", description: "Veuillez demander une approbation avec PIN à un administrateur pour modifier cette dépense.", variant: "default", duration: 5000 });
          setExpenseTargetedForAction(null);
        }
       } catch (error) {
         toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants pour la modification.", variant: "destructive" });
       } finally {
         setIsProcessingAction(false);
       }
    }
  };


  const handlePinSubmit = async () => {
    if (!pinEntry.trim() || !activePinRequest || !expenseTargetedForAction || !pinActionType) {
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
        setExpenseTargetedForAction(null);
        return;
    }

    setIsProcessingAction(true);
    try {
      if (pinActionType === 'delete') {
        await deleteExpenseFromFirestore(expenseTargetedForAction.id);
        await completeApprovalRequestWithPin(activePinRequest.id);
        setExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== expenseTargetedForAction!.id));
        toast({ title: "Dépense Supprimée", description: `La dépense "${expenseTargetedForAction.label}" a été supprimée via PIN.` });
      } else if (pinActionType === 'edit') {
        await completeApprovalRequestWithPin(activePinRequest.id);
        toast({ title: "PIN Validé", description: "Vous pouvez maintenant modifier la dépense." });
        setShowEditExpenseDialog(true); 
      }
      setShowPinDialog(false);
      setPinEntry('');
      setActivePinRequest(null);
      if (pinActionType === 'delete') setExpenseTargetedForAction(null); 
    } catch (error) {
        console.error(`Erreur lors de l'action ${pinActionType} avec PIN:`, error);
        toast({ title: "Erreur", description: `Échec de l'action ${pinActionType} avec PIN.`, variant: "destructive" });
    } finally {
        setIsProcessingAction(false);
    }
  };


  const handleDeleteExpenseDirectly = async () => {
    if (!expenseTargetedForAction || !isAdmin) return;
    setIsProcessingAction(true);
    try {
      await deleteExpenseFromFirestore(expenseTargetedForAction.id);
      setExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== expenseTargetedForAction!.id));
      toast({
        title: "Dépense Supprimée",
        description: "La dépense a été supprimée avec succès.",
      });
    } catch (error) {
        console.error("Failed to delete expense:", error);
        toast({ title: "Erreur", description: "Échec de la suppression de la dépense.", variant: "destructive" });
    } finally {
        setExpenseTargetedForAction(null);
        setShowReasonDialog(false);
        setIsProcessingAction(false);
    }
  };

  const handleSubmitDeleteRequest = async () => {
    if (!expenseTargetedForAction || !deleteReason.trim() || !user) {
        toast({ title: "Erreur", description: "Veuillez fournir une raison et être connecté.", variant: "destructive" });
        return;
    }
    setIsProcessingAction(true);
    try {
        await addApprovalRequestToFirestore({
            requestedByUserId: user.uid,
            requestedByUserName: user.displayName || user.email || "Utilisateur inconnu",
            entityType: 'expense',
            entityId: expenseTargetedForAction.id,
            entityDescription: `Dépense: ${expenseTargetedForAction.label} (BL N° ${expenseTargetedForAction.blNumber || 'N/A'})`,
            actionType: 'delete',
            reason: deleteReason,
        });
        toast({
            title: "Demande Enregistrée",
            description: `Votre demande de suppression pour la dépense "${expenseTargetedForAction.label}" a été enregistrée.`,
        });
    } catch (error) {
        console.error("Failed to submit delete expense request:", error);
        toast({ title: "Erreur", description: "Échec de l'envoi de la demande de suppression.", variant: "destructive" });
    } finally {
        setDeleteReason('');
        setExpenseTargetedForAction(null);
        setShowReasonDialog(false);
        setIsProcessingAction(false);
    }
  };

  const handleExpenseAddedOrUpdatedFromDialog = (savedExpense: Expense) => {
    const bl = allBls.find(b => b.id === savedExpense.blId);
    const client = bl ? allClients.find(c => c.id === bl.clientId) : undefined;
    const detailedSavedExpense: ExpenseWithDetails = {
        ...savedExpense,
        blNumber: bl?.blNumber,
        clientName: client?.name,
        employeeName: getEmployeeNameFromMock(savedExpense.employeeId),
    };

    if (expenses.find(exp => exp.id === savedExpense.id)) { 
        setExpenses(prevExpenses => prevExpenses.map(exp => exp.id === savedExpense.id ? detailedSavedExpense : exp)
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } else { 
        setExpenses(prevExpenses => [detailedSavedExpense, ...prevExpenses]
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }

    if (showAddExpenseDialog) setShowAddExpenseDialog(false);
    if (showEditExpenseDialog) setShowEditExpenseDialog(false);
    setExpenseTargetedForAction(null);
  };


  if (!user && !isLoading) {
    return <div className="flex justify-center items-center h-64">Veuillez vous connecter pour voir cette page.</div>;
  }

  return (
    <>
      <PageHeader
        title="Gestion des Dépenses"
        description="Consultez et gérez toutes les dépenses enregistrées."
        actions={
          <Dialog open={showAddExpenseDialog} onOpenChange={setShowAddExpenseDialog}>
            <DialogTrigger asChild>
              <Button disabled={isProcessingAction}>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Dépense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Ajouter une Nouvelle Dépense</DialogTitle>
                <DialogDescription>
                  Remplissez les informations ci-dessous pour enregistrer une nouvelle dépense.
                </DialogDescription>
              </DialogHeader>
              <ExpenseForm
                onExpenseAddedOrUpdated={handleExpenseAddedOrUpdatedFromDialog}
                availableBls={allBls}
                setDialogOpen={setShowAddExpenseDialog}
              />
            </DialogContent>
          </Dialog>
        }
      />
      <Card className="shadow-lg mb-6">
        <CardHeader>
          <CardTitle>Filtrer les Dépenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
            <div className="lg:col-span-2 xl:col-span-1">
              <label htmlFor="search-term" className="block text-sm font-medium text-muted-foreground mb-1">Recherche générale</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-term"
                  placeholder="Libellé, N° BL, employé..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="bl-filter" className="block text-sm font-medium text-muted-foreground mb-1">Par N° BL</label>
              <Select value={selectedBlId} onValueChange={(value) => setSelectedBlId(value === "all" ? undefined : value)} disabled={isLoading || allBls.length === 0}>
                <SelectTrigger id="bl-filter">
                  <SelectValue placeholder={allBls.length === 0 && !isLoading ? "Aucun BL" : "Tous les BLs"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les BLs</SelectItem>
                  {allBls.map(bl => (
                    <SelectItem key={bl.id} value={bl.id}>{bl.blNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="client-filter" className="block text-sm font-medium text-muted-foreground mb-1">Par Client</label>
              <Select value={selectedClientId} onValueChange={(value) => setSelectedClientId(value === "all" ? undefined : value)} disabled={isLoading || allClients.length === 0}>
                <SelectTrigger id="client-filter">
                  <SelectValue placeholder={allClients.length === 0 && !isLoading ? "Aucun client" : "Tous les Clients"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les Clients</SelectItem>
                  {allClients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="date-filter" className="block text-sm font-medium text-muted-foreground mb-1">Par Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-filter"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground",
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIconLucide className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleResetFilters} variant="outline" className="w-full md:w-auto xl:mt-[22px]" disabled={isLoading}>
              <FilterX className="mr-2 h-4 w-4" /> Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Dépenses</CardTitle>
          <CardDescription>
            Aperçu de toutes les dépenses enregistrées, triées par date (plus récentes en premier).
            Affichage: {isLoading ? "..." : filteredExpenses.length} dépense(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
         {isLoading ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Chargement des données...</p>
            </div>
         ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
                <DollarSign className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">
                {searchTerm || selectedBlId || selectedClientId || selectedDate 
                    ? "Aucune dépense ne correspond à vos filtres." 
                    : "Aucune dépense n'a été trouvée. Commencez par en ajouter une !"
                }
                </p>
                 {(!searchTerm && !selectedBlId && !selectedClientId && !selectedDate) && (
                    <Button asChild className="mt-4" onClick={() => setShowAddExpenseDialog(true)}>
                        <span><PlusCircle className="mr-2 h-4 w-4" />Ajouter une Dépense</span>
                    </Button>
                )}
            </div>
         ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Libellé</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>N° BL</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Employé</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">{exp.label}</TableCell>
                  <TableCell>{exp.date ? format(parseISO(exp.date), 'dd MMM yyyy, HH:mm', { locale: fr }) : 'N/A'}</TableCell>
                  <TableCell>
                    {exp.blNumber && exp.blId ? (
                      <Link href={`/bls/${exp.blId}`} className="text-primary hover:underline flex items-center gap-1">
                        <FileText className="h-4 w-4" /> {exp.blNumber}
                      </Link>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>{exp.clientName || 'N/A'}</TableCell>
                  <TableCell className="flex items-center gap-1 pt-4">
                    <UserIconLucide className="h-4 w-4 text-muted-foreground" /> {exp.employeeName || 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">{exp.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {exp.blId && (
                        <Link href={`/bls/${exp.blId}`} passHref>
                          <Button variant="ghost" size="sm" title="Voir BL" disabled={isProcessingAction}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Button variant="ghost" size="sm" title="Modifier Dépense" onClick={() => handleEditExpenseAction(exp)} 
                        disabled={isProcessingAction && pinActionType === 'edit' && expenseTargetedForAction?.id === exp.id}>
                        {(isProcessingAction && pinActionType === 'edit' && expenseTargetedForAction?.id === exp.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Edit className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        title="Supprimer Dépense"
                        onClick={() => handleDeleteExpenseAction(exp)}
                        disabled={isProcessingAction && pinActionType === 'delete' && expenseTargetedForAction?.id === exp.id}
                      >
                        {(isProcessingAction && pinActionType === 'delete' && expenseTargetedForAction?.id === exp.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
         )}
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={showEditExpenseDialog} onOpenChange={(open) => {
        if (!open) {
            setExpenseTargetedForAction(null);
            if (pinActionType === 'edit') setActivePinRequest(null); // Reset pin request if it was for this edit
        }
        setShowEditExpenseDialog(open);
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Modifier Dépense: {expenseTargetedForAction?.label || "Dépense sélectionnée"}</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de cette dépense.
            </DialogDescription>
          </DialogHeader>
          {expenseTargetedForAction && (
            <ExpenseForm
              initialData={expenseTargetedForAction}
              onExpenseAddedOrUpdated={handleExpenseAddedOrUpdatedFromDialog}
              availableBls={allBls} 
              setDialogOpen={setShowEditExpenseDialog}
            />
          )}
        </DialogContent>
      </Dialog>


      {/* Reason/Confirmation Dialog for Delete */}
      <AlertDialog open={showReasonDialog} onOpenChange={(isOpen) => {
          if(!isOpen) {
            setExpenseTargetedForAction(null);
            setDeleteReason('');
            if (pinActionType === 'delete') setActivePinRequest(null);
          }
          setShowReasonDialog(isOpen);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
                {isAdmin ? `Supprimer Dépense: "${expenseTargetedForAction?.label || "Dépense sélectionnée"}"?` : `Demande de Suppression: ${expenseTargetedForAction?.label || "Dépense sélectionnée"}`}
            </AlertDialogTitle>
            {isAdmin ? (
                <AlertDialogDescription>
                L'action de supprimer la dépense "{expenseTargetedForAction?.label}" d'un montant de {expenseTargetedForAction?.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })} est irréversible.
                </AlertDialogDescription>
            ) : (
                <div className="space-y-2 py-2 text-left">
                    <p className="text-sm text-muted-foreground">Montant : {expenseTargetedForAction?.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</p>
                    <Label htmlFor={`deleteExpenseReason-${expenseTargetedForAction?.id}`}>Raison de la demande :</Label>
                    <Textarea
                        id={`deleteExpenseReason-${expenseTargetedForAction?.id}`}
                        placeholder="Expliquez pourquoi vous souhaitez supprimer cette dépense..."
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        className="min-h-[100px]"
                        disabled={isProcessingAction}
                    />
                    <p className="text-xs text-muted-foreground">Votre demande sera examinée par un administrateur.</p>
                </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <DialogClose asChild>
                <Button variant="outline" disabled={isProcessingAction} onClick={() => {setExpenseTargetedForAction(null); setDeleteReason(''); setShowReasonDialog(false); if (pinActionType === 'delete') setActivePinRequest(null);}}>Annuler</Button>
            </DialogClose>
            <Button
                onClick={isAdmin ? handleDeleteExpenseDirectly : handleSubmitDeleteRequest}
                variant={isAdmin ? "destructive" : "default"}
                disabled={isProcessingAction || (!isAdmin && !deleteReason.trim())}
            >
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAdmin ? "Confirmer" : "Soumettre la Demande"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Entry Dialog */}
      <Dialog open={showPinDialog} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setPinEntry('');
          setActivePinRequest(null);
          setExpenseTargetedForAction(null); 
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
              Un PIN vous a été fourni par un administrateur pour {pinActionType === 'edit' ? 'modifier' : 'supprimer'} la dépense "{expenseTargetedForAction?.label || "Dépense sélectionnée"}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="pinCodeExpense">Code PIN (6 chiffres)</Label>
            <Input
              id="pinCodeExpense"
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
                <Button variant="outline" disabled={isProcessingAction} onClick={() => {setExpenseTargetedForAction(null); setPinEntry(''); setActivePinRequest(null); setPinActionType(null); }}>Annuler</Button>
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

    