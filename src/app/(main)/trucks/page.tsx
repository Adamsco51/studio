
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    getTrucksFromFirestore,
    deleteTruckFromFirestore,
    updateDriverInFirestore, // Needed if unassigning driver
} from '@/lib/mock-data';
import type { Truck, TruckStatus } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Search, Loader2, Truck as TruckIcon, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
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

const getStatusBadgeVariant = (status: TruckStatus) => {
  switch (status) {
    case 'available': return 'green';
    case 'in_transit': return 'blue';
    case 'maintenance': return 'yellow';
    case 'out_of_service': return 'red';
    default: return 'gray';
  }
};

const getStatusText = (status: TruckStatus) => {
    switch (status) {
        case 'available': return 'Disponible';
        case 'in_transit': return 'En Transit';
        case 'maintenance': return 'En Maintenance';
        case 'out_of_service': return 'Hors Service';
        default: return status;
    }
};

export default function TrucksPage() {
  const { user, isAdmin } = useAuth();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [truckToDelete, setTruckToDelete] = useState<Truck | null>(null);


  const fetchTrucks = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedTrucks = await getTrucksFromFirestore();
      setTrucks(fetchedTrucks);
    } catch (error) {
      console.error("Failed to fetch trucks:", error);
      toast({ title: "Erreur", description: "Impossible de charger la liste des camions.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  },[user, toast]);

  useEffect(() => {
    fetchTrucks();
  }, [fetchTrucks]);

  const filteredTrucks = useMemo(() => {
    if (!searchTerm) return trucks;
    return trucks.filter(truck =>
      truck.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (truck.model && truck.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      getStatusText(truck.status).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (truck.currentDriverName && truck.currentDriverName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [trucks, searchTerm]);

  const handleDeleteTruck = async () => {
    if (!truckToDelete || !isAdmin) {
        toast({ title: "Action non autorisée", variant: "destructive" });
        return;
    }
    setIsDeleting(true);
    try {
      // If the truck had a driver, unassign that driver
      if (truckToDelete.currentDriverId) {
        await updateDriverInFirestore(truckToDelete.currentDriverId, {
          currentTruckId: null,
          currentTruckReg: null,
          status: 'available', // Make driver available
        });
      }
      await deleteTruckFromFirestore(truckToDelete.id);
      setTrucks(prevTrucks => prevTrucks.filter(t => t.id !== truckToDelete.id));
      toast({ title: "Camion Supprimé", description: `Le camion ${truckToDelete.registrationNumber} a été supprimé.` });
    } catch (error) {
      console.error("Failed to delete truck:", error);
      toast({ title: "Erreur", description: "Échec de la suppression du camion.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setTruckToDelete(null);
    }
  };

  if (!user && !isLoading) {
    return <div className="flex justify-center items-center h-64">Veuillez vous connecter pour voir cette page.</div>;
  }

  return (
    <>
      <PageHeader
        title="Gestion des Camions"
        description="Consultez, ajoutez et gérez votre flotte de camions."
        actions={
          <Link href="/trucks/add" passHref>
            <Button disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Camion
            </Button>
          </Link>
        }
      />
       <Card className="shadow-lg mb-6">
        <CardHeader>
          <CardTitle>Filtrer les Camions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par immat., modèle, statut, chauffeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md pl-8"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Camions</CardTitle>
          <CardDescription>
            Affichage: {isLoading ? "..." : filteredTrucks.length} camion(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Chargement des camions...</p>
            </div>
          ) : filteredTrucks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
                <TruckIcon className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">
                {searchTerm
                    ? "Aucun camion ne correspond à votre recherche."
                    : "Aucun camion trouvé. Commencez par en ajouter un !"
                }
                </p>
                 {(!searchTerm) && (
                    <Button asChild className="mt-4">
                        <Link href="/trucks/add"><PlusCircle className="mr-2 h-4 w-4" />Ajouter un Camion</Link>
                    </Button>
                )}
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Immatriculation</TableHead>
                <TableHead>Modèle</TableHead>
                <TableHead>Chauffeur Actuel</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrucks.map((truck) => (
                <TableRow key={truck.id}>
                  <TableCell className="font-medium">{truck.registrationNumber}</TableCell>
                  <TableCell>{truck.model || 'N/A'}</TableCell>
                  <TableCell>
                    {truck.currentDriverName ? (
                        <span className="flex items-center gap-1">
                            <User className="h-4 w-4 text-muted-foreground"/> {truck.currentDriverName}
                        </span>
                    ) : <span className="text-muted-foreground italic">Non assigné</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(truck.status) as any} className="capitalize">
                      {getStatusText(truck.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Link href={`/trucks/${truck.id}/edit`} passHref>
                      <Button variant="outline" size="sm" disabled={isDeleting}>
                        <Edit className="mr-1 h-4 w-4" /> Modifier
                      </Button>
                    </Link>
                    {isAdmin && (
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm" onClick={() => setTruckToDelete(truck)} disabled={isDeleting && truckToDelete?.id === truck.id}>
                                {(isDeleting && truckToDelete?.id === truck.id) && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                                <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                            <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer le camion {truckToDelete?.registrationNumber}? Cette action est irréversible et désassignera tout chauffeur lié.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setTruckToDelete(null)} disabled={isDeleting}>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteTruck} disabled={isDeleting}>
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
          )}
        </CardContent>
      </Card>
    </>
  );
}
