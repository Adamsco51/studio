
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    getDriversFromFirestore,
    deleteDriverFromFirestore,
    updateTruckInFirestore, // Needed if unassigning truck
} from '@/lib/mock-data';
import type { Driver, DriverStatus } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Search, Loader2, UserCog as DriverIcon, Truck } from 'lucide-react';
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

const getStatusBadgeVariant = (status: DriverStatus) => {
  switch (status) {
    case 'available': return 'green';
    case 'on_trip': return 'blue';
    case 'off_duty': return 'yellow';
    case 'unavailable': return 'red';
    default: return 'gray';
  }
};

const getStatusText = (status: DriverStatus) => {
    switch (status) {
        case 'available': return 'Disponible';
        case 'on_trip': return 'En Voyage';
        case 'off_duty': return 'En Repos';
        case 'unavailable': return 'Indisponible';
        default: return status;
    }
};

export default function DriversPage() {
  const { user, isAdmin } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  const fetchDrivers = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedDrivers = await getDriversFromFirestore();
      setDrivers(fetchedDrivers);
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
      toast({ title: "Erreur", description: "Impossible de charger la liste des chauffeurs.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  },[user, toast]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const filteredDrivers = useMemo(() => {
    if (!searchTerm) return drivers;
    return drivers.filter(driver =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getStatusText(driver.status).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (driver.currentTruckReg && driver.currentTruckReg.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [drivers, searchTerm]);

  const handleDeleteDriver = async () => {
    if (!driverToDelete || !isAdmin) {
        toast({ title: "Action non autorisée", variant: "destructive" });
        return;
    }
    setIsDeleting(true);
    try {
      // If the driver was assigned to a truck, unassign that truck
      if (driverToDelete.currentTruckId) {
        await updateTruckInFirestore(driverToDelete.currentTruckId, {
          currentDriverId: null,
          currentDriverName: null,
          status: 'available', // Make truck available
        });
      }
      await deleteDriverFromFirestore(driverToDelete.id);
      setDrivers(prevDrivers => prevDrivers.filter(d => d.id !== driverToDelete.id));
      toast({ title: "Chauffeur Supprimé", description: `Le chauffeur ${driverToDelete.name} a été supprimé.` });
    } catch (error) {
      console.error("Failed to delete driver:", error);
      toast({ title: "Erreur", description: "Échec de la suppression du chauffeur.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDriverToDelete(null);
    }
  };

  if (!user && !isLoading) {
    return <div className="flex justify-center items-center h-64">Veuillez vous connecter pour voir cette page.</div>;
  }

  return (
    <>
      <PageHeader
        title="Gestion des Chauffeurs"
        description="Consultez, ajoutez et gérez les informations de vos chauffeurs."
        actions={
          <Link href="/drivers/add" passHref>
            <Button disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Chauffeur
            </Button>
          </Link>
        }
      />
       <Card className="shadow-lg mb-6">
        <CardHeader>
          <CardTitle>Filtrer les Chauffeurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, permis, téléphone, statut, camion..."
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
          <CardTitle>Liste des Chauffeurs</CardTitle>
          <CardDescription>
            Affichage: {isLoading ? "..." : filteredDrivers.length} chauffeur(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Chargement des chauffeurs...</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
                <DriverIcon className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">
                {searchTerm
                    ? "Aucun chauffeur ne correspond à votre recherche."
                    : "Aucun chauffeur trouvé. Commencez par en ajouter un !"
                }
                </p>
                 {(!searchTerm) && (
                    <Button asChild className="mt-4">
                        <Link href="/drivers/add"><PlusCircle className="mr-2 h-4 w-4" />Ajouter un Chauffeur</Link>
                    </Button>
                )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>N° Permis</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Camion Actuel</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>{driver.licenseNumber}</TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>
                        {driver.currentTruckReg ? (
                            <span className="flex items-center gap-1">
                                <Truck className="h-4 w-4 text-muted-foreground"/> {driver.currentTruckReg}
                            </span>
                        ) : <span className="text-muted-foreground italic">Non assigné</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(driver.status) as any} className="capitalize">
                          {getStatusText(driver.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Link href={`/drivers/${driver.id}/edit`} passHref>
                          <Button variant="outline" size="sm" disabled={isDeleting}>
                            <Edit className="mr-1 h-4 w-4" /> Modifier
                          </Button>
                        </Link>
                        {isAdmin && (
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button variant="destructive" size="sm" onClick={() => setDriverToDelete(driver)} disabled={isDeleting && driverToDelete?.id === driver.id}>
                                    {(isDeleting && driverToDelete?.id === driver.id) && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                                    <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer le chauffeur {driverToDelete?.name}? Cette action est irréversible et désassignera tout camion lié.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDriverToDelete(null)} disabled={isDeleting}>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteDriver} disabled={isDeleting}>
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
