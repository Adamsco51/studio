
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MOCK_EXPENSES, MOCK_BILLS_OF_LADING, MOCK_CLIENTS, MOCK_USERS, deleteExpense as deleteGlobalExpense } from '@/lib/mock-data';
import type { Expense, BillOfLading, Client, User } from '@/lib/types';
import { PlusCircle, ArrowRight, Search, Trash2, FileText, User as UserIcon, CalendarIcon, FilterX, Eye, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ExpenseWithDetails extends Expense {
  blNumber?: string;
  clientName?: string;
  employeeName?: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  const [allBls, setAllBls] = useState<BillOfLading[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedBlId, setSelectedBlId] = useState<string | undefined>(undefined);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    setAllBls(MOCK_BILLS_OF_LADING);
    setAllClients(MOCK_CLIENTS);

    const detailedExpenses = MOCK_EXPENSES.map(exp => {
      const bl = MOCK_BILLS_OF_LADING.find(b => b.id === exp.blId);
      const client = bl ? MOCK_CLIENTS.find(c => c.id === bl.clientId) : undefined;
      const employee = MOCK_USERS.find(u => u.id === exp.employeeId);
      return {
        ...exp,
        blNumber: bl?.blNumber,
        clientName: client?.name,
        employeeName: employee?.name,
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by most recent
    setExpenses(detailedExpenses);
  }, []); // Re-run if global MOCK data changes in a real app

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
      const clientBlIds = MOCK_BILLS_OF_LADING
        .filter(bl => bl.clientId === selectedClientId)
        .map(bl => bl.id);
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
  }, [expenses, searchTerm, selectedBlId, selectedClientId, selectedDate]);

  const handleDeleteExpense = (expenseId: string) => {
    deleteGlobalExpense(expenseId);
    // Re-calculate detailed expenses after deletion to reflect changes
    const updatedDetailedExpenses = MOCK_EXPENSES.map(exp => {
        const bl = MOCK_BILLS_OF_LADING.find(b => b.id === exp.blId);
        const client = bl ? MOCK_CLIENTS.find(c => c.id === bl.clientId) : undefined;
        const employee = MOCK_USERS.find(u => u.id === exp.employeeId);
        return {
          ...exp,
          blNumber: bl?.blNumber,
          clientName: client?.name,
          employeeName: employee?.name,
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setExpenses(updatedDetailedExpenses);
    toast({
      title: "Dépense Supprimée",
      description: "La dépense a été supprimée avec succès.",
    });
    // router.refresh(); // Not strictly needed if local state updates correctly
  };

  return (
    <>
      <PageHeader
        title="Gestion des Dépenses"
        description="Consultez et gérez toutes les dépenses enregistrées."
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
                />
              </div>
            </div>

            <div>
              <label htmlFor="bl-filter" className="block text-sm font-medium text-muted-foreground mb-1">Par N° BL</label>
              <Select value={selectedBlId} onValueChange={(value) => setSelectedBlId(value === "all" ? undefined : value)}>
                <SelectTrigger id="bl-filter">
                  <SelectValue placeholder="Tous les BLs" />
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
              <Select value={selectedClientId} onValueChange={(value) => setSelectedClientId(value === "all" ? undefined : value)}>
                <SelectTrigger id="client-filter">
                  <SelectValue placeholder="Tous les Clients" />
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

            <Button onClick={handleResetFilters} variant="outline" className="w-full md:w-auto">
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
            Nombre de dépenses affichées: {filteredExpenses.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableCell className="flex items-center gap-1 pt-4"> {/* Adjusted padding for alignment */}
                    <UserIcon className="h-4 w-4 text-muted-foreground" /> {exp.employeeName || 'N/A'}
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
                      <Button variant="ghost" size="sm" title="Modifier Dépense" disabled> {/* Edit expense form not yet implemented */}
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" title="Supprimer Dépense">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              L'action de supprimer la dépense "{exp.label}" d'un montant de {exp.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteExpense(exp.id)}>Confirmer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {filteredExpenses.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              {searchTerm || selectedBlId || selectedClientId || selectedDate ? "Aucune dépense ne correspond à vos filtres." : "Aucune dépense trouvée."}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
