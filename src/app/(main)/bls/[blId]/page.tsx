
"use client"; 

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    MOCK_BILLS_OF_LADING, 
    MOCK_CLIENTS, 
    MOCK_EXPENSES as INITIAL_MOCK_EXPENSES, 
    MOCK_USERS, // Keep for mapping createdByUserId from MOCK_DATA to names
    MOCK_WORK_TYPES,
    deleteBL,
    deleteExpense as deleteGlobalExpense,
    addExpense as addGlobalExpense
} from '@/lib/mock-data';
import type { BillOfLading, Expense, Client, User as MockUser, BLStatus, WorkType } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, PlusCircle, DollarSign, FileText, Package, ShoppingCart, Users as ClientIcon, User as EmployeeIconLucide, Tag, CheckCircle, AlertCircle, Clock, Briefcase, UserCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExpenseForm } from '@/components/expense/expense-form';
import {
  AlertDialog,
  AlertDialogAction,
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
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

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
  const { blId } = React.use(paramsPromise); 
  const { user, isAdmin } = useAuth(); // Use real auth state and isAdmin flag
  const [bl, setBl] = useState<BillOfLading | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [workType, setWorkType] = useState<WorkType | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [createdByUserDisplay, setCreatedByUserDisplay] = useState<string | null>(null); // For display name
  const { toast } = useToast();
  const router = useRouter();

  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [deleteBlReason, setDeleteBlReason] = useState('');
  const [deleteExpenseReason, setDeleteExpenseReason] = useState('');
  const [requestingDeleteExpense, setRequestingDeleteExpense] = useState<Expense | null>(null);


  useEffect(() => {
    if (!blId) return; 
    const foundBl = MOCK_BILLS_OF_LADING.find(b => b.id === blId);
    if (foundBl) {
      setBl(foundBl);
      const foundClient = MOCK_CLIENTS.find(c => c.id === foundBl.clientId);
      setClient(foundClient || null);
      const foundWorkType = MOCK_WORK_TYPES.find(wt => wt.id === foundBl.workTypeId);
      setWorkType(foundWorkType || null);
      const blExpenses = INITIAL_MOCK_EXPENSES.filter(exp => exp.blId === blId);
      setExpenses(blExpenses);
      if (foundBl.createdByUserId) {
        // Try to find in MOCK_USERS first (for older data), then fallback to current auth user's display name if IDs match
        const mockCreator = MOCK_USERS.find(u => u.id === foundBl.createdByUserId);
        if (mockCreator) {
          setCreatedByUserDisplay(mockCreator.name);
        } else if (user && user.uid === foundBl.createdByUserId) {
          setCreatedByUserDisplay(user.displayName || user.email);
        } else {
            setCreatedByUserDisplay("Utilisateur Système"); // Fallback
        }
      }
    }
    setIsMounted(true);
  }, [blId, user]); // Add user to dependencies

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
    addGlobalExpense(newExpense); 
    setExpenses(prevExpenses => [...prevExpenses, newExpense]);
  };

  const handleDeleteExpense = (expenseId: string) => {
    deleteGlobalExpense(expenseId); 
    setExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== expenseId));
    toast({
      title: "Dépense Supprimée",
      description: "La dépense a été supprimée avec succès.",
    });
  };
  
  const handleDeleteBL = () => {
    if (!bl) return;
    deleteBL(bl.id);
    toast({
      title: "BL Supprimé",
      description: `Le BL N° ${bl.blNumber} a été supprimé.`,
    });
    router.push('/bls');
    router.refresh(); 
  };

  const handleSubmitEditRequest = () => {
    if (!editRequestReason.trim()) {
      toast({ title: "Erreur", description: "Veuillez fournir une raison pour la modification.", variant: "destructive" });
      return;
    }
    console.log(`Demande de modification pour BL ${bl?.blNumber} par ${user?.displayName}. Raison: ${editRequestReason}`);
    toast({
      title: "Demande Envoyée (Simulation)",
      description: "Votre demande de modification a été envoyée à l'administrateur pour approbation.",
    });
    setEditRequestReason('');
    setShowEditRequestDialog(false);
  };

  const handleSubmitDeleteBlRequest = () => {
    if (!deleteBlReason.trim()) {
        toast({ title: "Erreur", description: "Veuillez fournir une raison pour la suppression.", variant: "destructive" });
        return;
    }
    console.log(`Demande de suppression pour BL ${bl?.blNumber} par ${user?.displayName}. Raison: ${deleteBlReason}`);
    toast({
        title: "Demande Envoyée (Simulation)",
        description: "Votre demande de suppression de BL a été envoyée à l'administrateur pour approbation.",
    });
    setDeleteBlReason('');
  };

  const handleSubmitDeleteExpenseRequest = () => {
    if (!requestingDeleteExpense) return;
    if (!deleteExpenseReason.trim()) {
        toast({ title: "Erreur", description: "Veuillez fournir une raison pour la suppression de la dépense.", variant: "destructive" });
        return;
    }
    console.log(`Demande de suppression pour la dépense "${requestingDeleteExpense.label}" (BL ${bl?.blNumber}) par ${user?.displayName}. Raison: ${deleteExpenseReason}`);
    toast({
        title: "Demande Envoyée (Simulation)",
        description: `Votre demande de suppression pour la dépense "${requestingDeleteExpense.label}" a été envoyée.`,
    });
    setDeleteExpenseReason('');
    setRequestingDeleteExpense(null);
  };

  // Function to get employee name (can try MOCK_USERS or use current user's display name if it's them)
  const getEmployeeName = (employeeId: string) => {
    const mockEmployee = MOCK_USERS.find(u => u.id === employeeId);
    if (mockEmployee) return mockEmployee.name;
    if (user && user.uid === employeeId) return user.displayName || user.email;
    return 'Inconnu';
  };


  if (!isMounted || !user) { // Ensure user is loaded as well for isAdmin check
    return <div className="flex justify-center items-center h-64"><ArrowLeft className="animate-spin h-8 w-8 text-primary" /> Chargement...</div>;
  }
  
  if (!bl) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Connaissement non trouvé.</p>
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
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" /> Modifier
                </Button>
              </Link>
            ) : (
              <Dialog open={showEditRequestDialog} onOpenChange={setShowEditRequestDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => setEditRequestReason('')}>
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
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                       <Button type="button" variant="outline">Annuler</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSubmitEditRequest}>Soumettre la Demande</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" onClick={() => { if(!isAdmin) setDeleteBlReason(''); }}>
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
                      />
                       <p className="text-xs text-muted-foreground">Votre demande sera examinée par un administrateur.</p>
                    </div>
                  )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteBlReason('')}>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={isAdmin ? handleDeleteBL : handleSubmitDeleteBlRequest}>
                    {isAdmin ? "Confirmer la Suppression" : "Soumettre la Demande"}
                  </AlertDialogAction>
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
                <p className="font-semibold">{format(new Date(bl.createdAt), 'dd MMMM yyyy, HH:mm', { locale: fr })}</p>
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
              {expenses.length > 0 ? (
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
                        <TableCell>{getEmployeeName(exp.employeeId)}</TableCell>
                        <TableCell className="text-right">{exp.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                        <TableCell className="text-right">
                           <AlertDialog open={requestingDeleteExpense?.id === exp.id || undefined} onOpenChange={(open) => {
                                if (!open) {
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
                                    if (!isAdmin) {
                                        setRequestingDeleteExpense(exp);
                                        setDeleteExpenseReason('');
                                    }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
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
                                        />
                                        <p className="text-xs text-muted-foreground">Votre demande sera examinée par un administrateur.</p>
                                    </div>
                                )}
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => { setRequestingDeleteExpense(null); setDeleteExpenseReason('');}}>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={isAdmin ? () => handleDeleteExpense(exp.id) : handleSubmitDeleteExpenseRequest}>
                                  {isAdmin ? "Confirmer" : "Soumettre la Demande"}
                                </AlertDialogAction>
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
