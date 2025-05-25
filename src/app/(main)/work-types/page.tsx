
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MOCK_WORK_TYPES, MOCK_USERS, deleteWorkType } from '@/lib/mock-data';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Simulate the currently logged-in user
const currentUser = MOCK_USERS.find(u => u.id === 'user-1')!; // Alice Employee (non-admin)
// const currentUser = MOCK_USERS.find(u => u.id === 'user-2')!; // Bob Admin
const isAdmin = currentUser.role === 'admin';


export default function WorkTypesPage() {
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  const [editingWorkType, setEditingWorkType] = useState<WorkType | null>(null);
  const [editReason, setEditReason] = useState('');
  const [deletingWorkType, setDeletingWorkType] = useState<WorkType | null>(null);
  const [deleteReason, setDeleteReason] = useState('');


  useEffect(() => {
    const sortedWorkTypes = MOCK_WORK_TYPES.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setWorkTypes(sortedWorkTypes);
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
    const updatedWorkTypes = MOCK_WORK_TYPES.filter(wt => wt.id !== workTypeId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setWorkTypes(updatedWorkTypes); 
    toast({
      title: "Type de Travail Supprimé",
      description: "Le type de travail a été supprimé avec succès.",
    });
    router.refresh(); 
  };

  const handleSubmitEditRequest = () => {
    if (!editingWorkType || !editReason.trim()) {
      toast({ title: "Erreur", description: "Veuillez fournir une raison pour la modification.", variant: "destructive" });
      return;
    }
    console.log(`Demande de modification pour Type de Travail ${editingWorkType.name} par ${currentUser.name}. Raison: ${editReason}`);
    toast({
      title: "Demande Envoyée (Simulation)",
      description: `Votre demande de modification pour "${editingWorkType.name}" a été envoyée.`,
    });
    setEditReason('');
    setEditingWorkType(null);
  };

  const handleSubmitDeleteRequest = () => {
    if (!deletingWorkType || !deleteReason.trim()) {
        toast({ title: "Erreur", description: "Veuillez fournir une raison pour la suppression.", variant: "destructive" });
        return;
    }
    console.log(`Demande de suppression pour Type de Travail ${deletingWorkType.name} par ${currentUser.name}. Raison: ${deleteReason}`);
    toast({
        title: "Demande Envoyée (Simulation)",
        description: `Votre demande de suppression pour "${deletingWorkType.name}" a été envoyée.`,
    });
    setDeleteReason('');
    setDeletingWorkType(null);
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
            Aperçu de tous les types de travail enregistrés, triés par date de création (plus récents en premier).
            Nombre de types affichés: {filteredWorkTypes.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date Création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkTypes.map((wt) => (
                <TableRow key={wt.id}>
                  <TableCell className="font-medium">{wt.name}</TableCell>
                  <TableCell>{wt.description || 'N/A'}</TableCell>
                  <TableCell>{format(new Date(wt.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr })}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {isAdmin ? (
                       <Link href={`/work-types/${wt.id}/edit`} passHref>
                        <Button variant="outline" size="sm">
                          <Edit className="mr-1 h-4 w-4" /> Modifier
                        </Button>
                      </Link>
                    ) : (
                       <Dialog open={editingWorkType?.id === wt.id} onOpenChange={(isOpen) => {
                        if (!isOpen) setEditingWorkType(null); else setEditingWorkType(wt);
                        setEditReason('');
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => {setEditingWorkType(wt); setEditReason('');}}>
                            <Edit className="mr-1 h-4 w-4" /> Modifier
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Demande de Modification: {wt.name}</DialogTitle>
                            <DialogDescription>
                              Expliquez pourquoi vous souhaitez modifier ce type de travail.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 py-2">
                            <Label htmlFor={`editReason-${wt.id}`}>Raison :</Label>
                            <Textarea id={`editReason-${wt.id}`} value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Raison de la demande..."/>
                          </div>
                          <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                            <Button onClick={handleSubmitEditRequest}>Soumettre</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                   
                    <AlertDialog open={deletingWorkType?.id === wt.id} onOpenChange={(isOpen) => {
                        if (!isOpen) setDeletingWorkType(null);
                        setDeleteReason('');
                    }}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => {setDeletingWorkType(wt); setDeleteReason('');}}>
                          <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{isAdmin ? "Êtes-vous sûr ?" : `Demande de Suppression: ${wt.name}`}</AlertDialogTitle>
                           {isAdmin ? (
                            <AlertDialogDescription>
                                Cette action est irréversible et supprimera le type de travail "{wt.name}".
                                Les BLs utilisant ce type pourraient être affectés.
                            </AlertDialogDescription>
                           ) : (
                             <div className="space-y-2 py-2 text-left">
                                <Label htmlFor={`deleteReason-${wt.id}`}>Raison :</Label>
                                <Textarea id={`deleteReason-${wt.id}`} value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Raison de la demande de suppression..."/>
                                <p className="text-xs text-muted-foreground">Votre demande sera examinée par un administrateur.</p>
                             </div>
                           )}
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => {setDeletingWorkType(null); setDeleteReason('');}}>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={isAdmin ? () => handleDeleteWorkType(wt.id) : handleSubmitDeleteRequest}>
                            {isAdmin ? "Confirmer" : "Soumettre"}
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

    