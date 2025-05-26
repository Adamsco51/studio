
"use client";

import { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
    getBLsFromFirestore, 
    getClientsFromFirestore, 
    MOCK_EXPENSES, // Expenses are still mock
    MOCK_USERS 
} from '@/lib/mock-data';
import type { BLStatus, BillOfLading, Client, User as AppUser } from '@/lib/types';
import { PlusCircle, ArrowRight, CheckCircle, AlertCircle, Clock, Search, CalendarIcon, FilterX, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

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

export default function BillsOfLadingPage({ params: paramsPromise }: { params: Promise<{}> }) {
  const params = use(paramsPromise); 

  const [searchTerm, setSearchTerm] = useState('');
  const [bls, setBls] = useState<BillOfLading[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<AppUser[]>(MOCK_USERS); // Users are still mock
  const [isLoading, setIsLoading] = useState(true);

  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedBls, fetchedClients] = await Promise.all([
          getBLsFromFirestore(),
          getClientsFromFirestore()
        ]);
        setBls(fetchedBls);
        setClients(fetchedClients);
      } catch (error) {
        console.error("Failed to fetch BLs or Clients:", error);
        // Optionally, show a toast message to the user
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    setUsers(MOCK_USERS); // Users are still mock
  }, []); 

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'N/A';
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'N/A';
    return MOCK_USERS.find(u => u.id === userId)?.name || 'N/A';
  };

  const calculateBlDetails = (blId: string) => {
    const bl = bls.find(b => b.id === blId);
    if (!bl) return { totalExpenses: 0, balance: 0, profitStatus: 'N/A', profit: false };
    
    // Expenses are still from MOCK_EXPENSES for now
    const expensesForBl = MOCK_EXPENSES.filter(exp => exp.blId === blId);
    const totalExpenses = expensesForBl.reduce((sum, exp) => sum + exp.amount, 0);
    const balance = bl.allocatedAmount - totalExpenses;
    const profitStatus = balance >= 0 ? 'Bénéfice' : 'Perte';
    return { totalExpenses, balance, profitStatus, profit: balance >= 0 };
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedClientId(undefined);
    setSelectedUserId(undefined);
    setSelectedDate(undefined);
  };

  const filteredBLs = useMemo(() => {
    let tempBLs = bls;

    if (selectedClientId) {
      tempBLs = tempBLs.filter(bl => bl.clientId === selectedClientId);
    }

    if (selectedUserId) {
      tempBLs = tempBLs.filter(bl => bl.createdByUserId === selectedUserId);
    }

    if (selectedDate) {
      tempBLs = tempBLs.filter(bl => {
        const blCreationDate = new Date(bl.createdAt);
        return blCreationDate.getFullYear() === selectedDate.getFullYear() &&
               blCreationDate.getMonth() === selectedDate.getMonth() &&
               blCreationDate.getDate() === selectedDate.getDate();
      });
    }

    if (!searchTerm) return tempBLs;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return tempBLs.filter(bl =>
      bl.blNumber.toLowerCase().includes(lowerSearchTerm) ||
      getClientName(bl.clientId).toLowerCase().includes(lowerSearchTerm) ||
      bl.status.toLowerCase().includes(lowerSearchTerm) ||
      (bl.createdByUserId && getUserName(bl.createdByUserId).toLowerCase().includes(lowerSearchTerm))
    );
  }, [bls, searchTerm, selectedClientId, selectedUserId, selectedDate, clients]); // Added clients to dependency array

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
            <div className="lg:col-span-2 xl:col-span-1">
              <Label htmlFor="search-term" className="block text-sm font-medium text-muted-foreground mb-1">Recherche générale</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="search-term"
                  placeholder="N° BL, client, statut, utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full" 
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="client-filter" className="block text-sm font-medium text-muted-foreground mb-1">Par Client</Label>
              <Select value={selectedClientId} onValueChange={(value) => setSelectedClientId(value === "all" ? undefined : value)} disabled={isLoading || clients.length === 0}>
                <SelectTrigger id="client-filter">
                  <SelectValue placeholder={clients.length === 0 && !isLoading ? "Aucun client" : "Tous les Clients"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les Clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="user-filter" className="block text-sm font-medium text-muted-foreground mb-1">Par Utilisateur (Créateur)</Label>
              <Select value={selectedUserId} onValueChange={(value) => setSelectedUserId(value === "all" ? undefined : value)} disabled={isLoading}>
                <SelectTrigger id="user-filter">
                  <SelectValue placeholder="Tous les Utilisateurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les Utilisateurs</SelectItem>
                  {users.map(user => ( // MOCK_USERS still used for assignee selection
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="date-filter" className="block text-sm font-medium text-muted-foreground mb-1">Par Date de Création</Label>
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
          <CardTitle>Liste des Connaissements</CardTitle>
          <CardDescription>
            Aperçu de tous les BLs enregistrés. Nombre de BLs affichés: {isLoading ? "Chargement..." : filteredBLs.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Chargement des connaissements...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° BL</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Créé par</TableHead>
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
                      <TableCell>{getUserName(bl.createdByUserId)}</TableCell>
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
          )}
           {!isLoading && filteredBLs.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              {searchTerm || selectedClientId || selectedUserId || selectedDate ? "Aucun BL ne correspond à vos filtres." : "Aucun BL trouvé."}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
