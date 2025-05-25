
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MOCK_WORK_TYPES, deleteWorkType } from '@/lib/mock-data';
import type { WorkType } from '@/lib/types';
import { PlusCircle, ArrowRight, Edit, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


export default function WorkTypesPage() {
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setWorkTypes(MOCK_WORK_TYPES);
  }, []);

  const filteredWorkTypes = useMemo(() => {
    if (!searchTerm) return workTypes;
    return workTypes.filter(wt => 
      wt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wt.description && wt.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [workTypes, searchTerm]);

  const handleDeleteWorkType = (workTypeId: string) => {
    deleteWorkType(workTypeId);
    setWorkTypes(MOCK_WORK_TYPES.filter(wt => wt.id !== workTypeId)); // Update local state
    toast({
      title: "Type de Travail Supprimé",
      description: "Le type de travail a été supprimé avec succès.",
    });
    router.refresh(); // To reflect changes if other parts of app depend on global MOCK_WORK_TYPES
  };


  return (
    <>
      <PageHeader
        title="Gestion des Types de Travail"
        description="Configurez les différents types de services ou de travaux que vous proposez."
        actions={
          <Link href="/work-types/add" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Type
            </Button>
          </Link>
        }
      />
       <Card className="shadow-lg mb-6">
        <CardHeader>
          <CardTitle>Filtrer les Types de Travail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom ou description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Types de Travail</CardTitle>
          <CardDescription>
            Aperçu de tous les types de travail enregistrés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkTypes.map((wt) => (
                <TableRow key={wt.id}>
                  <TableCell className="font-medium">{wt.name}</TableCell>
                  <TableCell>{wt.description || 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/work-types/${wt.id}/edit`} passHref>
                      <Button variant="outline" size="sm">
                        <Edit className="mr-1 h-4 w-4" /> Modifier
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible et supprimera le type de travail.
                            Les BLs utilisant ce type pourraient être affectés.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteWorkType(wt.id)}>
                            Confirmer la Suppression
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {filteredWorkTypes.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
                {searchTerm ? "Aucun type de travail ne correspond à votre recherche." : "Aucun type de travail trouvé."}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
