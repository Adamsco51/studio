import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MOCK_CLIENTS } from '@/lib/mock-data';
import { PlusCircle, ArrowRight } from 'lucide-react';

export default function ClientsPage() {
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
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Clients</CardTitle>
          <CardDescription>
            Voici la liste de tous les clients enregistrés dans le système.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du Client</TableHead>
                <TableHead>Personne à Contacter</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_CLIENTS.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.contactPerson}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.phone}</TableCell>
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
          {MOCK_CLIENTS.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Aucun client trouvé.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
