
"use client";

import { useState, useEffect, useMemo, use } from 'react'; // Added use
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getWorkTypesFromFirestore, deleteWorkTypeFromFirestore } from '@/lib/mock-data'; // Firestore functions
import type { WorkType } from '@/lib/types';
import { PlusCircle, Edit, Trash2, Search, Loader2 } from 'lucide-react'; // Added Loader2
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
import { useAuth } from '@/contexts/auth-context';

export default function WorkTypesPage({ params: paramsPromise }: { params: Promise<{}> }) { // Added paramsPromise
  const params = use(paramsPromise); // Resolve params using React.use
  const { user, isAdmin } = useAuth();
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [editingWorkType, setEditingWorkType] = useState<WorkType | null>(null);
  const [editReason, setEditReason] = useState('');
  const [deletingWorkType, setDeletingWorkType] = useState<WorkType | null>(null);
  const [deleteReason, setDeleteReason] = useState('');


  useEffect(() => {
    if (!user) return; // Wait for user to be loaded
    const fetchWorkTypes = async () => {
      setIsLoading(true);
      try {
        const fetchedWorkTypes = await getWorkTypesFromFirestore();
        setWorkTypes(fetchedWorkTypes);
      } catch (error) {
        console.error("Failed to fetch work types:", error);
        toast({ title: "Erreur", description: "Impossible de charger les types de travail.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkTypes();
  }, [user, toast]);

  const filteredWorkTypes = useMemo(() => {
    if (!searchTerm) return workTypes;
    return workTypes.filter(wt => 
      wt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wt.description && wt.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [workTypes, searchTerm]);

  const handleDeleteWorkTypeDirectly = async (workTypeId: string) => {
    if (!isAdmin) return;
    setIsProcessingAction(true);
    try {
      await deleteWorkTypeFromFirestore(workTypeId);
      setWorkTypes(prev => prev.filter(wt => wt.id !== workTypeId));
      toast({
        title: "Type de Travail Supprimé",
        description: "Le type de travail a été supprimé avec succès.",
      });
      setDeletingWorkType(null);
      router.refresh(); 
    } catch (error) {
      console.error("Failed to delete work type:", error);
      toast({ title: "Erreur", description: "Échec de la suppression.", variant: "destructive" });
    } finally {
        setIsProcessingAction(false);
    }
  };

  const handleSubmitEditRequest = () => {
    if (!editingWorkType || !editReason.trim()) {
      toast({ title: "Erreur", description: "Veuillez fournir une raison pour la modification.", variant: "destructive" });
      return;
    }
    // Simulate sending request
    console.log(`Demande de modification pour Type de Travail ${editingWorkType.name} par ${user?.displayName}. Raison: ${editReason}`);
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
    // Simulate sending request
    console.log(`Demande de suppression pour Type de Travail ${deletingWorkType.name} par ${user?.displayName}. Raison: ${deleteReason}`);
    toast({
        title: "Demande Envoyée (Simulation)",
        description: `Votre demande de suppression pour "${deletingWorkType.name}" a été envoyée.`,
    });
    setDeleteReason('');
    setDeletingWorkType(null);
  };

  if (!user && isLoading) { 
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement...</p>
        </div>
    );
  }
  if (!user && !isLoading) {
    return <div className="flex justify-center items-center h-64">Veuillez vous connecter pour voir cette page.</div>;
  }


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
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Liste des Types de Travail</CardTitle>
          <CardDescription>
            Aperçu de tous les types de travail enregistrés, triés par date de création (plus récents en premier).
            Nombre de types affichés: {isLoading ? "Chargement..." : filteredWorkTypes.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Chargement des types de travail...</p>
            </div>
          ) : (
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
                   
                    <AlertDialog open={deletingWorkType?.id === wt.id && !isProcessingAction} onOpenChange={(isOpen) => {
                        if (!isOpen && !isProcessingAction) setDeletingWorkType(null);
                        setDeleteReason('');
                    }}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" onClick={() => {setDeletingWorkType(wt); setDeleteReason('');}} disabled={isProcessingAction}>
                          {isProcessingAction && deletingWorkType?.id === wt.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin"/> : <Trash2 className="mr-1 h-4 w-4" />} Supprimer
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
                          <AlertDialogCancel onClick={() => {setDeletingWorkType(null); setDeleteReason('');}} disabled={isProcessingAction}>Annuler</AlertDialogCancel>
                          <Button 
                            onClick={isAdmin ? () => handleDeleteWorkTypeDirectly(wt.id) : handleSubmitDeleteRequest}
                            variant={isAdmin ? "destructive" : "default"}
                            disabled={isProcessingAction}
                          >
                            {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isAdmin ? "Confirmer" : "Soumettre"}
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
           {!isLoading && filteredWorkTypes.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
                {searchTerm ? "Aucun type de travail ne correspond à votre recherche." : "Aucun type de travail trouvé."}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
