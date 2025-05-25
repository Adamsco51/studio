
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MOCK_BILLS_OF_LADING, MOCK_CLIENTS, MOCK_EXPENSES } from '@/lib/mock-data';
import type { BLStatus } from '@/lib/types';
import { PlusCircle, ArrowRight, CheckCircle, AlertCircle, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const getStatusBadgeStyle = (status: BLStatus, type: 'badge' | 'text' | 'icon') => {
  switch (status) {
    case 'en cours':
      return type === 'badge' ? 'bg-blue-100 text-blue-700 border-blue-300' : 
             type === 'text' ? 'text-blue-700' : 'text-blue-500';
    case 'terminé':
      return type === 'badge' ? 'bg-green-100 text-green-700 border-green-300' :
             type === 'text' ? 'text-green-700' : 'text-green-500';
    case 'inactif':
      return type === 'badge' ? 'bg-gray-100 text-gray-700 border-gray-300' :
             type === 'text' ? 'text-gray-700' : 'text-gray-500';
    default:
      return '';
  }
};

const StatusIcon = ({ status }: { status: BLStatus }) => {
  const iconColor = getStatusBadgeStyle(status, 'icon');
  if (status === 'en cours') return <Clock className={cn("h-4 w-4 mr-1.5", iconColor)} />;
  if (status === 'terminé') return <CheckCircle className={cn("h-4 w-4 mr-1.5", iconColor)} />;
  if (status === 'inactif') return <AlertCircle className={cn("h-4 w-4 mr-1.5", iconColor)} />;
  return null;
};

export default function BillsOfLadingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [bls, setBls] = useState(MOCK_BILLS_OF_LADING);

  useEffect(() => {
    // In a real app, data would be fetched here. For mock, it's already available.
    // This effect can be used if MOCK_BILLS_OF_LADING could change globally by other components
    // and this page needs to reflect that. For simple mock, direct usage is okay.
    setBls(MOCK_BILLS_OF_LADING);
  }, []); // Re-run if MOCK_BILLS_OF_LADING changes, if it were a state from context or prop

  const getClientName = (clientId: string) => {
    return MOCK_CLIENTS.find(c => c.id === clientId)?.name || 'N/A';
  };

  const calculateBlDetails = (blId: string) => {
    const bl = bls.find(b => b.id === blId);
    if (!bl) return { totalExpenses: 0, balance: 0, profitStatus: 'N/A', profit: false };
    
    const expensesForBl = MOCK_EXPENSES.filter(exp => exp.blId === blId);
    const totalExpenses = expensesForBl.reduce((sum, exp) => sum + exp.amount, 0);
    const balance = bl.allocatedAmount - totalExpenses;
    const profitStatus = balance >= 0 ? 'Bénéfice' : 'Perte';
    return { totalExpenses, balance, profitStatus, profit: balance >= 0 };
  };

  const filteredBLs = useMemo(() => {
    if (!searchTerm) return bls;
    return bls.filter(bl =>
      bl.blNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(bl.clientId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      bl.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bls, searchTerm]);

  return (
    <>
      <PageHeader
        title="Gestion des Connaissements (BL)"
        description="Suivez tous les connaissements, leurs dépenses et leur rentabilité."
        actions={
          <Link href="/bls/add" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un BL
            </Button>
          </Link>
        }
      />
      <Card className="shadow-lg mb-6">
        <CardHeader>
          <CardTitle>Filtrer les Connaissements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par N° BL, client, statut..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Connaissements</CardTitle>
          <CardDescription>
            Aperçu de tous les BLs enregistrés, avec leur statut financier et opérationnel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° BL</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date Création</TableHead>
                <TableHead>Statut BL</TableHead>
                <TableHead>Montant Alloué</TableHead>
                <TableHead>Dépenses Totales</TableHead>
                <TableHead>Solde</TableHead>
                <TableHead>Statut Financier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBLs.map((bl) => {
                const { totalExpenses, balance, profitStatus, profit } = calculateBlDetails(bl.id);
                return (
                  <TableRow key={bl.id}>
                    <TableCell className="font-medium">{bl.blNumber}</TableCell>
                    <TableCell>{getClientName(bl.clientId)}</TableCell>
                    <TableCell>{format(new Date(bl.createdAt), 'dd MMM yyyy', { locale: fr })}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("capitalize flex items-center w-fit", getStatusBadgeStyle(bl.status, 'badge'))}>
                        <StatusIcon status={bl.status} />
                        {bl.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{bl.allocatedAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                    <TableCell>{totalExpenses.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                    <TableCell className={profit ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={profit ? 'default' : 'destructive'} className={profit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }>{profitStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/bls/${bl.id}`} passHref>
                        <Button variant="ghost" size="sm">
                          Voir Détails <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
           {filteredBLs.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              {searchTerm ? "Aucun BL ne correspond à votre recherche." : "Aucun BL trouvé."}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
