
"use client"; 

import React, { useState, useEffect, useMemo, use } from 'react';
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
    addApprovalRequestToFirestore // Import new service function
} from '@/lib/mock-data';
import type { BillOfLading, Expense, Client, BLStatus, WorkType, ApprovalRequest } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, PlusCircle, DollarSign, FileText, Package, ShoppingCart, Users as ClientIcon, User as EmployeeIconLucide, Tag, CheckCircle, AlertCircle, Clock, Briefcase, UserCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExpenseForm } from '@/components/expense/expense-form';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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

export default function BLDetailPage({ params: paramsPromise }: { params: Promise<{ blId: string }> }) {
  const { blId } = use(paramsPromise); 
  const { user, isAdmin } = useAuth(); 
  const [bl, setBl] = useState<BillOfLading | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [workType, setWorkType] = useState<WorkType | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
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


  useEffect(() => {
    if (!blId || !user) { 
        setIsLoading(false);
        setIsLoadingExpenses(false);
        return;
    }
    const fetchBlDetails = async () => {
        setIsLoading(true);
        setIsLoadingExpenses(true);
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
                setExpenses(blExpenses);
                setIsLoadingExpenses(false);

                if (foundBl.createdByUserId) {
                    // In a real app, fetch user profile from Firestore
                    setCreatedByUserDisplay(getEmployeeNameFromMock(foundBl.createdByUserId));
                }
            } else {
                toast({ title: "Erreur", description: "Connaissement non trouvé.", variant: "destructive" });
                setIsLoadingExpenses(false);
            }
        } catch (error) {
            console.error("Failed to fetch BL details:", error);
            toast({ title: "Erreur de chargement", description: "Impossible de charger les détails du BL.", variant: "destructive" });
            setIsLoadingExpenses(false);
        } finally {
            setIsLoading(false);
        }
    };
    fetchBlDetails();
  }, [blId, user, toast]); 

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

  const handleExpenseAdded = (newExpense: Expense) => { 
    setExpenses(prevExpenses => [newExpense, ...prevExpenses].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleDeleteExpense = async (expenseId: string) => { 
    if (!isAdmin) return; // This should be handled by UI, but double check
    
    setIsDeleting(true); // Use general deleting flag for admin actions
    try {
      await deleteExpenseFromFirestore(expenseId); 
      setExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== expenseId));
      toast({
        title: "Dépense Supprimée",
        description: "La dépense a été supprimée avec succès.",
      });
      setShowDeleteExpenseDialog(false); 
      setRequestingDeleteExpense(null);
    } catch (error) {
        console.error("Failed to delete expense:", error);
        toast({ title: "Erreur", description: "Échec de la suppression de la dépense.", variant: "destructive"});
    } finally {
        setIsDeleting(false);
    }
  };
  
  const handleDeleteBL = async () => {
    if (!bl || !bl.id || !isAdmin) return;
    setIsDeleting(true);
    try {
        await deleteBLFromFirestore(bl.id);
        toast({
            title: "BL Supprimé",
            description: `Le BL N° ${bl.blNumber} a été supprimé.`,
        });
        router.push('/bls');
        router.refresh(); 
    } catch (error) {
        console.error("Failed to delete BL:", error);
        toast({ title: "Erreur", description: "Échec de la suppression du BL.", variant: "destructive"});
    } finally {
        setIsDeleting(false);
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
        toast({
            title: "Demande Enregistrée",
            description: "Votre demande de modification a été enregistrée et est en attente d'approbation.",
        });
        setEditRequestReason('');
        setShowEditRequestDialog(false);
    } catch (error) {
        console.error("Failed to submit edit request:", error);
        toast({ title: "Erreur", description: "Échec de l'envoi de la demande de modification.", variant: "destructive" });
    } finally {
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
        toast({
            title: "Demande Enregistrée",
            description: "Votre demande de suppression de BL a été enregistrée et est en attente d'approbation.",
        });
        setDeleteBlReason('');
        setShowDeleteBlDialog(false); 
    } catch (error) {
        console.error("Failed to submit delete BL request:", error);
        toast({ title: "Erreur", description: "Échec de l'envoi de la demande de suppression.", variant: "destructive" });
    } finally {
        setIsProcessingRequest(false);
    }
  };

  const handleSubmitDeleteExpenseRequest = async () => {
    if (!requestingDeleteExpense || !deleteExpenseReason.trim() || !user || !bl) {
        toast({ title: "Erreur", description: "Veuillez sélectionner une dépense, fournir une raison et être connecté.", variant: "destructive" });
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
        toast({
            title: "Demande Enregistrée",
            description: `Votre demande de suppression pour la dépense "${requestingDeleteExpense.label}" a été enregistrée.`,
        });
        setDeleteExpenseReason('');
        setShowDeleteExpenseDialog(false);
        setRequestingDeleteExpense(null); 
    } catch (error) {
        console.error("Failed to submit delete expense request:", error);
        toast({ title: "Erreur", description: "Échec de l'envoi de la demande de suppression de dépense.", variant: "destructive" });
    } finally {
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

            {isAdmin ? (
              <Link href={`/bls/${bl.id}/edit`} passHref>
                <Button variant="outline" disabled={isProcessingRequest}>
                  <Edit className="mr-2 h-4 w-4" /> Modifier
                </Button>
              </Link>
            ) : (
              <Dialog open={showEditRequestDialog} onOpenChange={setShowEditRequestDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => setEditRequestReason('')} disabled={isProcessingRequest}>
                    {isProcessingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Edit className="mr-2 h-4 w-4" /> Modifier
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Demande de Modification du BL</DialogTitle>
                    <DialogDescription>
                      Veuillez expliquer pourquoi vous souhaitez modifier ce BL. Votre demande sera examinée par un administrateur.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="editReasonBl">Raison de la demande :</Label>
                    <Textarea
                      id="editReasonBl"
                      placeholder="Ex: Correction du montant alloué, mise à jour de la description..."
                      value={editRequestReason}
                      onChange={(e) => setEditRequestReason(e.target.value)}
                      className="min-h-[100px]"
                      disabled={isProcessingRequest}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                       <Button type="button" variant="outline" disabled={isProcessingRequest}>Annuler</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSubmitEditRequest} disabled={isProcessingRequest || !editRequestReason.trim()}>
                        {isProcessingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Soumettre la Demande
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <AlertDialog open={showDeleteBlDialog} onOpenChange={setShowDeleteBlDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" onClick={() => { if(!isAdmin) setDeleteBlReason(''); setShowDeleteBlDialog(true);}} disabled={isProcessingRequest || isDeleting}>
                   {(isDeleting && isAdmin) || (isProcessingRequest && !isAdmin) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer BL
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isAdmin ? "Êtes-vous sûr de vouloir supprimer ce BL ?" : "Demande de Suppression de BL"}
                  </AlertDialogTitle>
                  {isAdmin ? (
                    <AlertDialogDescription>
                      Cette action est irréversible et supprimera le BL N° {bl.blNumber} ainsi que toutes ses dépenses associées.
                    </AlertDialogDescription>
                  ) : (
                    <div className="space-y-2 py-2 text-left">
                      <Label htmlFor="deleteBlReason">Raison de la demande de suppression :</Label>
                      <Textarea
                        id="deleteBlReason"
                        placeholder="Expliquez pourquoi vous souhaitez supprimer ce BL..."
                        value={deleteBlReason}
                        onChange={(e) => setDeleteBlReason(e.target.value)}
                        className="min-h-[100px]"
                        disabled={isProcessingRequest}
                      />
                       <p className="text-xs text-muted-foreground">Votre demande sera examinée par un administrateur.</p>
                    </div>
                  )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => {setDeleteBlReason(''); setShowDeleteBlDialog(false);}} disabled={(isDeleting && isAdmin) || (isProcessingRequest && !isAdmin)}>Annuler</AlertDialogCancel>
                  <Button onClick={isAdmin ? handleDeleteBL : handleSubmitDeleteBlRequest} variant={isAdmin ? "destructive" : "default"} disabled={(isDeleting && isAdmin) || (isProcessingRequest && !isAdmin) || (!isAdmin && !deleteBlReason.trim())}>
                    {(isDeleting && isAdmin) || (isProcessingRequest && !isAdmin) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isAdmin ? "Confirmer la Suppression" : "Soumettre la Demande"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                    bl.status === 'inactif' && 'bg-gray-100 text-gray-700 border-gray-300'
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
              <div>
                <p className="text-sm text-muted-foreground">N° BL</p>
                <p className="font-semibold">{bl.blNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Montant Alloué</p>
                <p className="font-semibold text-green-600">{bl.allocatedAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date de création</p>
                <p className="font-semibold">{bl.createdAt ? format(new Date(bl.createdAt), 'dd MMMM yyyy, HH:mm', { locale: fr }) : 'N/A'}</p>
              </div>
              {createdByUserDisplay && (
                 <div>
                    <p className="text-sm text-muted-foreground flex items-center"><UserCircle2 className="mr-2 h-4 w-4"/>Créé par</p>
                    <p className="font-semibold">{createdByUserDisplay}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Dépenses Totales</p>
                <p className="font-semibold text-red-600">{totalExpenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Solde Actuel</p>
                <p className={`text-2xl font-bold ${profit ? 'text-green-600' : 'text-red-600'}`}>
                  {balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center"><Briefcase className="mr-2 h-4 w-4"/>Type de Travail</p>
                <p className="font-semibold">{workType?.name || 'N/A'}</p>
              </div>
               <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground flex items-center"><Tag className="mr-2 h-4 w-4"/>Catégories Manuelles</p>
                {bl.categories && bl.categories.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                        {bl.categories.map((cat, idx) => <Badge key={`manual-cat-${idx}`} variant="outline">{cat}</Badge>)}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">Aucune catégorie manuelle définie.</p>
                )}
              </div>
              {bl.description && (
                 <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium bg-secondary/30 p-2 rounded-md text-sm">{bl.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Dépenses Associées</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingExpenses ? (
                 <div className="flex justify-center items-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Chargement des dépenses...</p>
                </div>
              ) : expenses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Libellé</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Employé</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="font-medium">{exp.label}</TableCell>
                        <TableCell>{format(new Date(exp.date), 'dd/MM/yy HH:mm', { locale: fr })}</TableCell>
                        <TableCell>{getEmployeeNameFromMock(exp.employeeId)}</TableCell>
                        <TableCell className="text-right">{exp.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                        <TableCell className="text-right">
                           <AlertDialog open={showDeleteExpenseDialog && requestingDeleteExpense?.id === exp.id} onOpenChange={(open) => {
                                if (!open) { 
                                    setShowDeleteExpenseDialog(false);
                                    setRequestingDeleteExpense(null);
                                    setDeleteExpenseReason('');
                                }
                            }}>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                    setRequestingDeleteExpense(exp); 
                                    setDeleteExpenseReason(''); 
                                    setShowDeleteExpenseDialog(true);
                                }}
                                disabled={(isProcessingRequest && requestingDeleteExpense?.id === exp.id) || isDeleting}
                              >
                                {(isProcessingRequest && requestingDeleteExpense?.id === exp.id) || (isDeleting && isAdmin && requestingDeleteExpense?.id === exp.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {isAdmin ? "Supprimer cette dépense ?" : `Demande de Suppression: ${exp.label}`}
                                </AlertDialogTitle>
                                {isAdmin ? (
                                  <AlertDialogDescription>
                                    L'action de supprimer la dépense "{exp.label}" d'un montant de {exp.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} est irréversible.
                                  </AlertDialogDescription>
                                ) : (
                                    <div className="space-y-2 py-2 text-left">
                                        <p className="text-sm text-muted-foreground">Montant : {exp.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                                        <Label htmlFor={`deleteExpenseReason-${exp.id}`}>Raison de la demande :</Label>
                                        <Textarea
                                            id={`deleteExpenseReason-${exp.id}`}
                                            placeholder="Expliquez pourquoi vous souhaitez supprimer cette dépense..."
                                            value={deleteExpenseReason}
                                            onChange={(e) => setDeleteExpenseReason(e.target.value)}
                                            className="min-h-[100px]"
                                            disabled={isProcessingRequest}
                                        />
                                        <p className="text-xs text-muted-foreground">Votre demande sera examinée par un administrateur.</p>
                                    </div>
                                )}
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => { setShowDeleteExpenseDialog(false); setRequestingDeleteExpense(null); setDeleteExpenseReason('');}} disabled={isProcessingRequest || isDeleting}>Annuler</AlertDialogCancel>
                                <Button 
                                  onClick={isAdmin ? () => handleDeleteExpense(exp.id) : handleSubmitDeleteExpenseRequest} 
                                  variant={isAdmin ? "destructive" : "default"}
                                  disabled={isProcessingRequest || isDeleting || (!isAdmin && !deleteExpenseReason.trim())}
                                >
                                  {(isProcessingRequest || (isDeleting && isAdmin)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  {isAdmin ? "Confirmer" : "Soumettre la Demande"}
                                </Button>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <DollarSign className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-2">Aucune dépense enregistrée pour ce BL.</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
                <ExpenseForm blId={bl.id} onExpenseAdded={handleExpenseAdded} />
            </CardFooter>
          </Card>
        </div>
        
        <div className="lg:col-span-1 space-y-6">
            {client && (
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ClientIcon className="h-5 w-5 text-primary"/> Infos Client</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                        <p className="font-semibold">{client.name}</p>
                        <p className="text-muted-foreground">{client.contactPerson}</p>
                        <p className="text-muted-foreground">{client.email}</p>
                        <p className="text-muted-foreground">{client.phone}</p>
                         <Button variant="link" size="sm" asChild className="p-0 h-auto">
                            <Link href={`/clients/${client.id}`}>Voir fiche client <ArrowLeft className="transform rotate-180 ml-1 h-3 w-3"/></Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-accent"/> Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button className="w-full justify-start" variant="outline" disabled>Générer un rapport (PDF)</Button>
                    <Button className="w-full justify-start" variant="outline" disabled>Exporter pour comptabilité</Button>
                    <Button className="w-full justify-start" variant="outline" disabled>Archiver le BL</Button>
                </CardContent>
            </Card>
        </div>

      </div>
    </>
  );
}
