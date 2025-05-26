
"use client";

import { useState, useEffect, useMemo, use } from 'react';
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
    getEmployeeNameFromMock
} from '@/lib/mock-data';
import type { Expense, BillOfLading, Client } from '@/lib/types';
import { PlusCircle, ArrowRight, Search, Trash2, FileText, User as UserIconLucide, CalendarIcon, FilterX, Eye, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
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
import { ExpenseForm } from '@/components/expense/expense-form'; // Import ExpenseForm
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

export default function ExpensesPage({ params: paramsPromise }: { params: Promise<{}> }) {
  const params = use(paramsPromise);
  const { user, isAdmin } = useAuth(); 
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  const [allBls, setAllBls] = useState<BillOfLading[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [selectedBlId, setSelectedBlId] = useState<string | undefined>(undefined);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const [deletingExpense, setDeletingExpense] = useState<ExpenseWithDetails | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [fetchedExpenses, fetchedBls, fetchedClients] = await Promise.all([
                getExpensesFromFirestore(),
                getBLsFromFirestore(),
                getClientsFromFirestore()
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
            toast({title: "Erreur de chargement", description: "Impossible de charger les données de base.", variant: "destructive"});
        } finally {
            setIsLoading(false);
        }
    };
    if (user) { 
        fetchData();
    }
  }, [user, toast]); 

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
        const expenseDate = new Date(exp.date);
        return expenseDate.getFullYear() === selectedDate.getFullYear() &&
               expenseDate.getMonth() === selectedDate.getMonth() &&
               expenseDate.getDate() === selectedDate.getDate();
      });
    }

    if (!searchTerm) return tempExpenses;

    return tempExpenses.filter(exp =>
      exp.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.blNumber && exp.blNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.clientName && exp.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.employeeName && exp.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      exp.amount.toString().includes(searchTerm)
    );
  }, [expenses, searchTerm, selectedBlId, selectedClientId, selectedDate, allBls]);

  const handleDeleteExpenseDirectly = async (expenseId: string) => {
    setIsDeletingExpense(true);
    try {
      await deleteExpenseFromFirestore(expenseId);
      setExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== expenseId));
      toast({
        title: "Dépense Supprimée",
        description: "La dépense a été supprimée avec succès.",
      });
      setDeletingExpense(null);
    } catch (error) {
        console.error("Failed to delete expense:", error);
        toast({ title: "Erreur", description: "Échec de la suppression de la dépense.", variant: "destructive"});
    } finally {
        setIsDeletingExpense(false);
    }
  };

  const handleSubmitDeleteRequest = () => {
    if (!deletingExpense || !deleteReason.trim()) {
        toast({ title: "Erreur", description: "Veuillez fournir une raison pour la suppression de la dépense.", variant: "destructive" });
        return;
    }
    console.log(`Demande de suppression pour la dépense "${deletingExpense.label}" (BL ${deletingExpense.blNumber}) par ${user?.displayName}. Raison: ${deleteReason}`);
    toast({
        title: "Demande Envoyée (Simulation)",
        description: `Votre demande de suppression pour la dépense "${deletingExpense.label}" a été envoyée.`,
    });
    setDeleteReason('');
    setDeletingExpense(null);
  };

  const handleExpenseAddedFromDialog = (newExpense: Expense) => {
    const bl = allBls.find(b => b.id === newExpense.blId);
    const client = bl ? allClients.find(c => c.id === bl.clientId) : undefined;
    const detailedNewExpense: ExpenseWithDetails = {
        ...newExpense,
        blNumber: bl?.blNumber,
        clientName: client?.name,
        employeeName: getEmployeeNameFromMock(newExpense.employeeId),
    };
    setExpenses(prevExpenses => [detailedNewExpense, ...prevExpenses].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setShowAddExpenseDialog(false); // Close the dialog
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
              <Button>
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
                onExpenseAdded={handleExpenseAddedFromDialog} 
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
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="search-term"
                  placeholder="Libellé, N° BL, employé..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
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
                      !selectedDate && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
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
            Nombre de dépenses affichées: {isLoading ? "Chargement..." : filteredExpenses.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
         {isLoading ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Chargement des données...</p>
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
                  <TableCell>{format(new Date(exp.date), 'dd MMM yyyy, HH:mm', { locale: fr })}</TableCell>
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
                  <TableCell className="text-right">{exp.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {exp.blId && (
                        <Link href={`/bls/${exp.blId}`} passHref>
                          <Button variant="ghost" size="sm" title="Voir BL">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Button variant="ghost" size="sm" title="Modifier Dépense" disabled> 
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog open={deletingExpense?.id === exp.id && !isDeletingExpense} onOpenChange={(isOpen) => {
                          if(!isOpen && !isDeletingExpense) setDeletingExpense(null);
                          setDeleteReason('');
                      }}>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-destructive" 
                            title="Supprimer Dépense"
                            onClick={() => {setDeletingExpense(exp); setDeleteReason('');}}
                            disabled={isDeletingExpense && deletingExpense?.id === exp.id}
                          >
                            {isDeletingExpense && deletingExpense?.id === exp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
                                        value={deleteReason}
                                        onChange={(e) => setDeleteReason(e.target.value)}
                                        className="min-h-[100px]"
                                    />
                                    <p className="text-xs text-muted-foreground">Votre demande sera examinée par un administrateur.</p>
                                </div>
                            )}
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => {setDeletingExpense(null); setDeleteReason('');}} disabled={isDeletingExpense}>Annuler</AlertDialogCancel>
                            <Button 
                                onClick={isAdmin ? () => handleDeleteExpenseDirectly(exp.id) : handleSubmitDeleteRequest}
                                variant={isAdmin ? "destructive" : "default"}
                                disabled={isDeletingExpense}
                            >
                              {isDeletingExpense && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {isAdmin ? "Confirmer" : "Soumettre la Demande"}
                            </Button>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
         )}
           {!isLoading && filteredExpenses.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              {searchTerm || selectedBlId || selectedClientId || selectedDate ? "Aucune dépense ne correspond à vos filtres." : "Aucune dépense trouvée."}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
