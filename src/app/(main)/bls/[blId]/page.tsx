"use client"; // Top-level client component due to useState for expenses

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MOCK_BILLS_OF_LADING, MOCK_CLIENTS, MOCK_EXPENSES as INITIAL_MOCK_EXPENSES, MOCK_USERS } from '@/lib/mock-data';
import type { BillOfLading, Expense, Client, User } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, PlusCircle, DollarSign, FileText, Package, ShoppingCart, Users as ClientIcon, User as EmployeeIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExpenseForm } from '@/components/expense/expense-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Input } from '@/components/ui/input';

export default function BLDetailPage({ params }: { params: { blId: string } }) {
  const [bl, setBl] = useState<BillOfLading | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const foundBl = MOCK_BILLS_OF_LADING.find(b => b.id === params.blId);
    if (foundBl) {
      setBl(foundBl);
      const foundClient = MOCK_CLIENTS.find(c => c.id === foundBl.clientId);
      setClient(foundClient || null);
      const blExpenses = INITIAL_MOCK_EXPENSES.filter(exp => exp.blId === params.blId);
      setExpenses(blExpenses);
    }
    setIsMounted(true);
  }, [params.blId]);

  const { totalExpenses, balance, status, profit } = useMemo(() => {
    if (!bl) return { totalExpenses: 0, balance: 0, status: 'N/A', profit: false };
    const currentTotalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const currentBalance = bl.allocatedAmount - currentTotalExpenses;
    return {
      totalExpenses: currentTotalExpenses,
      balance: currentBalance,
      status: currentBalance >= 0 ? 'Bénéfice' : 'Perte',
      profit: currentBalance >= 0,
    };
  }, [bl, expenses]);

  const handleExpenseAdded = (newExpense: Expense) => {
    setExpenses(prevExpenses => [...prevExpenses, newExpense]);
  };

  const getEmployeeName = (employeeId: string) => MOCK_USERS.find(u => u.id === employeeId)?.name || 'Inconnu';

  if (!isMounted) {
    // To avoid hydration mismatch for dynamic data
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
          <>
            <Link href="/bls" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
            </Link>
            <Button variant="outline" disabled> {/* Admin only */}
              <Edit className="mr-2 h-4 w-4" /> Modifier
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Informations du BL</span>
                <Badge variant={profit ? 'default' : 'destructive'} className={`${profit ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                  {status}
                </Badge>
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
                <p className="text-sm text-muted-foreground">Date de création</p>
                <p className="font-semibold">{format(new Date(bl.createdAt), 'dd MMMM yyyy, HH:mm', { locale: fr })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Montant Alloué</p>
                <p className="font-semibold text-green-600">{bl.allocatedAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
              </div>
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
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Types de Service</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {bl.serviceTypes.map(st => <Badge key={st} variant="secondary">{st}</Badge>)}
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Description (pour IA)</p>
                <p className="font-medium bg-secondary/30 p-2 rounded-md text-sm">{bl.description}</p>
              </div>
              {(bl.aiSuggestedCategories && bl.aiSuggestedCategories.length > 0) && (
                 <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Catégories suggérées par IA</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {bl.aiSuggestedCategories.map((cat, idx) => <Badge key={`ai-cat-${idx}`} variant="outline">{cat}</Badge>)}
                        {bl.aiSuggestedSubCategories?.map((subcat, idx) => <Badge key={`ai-subcat-${idx}`} variant="outline" className="opacity-70">{subcat}</Badge>)}
                    </div>
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
                      <TableHead className="text-right">Actions</TableHead> {/* Admin only */}
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Demande de Suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Veuillez fournir une raison pour la suppression de cette dépense. Cette action nécessite l'approbation d'un administrateur.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <Input type="text" placeholder="Raison de la suppression..." className="my-2"/>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction>Soumettre la Demande</AlertDialogAction>
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
