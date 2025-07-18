
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
    getBLsFromFirestore, 
    getClientsFromFirestore, 
    getExpensesFromFirestore, 
    // getUserProfile, // Removed: No longer fetching all user profiles here
} from '@/lib/mock-data';
import type { BLStatus, BillOfLading, Client, Expense } from '@/lib/types'; // Removed AppUserProfile
import { PlusCircle, ArrowRight, CheckCircle, AlertCircle, Clock, Search, CalendarIcon, FilterX, Loader2, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

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

interface BlDetails {
  totalExpenses: number;
  balance: number;
  profitStatus: 'Bénéfice' | 'Perte' | 'N/A';
  profit: boolean;
}

export default function BillsOfLadingPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [bls, setBls] = useState<BillOfLading[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined); // Still here for potential future use or specific admin filtering
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const fetchData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      // Removed getAllUserProfiles from Promise.all
      const [fetchedBls, fetchedClients, fetchedExpenses] = await Promise.all([
        getBLsFromFirestore(),
        getClientsFromFirestore(),
        getExpensesFromFirestore(), 
      ]);
      setBls(fetchedBls);
      setClients(fetchedClients);
      setAllExpenses(fetchedExpenses); 
    } catch (error) {
      console.error("Failed to fetch data for BLs page:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger les données nécessaires.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]); 

  useEffect(() => {
    fetchData();
  }, [fetchData]); 

  const getClientName = useCallback((clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'N/A';
  }, [clients]);

  // Memoize the calculation of details for all BLs to avoid re-computation on every render
  const blDetailsMap = useMemo(() => {
    const map = new Map<string, BlDetails>();
    bls.forEach(bl => {
      const expensesForBl = allExpenses.filter(exp => exp.blId === bl.id);
      const totalExpenses = expensesForBl.reduce((sum, exp) => sum + exp.amount, 0);
      const balance = bl.allocatedAmount - totalExpenses;
      const profitStatus = balance >= 0 ? 'Bénéfice' : 'Perte';
      map.set(bl.id, { totalExpenses, balance, profitStatus, profit: balance >= 0 });
    });
    return map;
  }, [bls, allExpenses]);

  const getBlDetails = useCallback((blId: string): BlDetails => {
    return blDetailsMap.get(blId) || { totalExpenses: 0, balance: 0, profitStatus: 'N/A', profit: false };
  }, [blDetailsMap]);


  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedClientId(undefined);
    setSelectedUserId(undefined); // Keep for reset, even if filtering by it is less common now
    setSelectedDate(undefined);
  };

  const filteredBLs = useMemo(() => {
    let tempBLs = bls;

    if (selectedClientId) {
      tempBLs = tempBLs.filter(bl => bl.clientId === selectedClientId);
    }

    // Filtering by createdByUserId might be less useful now without readily available user list for selection,
    // but kept if searchTerm includes user name.
    // if (selectedUserId) { 
    //   tempBLs = tempBLs.filter(bl => bl.createdByUserId === selectedUserId);
    // }

    if (selectedDate) {
      tempBLs = tempBLs.filter(bl => {
        if (!bl.createdAt) return false;
        const blCreationDate = parseISO(bl.createdAt);
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
      (bl.createdByUserName && bl.createdByUserName.toLowerCase().includes(lowerSearchTerm))
    );
  }, [bls, searchTerm, selectedClientId, selectedDate, getClientName]); // Removed selectedUserId and userProfiles from dependencies

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
            <div className="sm:col-span-2 md:col-span-1">
              <Label htmlFor="search-term" className="block text-sm font-medium text-muted-foreground mb-1">Recherche générale</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="search-term"
                  placeholder="N° BL, client, statut, créateur..."
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

            {/* User filter might be less useful if we don't easily list users for selection. Kept for structure. */}
            {/* <div>
              <Label htmlFor="user-filter" className="block text-sm font-medium text-muted-foreground mb-1">Par Utilisateur (Créateur)</Label>
              <Select value={selectedUserId} onValueChange={(value) => setSelectedUserId(value === "all" ? undefined : value)} disabled={isLoading}>
                <SelectTrigger id="user-filter">
                  <SelectValue placeholder="Tous les Utilisateurs"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les Utilisateurs</SelectItem>
                  { MOCK_USERS.map(up => ( // Placeholder, replace with actual user list if needed
                    <SelectItem key={up.id} value={up.id}>{up.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}
            
            <div>
              <Label htmlFor="date-filter" className="block text-sm font-medium text-muted-foreground mb-1">Par Date de Création</Label>
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

            <Button onClick={handleResetFilters} variant="outline" className="w-full xl:mt-[22px]" disabled={isLoading}>
              <FilterX className="mr-2 h-4 w-4" /> Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Connaissements</CardTitle>
          <CardDescription>
            Aperçu de tous les BLs enregistrés. Affichage: {isLoading ? "..." : filteredBLs.length} BL(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Chargement des connaissements...</p>
            </div>
          ) : filteredBLs.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">
                {searchTerm || selectedClientId || selectedUserId || selectedDate 
                    ? "Aucun BL ne correspond à vos filtres." 
                    : "Aucun BL n'a été trouvé. Commencez par en ajouter un !"
                }
                </p>
                 {(!searchTerm && !selectedClientId && !selectedUserId && !selectedDate) && (
                    <Button asChild className="mt-4">
                        <Link href="/bls/add"><PlusCircle className="mr-2 h-4 w-4" />Ajouter un BL</Link>
                    </Button>
                )}
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                    const { totalExpenses, balance, profitStatus, profit } = getBlDetails(bl.id);
                    return (
                      <TableRow key={bl.id}>
                        <TableCell className="font-medium whitespace-nowrap">{bl.blNumber}</TableCell>
                        <TableCell className="whitespace-nowrap">{getClientName(bl.clientId)}</TableCell>
                        <TableCell className="whitespace-nowrap">{bl.createdByUserName || 'N/A'}</TableCell>
                        <TableCell className="whitespace-nowrap">{bl.createdAt ? format(parseISO(bl.createdAt), 'dd MMM yyyy', { locale: fr }) : 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("capitalize flex items-center w-fit", getStatusBadgeStyle(bl.status, 'badge'))}>
                            <StatusIcon status={bl.status} />
                            {bl.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{bl.allocatedAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</TableCell>
                        <TableCell className="whitespace-nowrap">{totalExpenses.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</TableCell>
                        <TableCell className={cn("whitespace-nowrap font-semibold", profit ? 'text-green-600' : 'text-red-600')}>
                          {balance.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={profit ? 'default' : 'destructive'} className={profit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }>{profitStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
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
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
