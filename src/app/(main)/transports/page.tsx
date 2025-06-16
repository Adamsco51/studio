
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    getTransportsFromFirestore,
    deleteTransportFromFirestore,
    getBLByIdFromFirestore,
    getTruckByIdFromFirestore,
    getDriverByIdFromFirestore,
} from '@/lib/mock-data';
import type { Transport, TransportStatus, BillOfLading, Truck, Driver } from '@/lib/types';
import { PlusCircle, Search, Eye, Edit, Trash2, Loader2, Route, CalendarDays, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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

const getStatusBadgeVariant = (status: TransportStatus) => {
  switch (status) {
    case 'planned': return 'yellow';
    case 'in_progress': return 'blue';
    case 'completed': return 'green';
    case 'delayed': return 'orange';
    case 'cancelled': return 'red';
    default: return 'gray';
  }
};

const getStatusText = (status: TransportStatus) => {
    switch (status) {
        case 'planned': return 'Planifié';
        case 'in_progress': return 'En Cours';
        case 'completed': return 'Terminé';
        case 'delayed': return 'Retardé';
        case 'cancelled': return 'Annulé';
        default: return status;
    }
};

const getStatusIcon = (status: TransportStatus) => {
    switch (status) {
        case 'planned': return <Clock className="mr-1 h-3 w-3" />;
        case 'in_progress': return <Route className="mr-1 h-3 w-3 animate-pulse" />;
        case 'completed': return <CheckCircle className="mr-1 h-3 w-3" />;
        case 'delayed': return <AlertTriangle className="mr-1 h-3 w-3" />;
        case 'cancelled': return <Trash2 className="mr-1 h-3 w-3" />; // Or XCircle
        default: return null;
    }
};


export default function TransportsPage() {
  const { user, isAdmin } = useAuth();
  const [transports, setTransports] = useState<Transport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [transportToDelete, setTransportToDelete] = useState<Transport | null>(null);

  const fetchTransports = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedTransports = await getTransportsFromFirestore();
      // For initial list, we might not fetch all related data to keep it fast.
      // Details can be fetched on the detail page or if necessary.
      setTransports(fetchedTransports);
    } catch (error) {
      console.error("Failed to fetch transports:", error);
      toast({ title: "Erreur", description: "Impossible de charger la liste des transports.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  },[user, toast]);

  useEffect(() => {
    fetchTransports();
  }, [fetchTransports]);

  const filteredTransports = useMemo(() => {
    if (!searchTerm) return transports;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return transports.filter(transport =>
      transport.transportNumber.toLowerCase().includes(lowerSearchTerm) ||
      (transport.blId && transport.blId.toLowerCase().includes(lowerSearchTerm)) || // Would be better with BL Number
      (transport.truckRegistrationNumber && transport.truckRegistrationNumber.toLowerCase().includes(lowerSearchTerm)) ||
      (transport.driverName && transport.driverName.toLowerCase().includes(lowerSearchTerm)) ||
      transport.origin.toLowerCase().includes(lowerSearchTerm) ||
      transport.destination.toLowerCase().includes(lowerSearchTerm) ||
      getStatusText(transport.status).toLowerCase().includes(lowerSearchTerm)
    );
  }, [transports, searchTerm]);

  const handleDeleteTransport = async () => {
    if (!transportToDelete || !isAdmin) {
        toast({ title: "Action non autorisée", variant: "destructive" });
        return;
    }
    setIsDeleting(true);
    try {
      await deleteTransportFromFirestore(transportToDelete.id);
      setTransports(prevTransports => prevTransports.filter(t => t.id !== transportToDelete.id));
      toast({ title: "Transport Supprimé", description: `Le transport ${transportToDelete.transportNumber} a été supprimé.` });
    } catch (error) {
      console.error("Failed to delete transport:", error);
      toast({ title: "Erreur", description: "Échec de la suppression du transport.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setTransportToDelete(null);
    }
  };

  if (!user && !isLoading) {
    return <div className="flex justify-center items-center h-64">Veuillez vous connecter pour voir cette page.</div>;
  }

  return (
    <>
      <PageHeader
        title="Gestion des Transports"
        description="Suivez et gérez tous les transports de conteneurs."
        actions={
          <Link href="/transports/add" passHref>
            <Button disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Transport
            </Button>
          </Link>
        }
      />
       <Card className="shadow-lg mb-6">
        <CardHeader>
          <CardTitle>Filtrer les Transports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par N° transport, BL, camion, chauffeur, origine, destination, statut..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xl pl-8"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Transports</CardTitle>
          <CardDescription>
            Affichage: {isLoading ? "..." : filteredTransports.length} transport(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Chargement des transports...</p>
            </div>
          ) : filteredTransports.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
                <Route className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">
                {searchTerm
                    ? "Aucun transport ne correspond à votre recherche."
                    : "Aucun transport trouvé. Commencez par en ajouter un !"
                }
                </p>
                 {(!searchTerm) && (
                    <Button asChild className="mt-4">
                        <Link href="/transports/add"><PlusCircle className="mr-2 h-4 w-4" />Nouveau Transport</Link>
                    </Button>
                )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Transport</TableHead>
                    <TableHead>BL</TableHead>
                    <TableHead>Camion</TableHead>
                    <TableHead>Chauffeur</TableHead>
                    <TableHead>Origine - Destination</TableHead>
                    <TableHead>Départ Prévu</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransports.map((transport) => (
                    <TableRow key={transport.id}>
                      <TableCell className="font-medium">{transport.transportNumber}</TableCell>
                      <TableCell>
                        <Link href={`/bls/${transport.blId}`} className="text-primary hover:underline">
                            BL associé
                        </Link>
                      </TableCell>
                      <TableCell>{transport.truckRegistrationNumber || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                      <TableCell>{transport.driverName || <span className="text-muted-foreground italic">N/A</span>}</TableCell>
                      <TableCell>{transport.origin} <Route className="inline h-4 w-4 mx-1 text-muted-foreground" /> {transport.destination}</TableCell>
                      <TableCell>{format(parseISO(transport.plannedDepartureDate), 'dd MMM yyyy', { locale: fr })}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(transport.status) as any} className="capitalize flex items-center w-fit">
                          {getStatusIcon(transport.status)}
                          {getStatusText(transport.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                         {/* <Link href={`/transports/${transport.id}`} passHref>
                            <Button variant="ghost" size="icon" title="Voir Détails" disabled={isDeleting}>
                                <Eye className="h-4 w-4" />
                            </Button>
                        </Link> */}
                        <Link href={`/transports/${transport.id}/edit`} passHref>
                          <Button variant="outline" size="sm" disabled={isDeleting}>
                            <Edit className="mr-1 h-4 w-4" /> Modifier
                          </Button>
                        </Link>
                        {isAdmin && (
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="destructive" size="sm" onClick={() => setTransportToDelete(transport)} disabled={isDeleting && transportToDelete?.id === transport.id}>
                                    {(isDeleting && transportToDelete?.id === transport.id) && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                                    <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer le transport {transportToDelete?.transportNumber}? Cette action est irréversible.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setTransportToDelete(null)} disabled={isDeleting}>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteTransport} disabled={isDeleting}>
                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirmer
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
