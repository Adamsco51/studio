
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react'; 
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getClientsFromFirestore, getBLsFromFirestore } from '@/lib/mock-data'; 
import { PlusCircle, ArrowRight, UserCheck, UserX, Search, Loader2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Client, BillOfLading } from '@/lib/types'; 
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

type ClientWithStatus = Client & { isActive: boolean };

export default function ClientsPage() { 
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientWithStatus[]>([]);
  const [allBls, setAllBls] = useState<BillOfLading[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const [firestoreClients, firestoreBls] = await Promise.all([
        getClientsFromFirestore(),
        getBLsFromFirestore(), 
      ]);
      
      setAllBls(firestoreBls); 

      const clientsWithStatus = firestoreClients.map(client => {
        const hasActiveBL = firestoreBls.some(bl => bl.clientId === client.id && bl.status === 'en cours');
        return { ...client, isActive: hasActiveBL };
      });
      setClients(clientsWithStatus);
    } catch (error) {
      console.error("Failed to fetch clients or BLs:", error);
      toast({ title: "Erreur", description: "Impossible de charger les clients ou les BLs.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]); 

  useEffect(() => {
    fetchData();
  }, [fetchData]); 

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [clients, searchTerm]);

  return (
    <>
      <PageHeader
        title="Gestion des Clients"
        description="Consultez, ajoutez et gérez les informations de vos clients."
        actions={
          <Link href="/clients/add" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter un Client
            </Button>
          </Link>
        }
      />
      <div className="mb-6 flex items-center gap-2">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Rechercher par nom, contact, email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
          disabled={isLoading}
        />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Clients</CardTitle>
          <CardDescription>
            Voici la liste de tous les clients enregistrés dans le système. Affichage: {isLoading ? "..." : filteredClients.length} client(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Chargement des clients...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">
                {searchTerm 
                    ? "Aucun client ne correspond à votre recherche." 
                    : "Aucun client n'a été trouvé. Commencez par en ajouter un !"
                }
                </p>
                {!searchTerm && (
                    <Button asChild className="mt-4">
                        <Link href="/clients/add"><PlusCircle className="mr-2 h-4 w-4" />Ajouter un Client</Link>
                    </Button>
                )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du Client</TableHead>
                  <TableHead>Personne à Contacter</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.contactPerson}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>
                      <Badge variant={client.isActive ? 'default' : 'secondary'} 
                             className={client.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                        {client.isActive ? <UserCheck className="mr-1 h-3 w-3"/> : <UserX className="mr-1 h-3 w-3"/>}
                        {client.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/clients/${client.id}`} passHref>
                        <Button variant="ghost" size="sm">
                          Voir Détails <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
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
