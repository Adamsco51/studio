
"use client";

import React, { useEffect, useState, useMemo, use } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  getBLsByClientIdFromFirestore, 
  getExpensesByBlIdFromFirestore, 
  deleteClientFromFirestore, 
  getClientByIdFromFirestore,
  getEmployeeNameFromMock,
  addApprovalRequestToFirestore,
  getUserProfile,
  getPinIssuedRequestForEntity, 
  completeApprovalRequestWithPin 
} from '@/lib/mock-data';
import type { Client, BillOfLading, Expense, ApprovalRequest } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Edit, FileText, PlusCircle, DollarSign, Trash2, ArrowRight, ChevronDown, ChevronUp, UserCircle2, CalendarDays, Loader2, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import {
  AlertDialog,
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
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context'; 

interface BlWithExpenses extends BillOfLading {
    expenses: Expense[];
    balance: number;
    financialStatus: string;
    profit: boolean;
}

export default function ClientDetailPage({ params: paramsPromise }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(paramsPromise);
  const { user, isAdmin } = useAuth(); 
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBls, setIsLoadingBls] = useState(true);
  const [createdByUserDisplay, setCreatedByUserDisplay] = useState<string | null>(null);
  const [clientBLsWithDetails, setClientBLsWithDetails] = useState<BlWithExpenses[]>([]); 
  const [expandedBls, setExpandedBls] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const router = useRouter();

  const [showEditRequestDialog, setShowEditRequestDialog] = useState(false);
  const [editRequestReason, setEditRequestReason] = useState('');
  const [showDeleteClientDialog, setShowDeleteClientDialog] = useState(false);
  const [deleteClientReason, setDeleteClientReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [activePinRequest, setActivePinRequest] = useState<ApprovalRequest | null>(null);
  const [pinActionType, setPinActionType] = useState<'edit' | 'delete' | null>(null);


  useEffect(() => {
    if (!clientId || !user) { 
      setIsLoading(false);
      setIsLoadingBls(false);
      return;
    }
    const fetchClientDetails = async () => {
      setIsLoading(true);
      setIsLoadingBls(true);
      try {
        const foundClient = await getClientByIdFromFirestore(clientId);
        setClient(foundClient);
        if (foundClient) {
          const bls = await getBLsByClientIdFromFirestore(foundClient.id);
          
          const blsWithFullDetails = await Promise.all(bls.map(async (bl) => {
            const expenses = await getExpensesByBlIdFromFirestore(bl.id);
            const totalExpenseAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
            const balance = bl.allocatedAmount - totalExpenseAmount;
            return { 
                ...bl, 
                expenses, 
                balance, 
                financialStatus: balance >= 0 ? 'Bénéfice' : 'Perte',
                profit: balance >= 0
            };
          }));

          setClientBLsWithDetails(blsWithFullDetails);
          setIsLoadingBls(false);

          if (foundClient.createdByUserId) {
            const creatorProfile = await getUserProfile(foundClient.createdByUserId); 
            setCreatedByUserDisplay(creatorProfile?.displayName || getEmployeeNameFromMock(foundClient.createdByUserId));
          }
        } else {
          setIsLoadingBls(false); 
          toast({ title: "Erreur", description: "Client non trouvé.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Failed to fetch client details for ID:", clientId, error);
        setClient(null); 
        setIsLoadingBls(false);
        toast({
          title: "Erreur de Chargement",
          description: "Impossible de charger les détails du client.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchClientDetails();
  }, [clientId, user, toast]);

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

  const handleEditClientAction = async () => {
    if (!client || !user) return;
    if (isAdmin) {
      router.push(`/clients/${client.id}/edit`);
    } else {
      setIsProcessingRequest(true);
      try {
        const pinRequest = await getPinIssuedRequestForEntity('client', client.id, 'edit');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setPinActionType('edit');
          setShowPinDialog(true);
        } else {
          setEditRequestReason('');
          setShowEditRequestDialog(true);
        }
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive"});
      } finally {
        setIsProcessingRequest(false);
      }
    }
  };

  const handleDeleteClientAction = async () => {
    if (!client || !user) return;
    if (isAdmin) {
      setShowDeleteClientDialog(true); 
    } else {
      setIsProcessingRequest(true);
      try {
        const pinRequest = await getPinIssuedRequestForEntity('client', client.id, 'delete');
        if (pinRequest) {
          setActivePinRequest(pinRequest);
          setPinActionType('delete');
          setShowPinDialog(true);
        } else {
          setDeleteClientReason('');
          setShowDeleteClientDialog(true); 
        }
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de vérifier les PINs existants.", variant: "destructive"});
      } finally {
        setIsProcessingRequest(false);
      }
    }
  };

  const handlePinSubmit = async () => {
    if (!pinEntry.trim() || !activePinRequest || !pinActionType || !client) {
      toast({ title: "Erreur", description: "PIN requis ou informations manquantes.", variant: "destructive" });
      return;
    }
    if (pinEntry !== activePinRequest.pinCode) {
      toast({ title: "Erreur PIN", description: "Le PIN saisi est incorrect.", variant: "destructive" });
      return;
    }
    if (activePinRequest.pinExpiresAt && new Date() > new Date(activePinRequest.pinExpiresAt)) {
        toast({ title: "Erreur PIN", description: "Le PIN a expiré.", variant: "destructive" });
        setShowPinDialog(false);
        setPinEntry('');
        setActivePinRequest(null);
        return;
    }

    setIsProcessingRequest(true);
    try {
      if (pinActionType === 'edit') {
        await completeApprovalRequestWithPin(activePinRequest.id);
        toast({ title: "PIN Validé", description: "Redirection vers la page de modification." });
        router.push(`/clients/${client.id}/edit`);
      } else if (pinActionType === 'delete') {
        await deleteClientFromFirestore(client.id);
        await completeApprovalRequestWithPin(activePinRequest.id);
        toast({ title: "Client Supprimé", description: `Le client ${client.name} a été supprimé avec succès via PIN.` });
        router.push('/clients');
        router.refresh();
      }
      setShowPinDialog(false);
      setPinEntry('');
      setActivePinRequest(null);
    } catch (error) {
      console.error(`Erreur lors de l'action ${pinActionType} avec PIN:`, error);
      toast({ title: "Erreur", description: `Échec de l'action ${pinActionType} avec PIN.`, variant: "destructive" });
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const handleDeleteClientWithConfirmation = async () => {
    if (!client || !client.id || !isAdmin) return;
    setIsDeleting(true);
    try {
      await deleteClientFromFirestore(client.id); 
      toast({
        title: "Client Supprimé",
        description: `Le client ${client.name} a été supprimé.`,
      });
      router.push('/clients');
      router.refresh(); 
    } catch (error) {
      console.error("Failed to delete client:", error);
      toast({ title: "Erreur", description: "Échec de la suppression du client.", variant: "destructive"});
    } finally {
      setIsDeleting(false);
      setShowDeleteClientDialog(false);
    }
  };

  const handleSubmitEditRequest = async () => {
    if (!editRequestReason.trim() || !user || !client) {
      toast({ title: "Erreur", description: "Veuillez fournir une raison et être connecté.", variant: "destructive" });
      return;
    }
    setIsProcessingRequest(true);
    try {
        await addApprovalRequestToFirestore({
            requestedByUserId: user.uid,
            requestedByUserName: user.displayName || user.email || "Utilisateur inconnu",
            entityType: 'client',
            entityId: client.id,
            entityDescription: `Client: ${client.name}`,
            actionType: 'edit',
            reason: editRequestReason,
        });
        toast({
            title: "Demande Enregistrée",
            description: "Votre demande de modification du client a été enregistrée et est en attente d'approbation.",
        });
        setEditRequestReason('');
        setShowEditRequestDialog(false);
    } catch (error) {
        console.error("Failed to submit edit request for client:", error);
        toast({ title: "Erreur", description: "Échec de l'envoi de la demande de modification.", variant: "destructive" });
    } finally {
        setIsProcessingRequest(false);
    }
  };

  const handleSubmitDeleteClientRequest = async () => {
    if (!deleteClientReason.trim() || !user || !client) {
        toast({ title: "Erreur", description: "Veuillez fournir une raison et être connecté.", variant: "destructive" });
        return;
    }
    setIsProcessingRequest(true);
    try {
        await addApprovalRequestToFirestore({
            requestedByUserId: user.uid,
            requestedByUserName: user.displayName || user.email || "Utilisateur inconnu",
            entityType: 'client',
            entityId: client.id,
            entityDescription: `Client: ${client.name}`,
            actionType: 'delete',
            reason: deleteClientReason,
        });
        toast({
            title: "Demande Enregistrée",
            description: "Votre demande de suppression de client a été enregistrée et est en attente d'approbation.",
        });
        setDeleteClientReason('');
        setShowDeleteClientDialog(false);
    } catch (error) {
        console.error("Failed to submit delete client request:", error);
        toast({ title: "Erreur", description: "Échec de l'envoi de la demande de suppression.", variant: "destructive" });
    } finally {
        setIsProcessingRequest(false);
    }
  };


  if (isLoading || (!client && isLoading)) { 
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
        <p className="text-xl text-muted-foreground">Client non trouvé ou erreur de chargement.</p>
        <Link href="/clients" passHref>
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des clients
          </Button>
        </Link>
      </div>
    );
  }

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

            <Button variant="outline" onClick={handleEditClientAction} disabled={isProcessingRequest || isDeleting}>
              {(isProcessingRequest && pinActionType === 'edit') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Edit className="mr-2 h-4 w-4" /> Modifier
            </Button>
            
            <Button variant="destructive" onClick={handleDeleteClientAction} disabled={isProcessingRequest || isDeleting}>
              {(isDeleting && isAdmin) || (isProcessingRequest && pinActionType === 'delete') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-4 mb-4">
                <Image src={`https://placehold.co/80x80.png?text=${client.name.substring(0,2)}`} alt={client.name} width={80} height={80} className="rounded-full border" data-ai-hint="company logo"/>
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
                    <span>Créé le: {client.createdAt ? format(parseISO(client.createdAt), 'dd MMMM yyyy, HH:mm', { locale: fr }) : 'N/A'}</span>
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
              <CardDescription>Liste des BLs gérés pour ce client. Cliquez sur une ligne pour voir les dépenses.</CardDescription>
            </div>
             <Link href={`/bls/add?clientId=${client.id}`} passHref>
                <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Nouveau BL
                </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingBls ? (
                 <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="ml-2 text-muted-foreground">Chargement des BLs...</p>
                </div>
            ) : clientBLsWithDetails.length > 0 ? (
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
                  {clientBLsWithDetails.map((bl) => {
                    const isExpanded = expandedBls.has(bl.id);
                    return (
                      <React.Fragment key={bl.id}>
                        <TableRow onClick={() => toggleBlExpansion(bl.id)} className="cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20">
                          <TableCell className="font-medium">{bl.blNumber}</TableCell>
                          <TableCell>{bl.allocatedAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</TableCell>
                          <TableCell className={bl.profit ? 'text-green-600' : 'text-red-600'}>
                            {bl.balance.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={bl.profit ? 'default' : 'destructive'} className={bl.profit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }>{bl.financialStatus}</Badge>
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
                                {bl.expenses.length > 0 ? (
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
                                      {bl.expenses.map(exp => (
                                        <TableRow key={exp.id} className="hover:bg-muted/5 dark:hover:bg-muted/10">
                                          <TableCell>{exp.label}</TableCell>
                                          <TableCell>{format(parseISO(exp.date), 'dd MMM yyyy, HH:mm', { locale: fr })}</TableCell>
                                          <TableCell>{getEmployeeNameFromMock(exp.employeeId)}</TableCell>
                                          <TableCell className="text-right">{exp.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</TableCell>
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

      {/* Edit Request Dialog (for non-admins) */}
      <Dialog open={showEditRequestDialog} onOpenChange={setShowEditRequestDialog}>
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
              disabled={isProcessingRequest}
            />
          </div>
          <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isProcessingRequest}>Annuler</Button>
              </DialogClose>
            <Button type="button" onClick={handleSubmitEditRequest} disabled={isProcessingRequest || !editRequestReason.trim()}>
                {isProcessingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Soumettre la Demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation / Request Dialog */}
      <AlertDialog open={showDeleteClientDialog} onOpenChange={(isOpen) => {
          if (!isOpen) setDeleteClientReason('');
          setShowDeleteClientDialog(isOpen);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
                {isAdmin ? "Êtes-vous sûr de vouloir supprimer ce client ?" : "Demande de Suppression de Client"}
            </AlertDialogTitle>
            {isAdmin ? (
              <AlertDialogDescription>
                Cette action est irréversible et supprimera le client "{client?.name}". Les BLs associés pourraient être affectés ou nécessiter une suppression manuelle.
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
                  disabled={isProcessingRequest}
                />
                  <p className="text-xs text-muted-foreground">Votre demande sera examinée par un administrateur.</p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setDeleteClientReason(''); setShowDeleteClientDialog(false);}} disabled={isDeleting || isProcessingRequest}>Annuler</AlertDialogCancel>
            <Button 
              onClick={isAdmin ? handleDeleteClientWithConfirmation : handleSubmitDeleteClientRequest} 
              disabled={isDeleting || isProcessingRequest || (!isAdmin && !deleteClientReason.trim())}
              variant={isAdmin ? "destructive" : "default"}
            >
              {(isDeleting || isProcessingRequest) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAdmin ? "Confirmer Suppression" : "Soumettre la Demande"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Entry Dialog */}
      <Dialog open={showPinDialog} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setPinEntry('');
          setActivePinRequest(null);
          setPinActionType(null);
        }
        setShowPinDialog(isOpen);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <KeyRound className="mr-2 h-5 w-5 text-primary" /> Saisir le PIN
            </DialogTitle>
            <DialogDescription>
              Un PIN vous a été fourni par un administrateur pour effectuer cette action : {pinActionType === 'edit' ? 'Modifier' : 'Supprimer'} Client "{client?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="pinCode">Code PIN (6 chiffres)</Label>
            <Input
              id="pinCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pinEntry}
              onChange={(e) => setPinEntry(e.target.value.replace(/\D/g, '').substring(0,6))}
              placeholder="123456"
              disabled={isProcessingRequest}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessingRequest}>Annuler</Button>
            </DialogClose>
            <Button onClick={handlePinSubmit} disabled={isProcessingRequest || pinEntry.length !== 6}>
              {isProcessingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Valider le PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
