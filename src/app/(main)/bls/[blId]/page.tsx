
"use client"; 

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MOCK_BILLS_OF_LADING, MOCK_CLIENTS, MOCK_EXPENSES as INITIAL_MOCK_EXPENSES, MOCK_USERS } from '@/lib/mock-data';
import type { BillOfLading, Expense, Client, User, BLStatus } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, PlusCircle, DollarSign, FileText, Package, ShoppingCart, Users as ClientIcon, User as EmployeeIcon, Tag, CheckCircle, AlertCircle, Clock } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const getStatusBadgeVariant = (status: BLStatus) => {
  if (status === 'terminé') return 'default'; // Greenish or neutral success
  if (status === 'en cours') return 'secondary'; // Bluish or yellowish for in progress
  if (status === 'inactif') return 'outline'; // Grayish for inactive
  return 'default';
};

const getStatusIcon = (status: BLStatus) => {
  if (status === 'terminé') return <CheckCircle className="mr-1 h-4 w-4 text-green-500" />;
  if (status === 'en cours') return <Clock className="mr-1 h-4 w-4 text-blue-500" />;
  if (status === 'inactif') return <AlertCircle className="mr-1 h-4 w-4 text-gray-500" />;
  return null;
}

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
    setExpenses(prevExpenses => [...prevExpenses, newExpense]);
    // In a real app, MOCK_EXPENSES would be updated globally or via API
    INITIAL_MOCK_EXPENSES.push(newExpense);
  };

  const getEmployeeName = (employeeId: string) => MOCK_USERS.find(u => u.id === employeeId)?.name || 'Inconnu';

  if (!isMounted) {
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
