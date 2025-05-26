
"use client";

import { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getClientsFromFirestore, getBLsFromFirestore } from '@/lib/mock-data'; // Use Firestore functions
import { PlusCircle, ArrowRight, UserCheck, UserX, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Client, BillOfLading } from '@/lib/types'; // Added BillOfLading type

type ClientWithStatus = Client & { isActive: boolean };

export default function ClientsPage({ params: paramsPromise }: { params: Promise<{}> }) {
  const params = use(paramsPromise); 

  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientWithStatus[]>([]);
  const [allBls, setAllBls] = useState<BillOfLading[]>([]); // State to store all BLs
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [firestoreClients, firestoreBls] = await Promise.all([
          getClientsFromFirestore(),
          getBLsFromFirestore() // Fetch all BLs
        ]);
        
        setAllBls(firestoreBls); // Store fetched BLs

        const clientsWithStatus = firestoreClients.map(client => {
          // Determine isActive based on BLs fetched from Firestore
          const hasActiveBL = firestoreBls.some(bl => bl.clientId === client.id && bl.status === 'en cours');
          return { ...client, isActive: hasActiveBL };
        });
        setClients(clientsWithStatus);
      } catch (error) {
        console.error("Failed to fetch clients or BLs:", error);
        // Handle error (e.g., show a toast)
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []); 

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
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
            Voici la liste de tous les clients enregistrés dans le système.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Chargement des clients...</p>
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
          {!isLoading && filteredClients.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              {searchTerm ? "Aucun client ne correspond à votre recherche." : "Aucun client trouvé."}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
