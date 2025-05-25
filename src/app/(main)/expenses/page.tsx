
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
import { PlusCircle, ArrowRight, CheckCircle, AlertCircle, Clock, Search, Trash2, FileText, User as UserIcon } from 'lucide-react';
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

  useEffect(() => {
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
  }, []);

  const filteredExpenses = useMemo(() => {
    if (!searchTerm) return expenses;
    return expenses.filter(exp =>
      exp.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.blNumber && exp.blNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.clientName && exp.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.employeeName && exp.employeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      exp.amount.toString().includes(searchTerm)
    );
  }, [expenses, searchTerm]);

  const handleDeleteExpense = (expenseId: string) => {
    deleteGlobalExpense(expenseId);
    setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
    toast({
      title: "Dépense Supprimée",
      description: "La dépense a été supprimée avec succès.",
    });
    router.refresh(); // Refresh if other parts of the app depend on MOCK_EXPENSES
  };

  return (
    <>
      <PageHeader
        title="Gestion des Dépenses"
        description="Consultez et gérez toutes les dépenses enregistrées."
        // Add expense button could lead to a modal or a new page where user selects a BL first.
        // For now, adding expenses is primarily from BL detail page.
        // actions={
        //   <Button disabled> {/* Or link to a future /expenses/add page */}
        //     <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Dépense
        //   </Button>
        // }
      />
      <Card className="shadow-lg mb-6">
        <CardHeader>
          <CardTitle>Filtrer les Dépenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par libellé, N° BL, client, employé, montant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Dépenses</CardTitle>
          <CardDescription>
            Aperçu de toutes les dépenses enregistrées, triées par date (plus récentes en premier).
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
                    {exp.blNumber ? (
                      <Link href={`/bls/${exp.blId}`} className="text-primary hover:underline flex items-center gap-1">
                        <FileText className="h-4 w-4" /> {exp.blNumber}
                      </Link>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>{exp.clientName || 'N/A'}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    <UserIcon className="h-4 w-4 text-muted-foreground" /> {exp.employeeName || 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">{exp.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {filteredExpenses.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              {searchTerm ? "Aucune dépense ne correspond à votre recherche." : "Aucune dépense trouvée."}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
