
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MOCK_BILLS_OF_LADING, 
  MOCK_EXPENSES, 
  MOCK_USERS, 
  deleteClientFromFirestore, // Use Firestore function
  getClientByIdFromFirestore // Use Firestore function
} from '@/lib/mock-data';
import type { Client, BillOfLading, Expense, User as MockUser } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Edit, FileText, PlusCircle, DollarSign, Trash2, ArrowRight, ChevronDown, ChevronUp, UserCircle2, CalendarDays, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context'; 

export default function ClientDetailPage({ params: paramsPromise }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = React.use(paramsPromise);
  const { user, isAdmin } = useAuth(); 
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createdByUserDisplay, setCreatedByUserDisplay] = useState<string | null>(null);
  const [clientBLs, setClientBLs] = useState<BillOfLading[]>([]); // Still from mock for now
  const [expandedBls, setExpandedBls] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const router = useRouter();

  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [deleteClientReason, setDeleteClientReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setIsLoading(false);
      return;
    }
    const fetchClientDetails = async () => {
      setIsLoading(true);
      try {
        const foundClient = await getClientByIdFromFirestore(clientId);
        setClient(foundClient);
        if (foundClient) {
          // BLs are still from mock, filter them based on the fetched client's ID
          const bls = MOCK_BILLS_OF_LADING.filter(bl => bl.clientId === foundClient.id);
          setClientBLs(bls);
          if (foundClient.createdByUserId) {
            const mockCreator = MOCK_USERS.find(u => u.id === foundClient.createdByUserId);
             if (mockCreator) {
              setCreatedByUserDisplay(mockCreator.name);
            } else if (user && user.uid === foundClient.createdByUserId) {
              setCreatedByUserDisplay(user.displayName || user.email);
            } else {
                setCreatedByUserDisplay("Utilisateur Système");
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch client details:", error);
        setClient(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClientDetails();
  }, [clientId, user]);

  const toggleBlExpansion = (blId: string) => {
    setExpandedBls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blId)) {
        newSet.delete(blId);
      } else {
        newSet.add(blId);
      }
      return newSet;
    });
  };

  const getEmployeeName = (employeeId: string): string => {
    const mockEmployee = MOCK_USERS.find(u => u.id === employeeId);
    if (mockEmployee) return mockEmployee.name;
    if (user && user.uid === employeeId) return user.displayName || user.email || 'Employé Actuel';
    return 'Inconnu';
  };

  const handleDeleteClient = async () => {
    if (!client || !client.id) return;
    setIsDeleting(true);
    try {
      await deleteClientFromFirestore(client.id);
      toast({
        title: "Client Supprimé",
        description: `Le client ${client.name} a été supprimé.`,
      });
      router.push('/clients');
      router.refresh(); // Important to re-fetch on clients list page
    } catch (error) {
      console.error("Failed to delete client:", error);
      toast({ title: "Erreur", description: "Échec de la suppression du client.", variant: "destructive"});
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitEditRequest = () => {
    if (!editRequestReason.trim()) {
      toast({ title: "Erreur", description: "Veuillez fournir une raison pour la modification.", variant: "destructive" });
      return;
    }
    console.log(`Demande de modification pour Client ${client?.name} par ${user?.displayName}. Raison: ${editRequestReason}`);
    toast({
      title: "Demande Envoyée (Simulation)",
      description: "Votre demande de modification du client a été envoyée à l'administrateur pour approbation.",
    });
    setEditRequestReason('');
    setShowEditRequestDialog(false);
  };

  const handleSubmitDeleteClientRequest = () => {
    if (!deleteClientReason.trim()) {
        toast({ title: "Erreur", description: "Veuillez fournir une raison pour la suppression.", variant: "destructive" });
        return;
    }
    // This is a simulation, no actual backend call for request
    console.log(`Demande de suppression pour Client ${client?.name} par ${user?.displayName}. Raison: ${deleteClientReason}`);
    toast({
        title: "Demande Envoyée (Simulation)",
        description: "Votre demande de suppression de client a été envoyée à l'administrateur pour approbation.",
    });
    setDeleteClientReason('');
    // Close the dialog manually if it's an AlertDialog that doesn't auto-close on action
    // For simplicity, the AlertDialog will close via its Cancel or Action buttons.
  };


  if (isLoading || (!client && !user)) { 
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Chargement des détails du client...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Client non trouvé.</p>
        <Link href="/clients" passHref>
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des clients
          </Button>
        </Link>
      </div>
    );
  }


  const calculateBlBalanceAndStatus = (blId: string) => {
    const bl = MOCK_BILLS_OF_LADING.find(b => b.id === blId);
    if (!bl) return { balance: 0, status: 'N/A', profit: false };
    const expensesForBl = MOCK_EXPENSES.filter(exp => exp.blId === blId);
    const totalExpenseAmount = expensesForBl.reduce((sum, exp) => sum + exp.amount, 0);
    const balance = bl.allocatedAmount - totalExpenseAmount;
    return { balance, status: balance >= 0 ? 'Bénéfice' : 'Perte', profit: balance >= 0 };
  };

  return (
    <>
      <PageHeader
        title={client.name}
        description={`Détails et historique pour ${client.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/clients" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
            </Link>

            {isAdmin ? (
              <Link href={`/clients/${client.id}/edit`} passHref>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" /> Modifier
                </Button>
              </Link>
            ) : (
              <Dialog open={showEditRequestDialog} onOpenChange={setShowEditRequestDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => setEditRequestReason('')}>
                    <Edit className="mr-2 h-4 w-4" /> Modifier
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Demande de Modification du Client</DialogTitle>
                    <DialogDescription>
                      Veuillez expliquer pourquoi vous souhaitez modifier ce client. Votre demande sera examinée par un administrateur.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="editReasonClient">Raison de la demande :</Label>
                    <Textarea
                      id="editReasonClient"
                      placeholder="Ex: Correction de l'adresse email, mise à jour du contact..."
                      value={editRequestReason}
                      onChange={(e) => setEditRequestReason(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <DialogFooter>
                     <DialogClose asChild>
                       <Button type="button" variant="outline">Annuler</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSubmitEditRequest}>Soumettre la Demande</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" onClick={() => { if(!isAdmin) setDeleteClientReason(''); }}>
                  {isDeleting && isAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                     {isAdmin ? "Êtes-vous sûr de vouloir supprimer ce client ?" : "Demande de Suppression de Client"}
                  </AlertDialogTitle>
                  {isAdmin ? (
                    <AlertDialogDescription>
                      Cette action est irréversible et supprimera le client "{client.name}". Les BLs et dépenses associés devront être gérés manuellement ou via des fonctions serveur.
                    </AlertDialogDescription>
                  ) : (
                     <div className="space-y-2 py-2 text-left">
                      <Label htmlFor="deleteClientReason">Raison de la demande de suppression :</Label>
                      <Textarea
                        id="deleteClientReason"
                        placeholder="Expliquez pourquoi vous souhaitez supprimer ce client..."
                        value={deleteClientReason}
                        onChange={(e) => setDeleteClientReason(e.target.value)}
                        className="min-h-[100px]"
                      />
                       <p className="text-xs text-muted-foreground">Votre demande sera examinée par un administrateur.</p>
                    </div>
                  )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteClientReason('')} disabled={isDeleting && isAdmin}>Annuler</AlertDialogCancel>
                  <Button 
                    onClick={isAdmin ? handleDeleteClient : handleSubmitDeleteClientRequest} 
                    disabled={isDeleting && isAdmin}
                    variant={isAdmin ? "destructive" : "default"}
                  >
                    {isDeleting && isAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isAdmin ? "Confirmer Suppression" : "Soumettre la Demande"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-4 mb-4">
                <Image src={`https://placehold.co/80x80.png`} alt={client.name} width={80} height={80} className="rounded-full border" data-ai-hint="company logo"/>
                <div>
                    <CardTitle className="text-2xl">{client.name}</CardTitle>
                    <CardDescription>ID: {client.id}</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Contact Principal</h4>
              <p>{client.contactPerson}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Email</h4>
              <p className="text-primary hover:underline">
                <a href={`mailto:${client.email}`}>{client.email}</a>
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Téléphone</h4>
              <p>{client.phone}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground">Adresse</h4>
              <p>{client.address}</p>
            </div>
            <Separator className="my-4"/>
            <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Informations de création</h4>
                <div className="flex items-center text-sm text-muted-foreground mb-1">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    <span>Créé le: {format(new Date(client.createdAt), 'dd MMMM yyyy, HH:mm', { locale: fr })}</span>
                </div>
                {createdByUserDisplay && (
                    <div className="flex items-center text-sm text-muted-foreground">
                        <UserCircle2 className="mr-2 h-4 w-4" />
                        <span>Créé par: {createdByUserDisplay}</span>
                    </div>
                )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Connaissements (BLs) Associés</CardTitle>
              <CardDescription>Liste des BLs gérés pour ce client. Cliquez sur une ligne pour voir les dépenses. (Données BLs encore mockées)</CardDescription>
            </div>
             <Link href={`/bls/add?clientId=${client.id}`} passHref>
                <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Nouveau BL
                </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {clientBLs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° BL</TableHead>
                    <TableHead>Montant Alloué</TableHead>
                    <TableHead>Solde</TableHead>
                    <TableHead>Statut Financier</TableHead>
                    <TableHead className="text-right w-[120px]">Actions BL</TableHead>
                    <TableHead className="text-center w-[80px]">Dépenses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientBLs.map((bl) => {
                    const { balance, status: financialStatus, profit } = calculateBlBalanceAndStatus(bl.id);
                    const blExpenses = MOCK_EXPENSES.filter(exp => exp.blId === bl.id);
                    const isExpanded = expandedBls.has(bl.id);

                    return (
                      <React.Fragment key={bl.id}>
                        <TableRow onClick={() => toggleBlExpansion(bl.id)} className="cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20">
                          <TableCell className="font-medium">{bl.blNumber}</TableCell>
                          <TableCell>{bl.allocatedAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                          <TableCell className={profit ? 'text-green-600' : 'text-red-600'}>
                            {balance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={profit ? 'default' : 'destructive'} className={profit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }>{financialStatus}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/bls/${bl.id}`} passHref onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                Détails <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            {isExpanded ? <ChevronUp className="h-5 w-5 mx-auto text-primary" /> : <ChevronDown className="h-5 w-5 mx-auto text-muted-foreground" />}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/10 dark:bg-muted/5">
                            <TableCell colSpan={6} className="p-0">
                              <div className="p-4 border-t border-border">
                                <h4 className="text-md font-semibold mb-3 text-foreground">Dépenses pour BL N° {bl.blNumber}</h4>
                                {blExpenses.length > 0 ? (
                                  <Table className="bg-card shadow-sm rounded-md">
                                    <TableHeader>
                                      <TableRow className="bg-muted/50 dark:bg-muted/20">
                                        <TableHead className="text-foreground">Libellé</TableHead>
                                        <TableHead className="text-foreground">Date</TableHead>
                                        <TableHead className="text-foreground">Employé</TableHead>
                                        <TableHead className="text-right text-foreground">Montant</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {blExpenses.map(exp => (
                                        <TableRow key={exp.id} className="hover:bg-muted/5 dark:hover:bg-muted/10">
                                          <TableCell>{exp.label}</TableCell>
                                          <TableCell>{format(new Date(exp.date), 'dd MMM yyyy, HH:mm', { locale: fr })}</TableCell>
                                          <TableCell>{getEmployeeName(exp.employeeId)}</TableCell>
                                          <TableCell className="text-right">{exp.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <div className="text-center py-4">
                                    <DollarSign className="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
                                    <p className="mt-2 text-sm text-muted-foreground">Aucune dépense enregistrée pour ce BL.</p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">Aucun connaissement (BL) associé à ce client pour le moment.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
