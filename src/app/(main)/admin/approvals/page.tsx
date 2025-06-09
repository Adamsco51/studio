
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    getApprovalRequestsFromFirestore, 
    updateApprovalRequestStatusInFirestore,
    deleteBLFromFirestore,
    deleteClientFromFirestore,
    deleteExpenseFromFirestore,
    deleteWorkTypeFromFirestore,
    deleteContainerFromFirestore, // Added for container deletion
} from '@/lib/mock-data';
import type { ApprovalRequest, ApprovalRequestStatus } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { format, addHours, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, CheckCircle, XCircle, HelpCircle, ShieldQuestion, KeyRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const getStatusVariant = (status: ApprovalRequestStatus) => {
  switch (status) {
    case 'pending': return 'yellow';
    case 'approved': return 'green';
    case 'rejected': return 'red';
    case 'pin_issued': return 'blue';
    case 'completed': return 'default';
    default: return 'gray';
  }
};

const getStatusText = (status: ApprovalRequestStatus) => {
    switch (status) {
        case 'pending': return 'En attente';
        case 'approved': return 'Approuvée';
        case 'rejected': return 'Rejetée';
        case 'pin_issued': return 'PIN émis';
        case 'completed': return 'Terminée';
        default: return status;
    }
};

const getActionText = (action: ApprovalRequest['actionType']) => {
    switch (action) {
        case 'edit': return 'Modification';
        case 'delete': return 'Suppression';
        default: return action;
    }
};

const getEntityTypeText = (entityType: ApprovalRequest['entityType']) => {
    switch (entityType) {
        case 'bl': return 'Connaissement';
        case 'client': return 'Client';
        case 'workType': return 'Type de Travail';
        case 'expense': return 'Dépense';
        case 'container': return 'Conteneur'; // Added
        default: return entityType;
    }
};

export default function AdminApprovalsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionToConfirm, setActionToConfirm] = useState<'approve' | 'reject' | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [issuePin, setIssuePin] = useState(false);
  const [manualPin, setManualPin] = useState('');


  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard'); 
    }
  }, [authLoading, isAdmin, router]);

  const fetchRequests = useCallback(async () => {
    if (isAdmin) {
      setIsLoading(true);
      try {
        const fetchedRequests = await getApprovalRequestsFromFirestore(); 
        setRequests(fetchedRequests);
      } catch (error) {
        console.error("Failed to fetch approval requests:", error);
        toast({ title: "Erreur", description: "Impossible de charger les demandes.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenConfirmationDialog = (request: ApprovalRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionToConfirm(action);
    setAdminNotes(request.adminNotes || '');
    setIssuePin(false); 
    setManualPin('');   
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest || !actionToConfirm || !user) return;

    setIsProcessingAction(true);
    let newStatus: ApprovalRequestStatus = actionToConfirm === 'approve' ? 'approved' : 'rejected';
    let pinCodeToSave: string | undefined = undefined;
    let pinExpiryToSave: string | undefined = undefined; // Store as ISO string

    if (actionToConfirm === 'approve' && issuePin) {
        newStatus = 'pin_issued';
        pinCodeToSave = manualPin || Math.floor(100000 + Math.random() * 900000).toString(); 
        pinExpiryToSave = addHours(new Date(), 24).toISOString(); 
    }
    
    try {
      await updateApprovalRequestStatusInFirestore(
        selectedRequest.id, 
        newStatus, 
        adminNotes, 
        user.uid,
        pinCodeToSave,
        pinExpiryToSave, 
      );
      
      let toastMessage = `La demande a été ${getStatusText(newStatus)}.`;
      if (newStatus === 'pin_issued' && pinCodeToSave) {
        toastMessage += ` PIN: ${pinCodeToSave}`;
      }
      toast({ title: "Demande Traitée", description: toastMessage });

      if (newStatus === 'approved' && selectedRequest.actionType === 'delete' && !issuePin) { 
        try {
          let entityDeleted = false;
          if (selectedRequest.entityType === 'bl') {
            await deleteBLFromFirestore(selectedRequest.entityId);
            entityDeleted = true;
          } else if (selectedRequest.entityType === 'client') {
            await deleteClientFromFirestore(selectedRequest.entityId);
            entityDeleted = true;
          } else if (selectedRequest.entityType === 'expense') {
            await deleteExpenseFromFirestore(selectedRequest.entityId);
            entityDeleted = true;
          } else if (selectedRequest.entityType === 'workType') {
            await deleteWorkTypeFromFirestore(selectedRequest.entityId);
            entityDeleted = true;
          } else if (selectedRequest.entityType === 'container') {
            // For container, we need the blId if it's part of the description, or find it
            // This part might need refinement if blId isn't easily available
            let blIdForContainer: string | undefined;
            if (selectedRequest.entityDescription?.includes('(BL N°')) {
                const match = selectedRequest.entityDescription.match(/\(BL N°\s*([a-zA-Z0-9-]+)\)/);
                if (match && match[1]) blIdForContainer = match[1];
            }
            if (blIdForContainer) {
                await deleteContainerFromFirestore(selectedRequest.entityId, blIdForContainer);
                entityDeleted = true;
            } else {
                console.warn(`Could not determine BL ID for container deletion request: ${selectedRequest.id}`);
                toast({ title: "Attention", description: `Conteneur ${selectedRequest.entityId} approuvé pour suppression, mais BL ID non trouvé pour action automatique.`, variant: "default", duration: 7000 });
            }
          }


          if (entityDeleted) {
            toast({ title: "Action Effectuée", description: `${getEntityTypeText(selectedRequest.entityType)} (ID: ${selectedRequest.entityId}) a été supprimé(e) avec succès.` });
            await updateApprovalRequestStatusInFirestore(selectedRequest.id, 'completed', adminNotes ? `${adminNotes}\nEntité supprimée.` : 'Entité supprimée automatiquement après approbation.', user.uid);
          }
        } catch (deleteError: any) {
          console.error(`Failed to delete entity ${selectedRequest.entityType} with ID ${selectedRequest.entityId}:`, deleteError);
          toast({ title: "Erreur de Suppression d'Entité", description: `La demande a été approuvée, mais la suppression de l'entité a échoué: ${deleteError.message}. Veuillez supprimer manuellement.`, variant: "destructive", duration: 7000 });
        }
      }
      
      fetchRequests(); 
    } catch (error) {
      console.error("Failed to process request:", error);
      toast({ title: "Erreur", description: "Échec du traitement de la demande.", variant: "destructive" });
    } finally {
      setSelectedRequest(null);
      setActionToConfirm(null);
      setAdminNotes('');
      setIssuePin(false);
      setManualPin('');
      setIsProcessingAction(false);
    }
  };

  const getEntityLink = (request: ApprovalRequest) => {
    switch (request.entityType) {
      case 'bl':
        return `/bls/${request.entityId}${request.actionType === 'edit' ? '/edit' : ''}`;
      case 'client':
        return `/clients/${request.entityId}${request.actionType === 'edit' ? '/edit' : ''}`;
      case 'workType':
        return `/work-types/${request.entityId}/edit`; 
      case 'expense':
      case 'container': // Containers are also linked to a BL
        if (request.entityDescription?.includes("BL N°")) {
          const blMatch = request.entityDescription.match(/BL N°\s*([a-zA-Z0-9-]+)/);
          if (blMatch && blMatch[1]) {
            return `/bls/${blMatch[1]}`; 
          }
        }
        return null; 
      default:
        return null;
    }
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Chargement des demandes d'approbation...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="text-center py-10"><p className="text-xl">Accès non autorisé.</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Gestion des Demandes d'Approbation"
        description="Examinez et traitez les demandes de modification ou de suppression."
      />
      <Card>
        <CardHeader>
          <CardTitle>Demandes en Cours et Traitées</CardTitle>
          <CardDescription>
            {requests.length > 0 
              ? `Total des demandes: ${requests.length}. En attente: ${requests.filter(r=>r.status === 'pending').length}`
              : "Aucune demande d'approbation pour le moment."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShieldQuestion className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">Il n'y a aucune demande à traiter pour le moment.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Date Demande</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const entityLink = getEntityLink(req);
                  return (
                    <TableRow key={req.id}>
                      <TableCell>{req.requestedByUserName || req.requestedByUserId}</TableCell>
                      <TableCell>
                          <div>{getEntityTypeText(req.entityType)}</div>
                          <div className="text-xs text-muted-foreground">
                            {entityLink ? (
                                <Link href={entityLink} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" title="Voir l'entité">
                                    {req.entityDescription || req.entityId}
                                </Link>
                            ) : (
                                req.entityDescription || req.entityId
                            )}
                          </div>
                      </TableCell>
                      <TableCell>{getActionText(req.actionType)}</TableCell>
                      <TableCell className="max-w-xs truncate" title={req.reason}>{req.reason}</TableCell>
                      <TableCell>{req.createdAt ? format(parseISO(req.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr }) : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(req.status) as any} className="capitalize">
                           {req.status === 'pending' && <HelpCircle className="mr-1 h-3 w-3" />}
                           {req.status === 'approved' && <CheckCircle className="mr-1 h-3 w-3" />}
                           {req.status === 'rejected' && <XCircle className="mr-1 h-3 w-3" />}
                           {req.status === 'completed' && <CheckCircle className="mr-1 h-3 w-3 text-green-500" />}
                           {req.status === 'pin_issued' && <KeyRound className="mr-1 h-3 w-3" />}
                          {getStatusText(req.status)}
                        </Badge>
                        {req.status === 'pin_issued' && req.pinCode && (
                          <p className="text-xs text-muted-foreground italic">PIN: {req.pinCode}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === 'pending' && (
                          <div className="space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleOpenConfirmationDialog(req, 'approve')}>
                              <CheckCircle className="mr-1 h-4 w-4 text-green-500" /> Approuver
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleOpenConfirmationDialog(req, 'reject')}>
                              <XCircle className="mr-1 h-4 w-4 text-red-500" /> Rejeter
                            </Button>
                          </div>
                        )}
                        {req.status !== 'pending' && req.adminNotes && (
                           <p className="text-xs text-muted-foreground italic text-left" title={`Notes Admin: ${req.adminNotes}${req.processedByUserId ? ` (par ${req.processedByUserId.substring(0,6)}...)` : ''}`}>
                             Traité {req.processedAt ? format(parseISO(req.processedAt), 'dd/MM/yy HH:mm', { locale: fr }) : ''}
                           </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest && !!actionToConfirm} onOpenChange={(open) => {
        if (!open) {
            setSelectedRequest(null);
            setActionToConfirm(null);
            setAdminNotes('');
            setIssuePin(false);
            setManualPin('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirmer : {actionToConfirm === 'approve' ? 'Approuver' : 'Rejeter'} la Demande
            </DialogTitle>
            <DialogDescription>
              Demande de {getActionText(selectedRequest?.actionType || 'edit')} pour {getEntityTypeText(selectedRequest?.entityType || 'bl')} "{selectedRequest?.entityDescription || selectedRequest?.entityId}".<br/>
              Demandeur: {selectedRequest?.requestedByUserName}. Raison: "{selectedRequest?.reason}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2 space-y-4">
            {actionToConfirm === 'approve' && (selectedRequest?.actionType === 'edit' || selectedRequest?.actionType === 'delete' ) && ( 
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="issuePin" 
                  checked={issuePin} 
                  onCheckedChange={(checked) => setIssuePin(checked as boolean)}
                  disabled={isProcessingAction}
                />
                <Label htmlFor="issuePin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Émettre un PIN pour que l'utilisateur effectue l'action
                </Label>
              </div>
            )}
            {issuePin && actionToConfirm === 'approve' && (
              <div className="space-y-2">
                <Label htmlFor="manualPin">PIN (Optionnel - 6 chiffres auto-générés sinon)</Label>
                <Input 
                    id="manualPin" 
                    value={manualPin} 
                    onChange={(e) => setManualPin(e.target.value.replace(/\D/g,'').substring(0,6))} 
                    placeholder="Ex: 123456"
                    maxLength={6}
                    disabled={isProcessingAction}
                />
                <p className="text-xs text-muted-foreground">Le PIN expirera dans 24 heures.</p>
              </div>
            )}
            <div>
              <Label htmlFor="adminNotes">Notes Administrateur (Optionnel)</Label>
              <Textarea 
                id="adminNotes" 
                value={adminNotes} 
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ajoutez des notes sur votre décision..." 
                disabled={isProcessingAction}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessingAction}>Annuler</Button>
            </DialogClose>
            <Button 
                onClick={handleProcessRequest} 
                disabled={isProcessingAction || (issuePin && manualPin.length > 0 && manualPin.length !== 6)}
                variant={actionToConfirm === 'reject' ? 'destructive' : 'default'}
            >
              {isProcessingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionToConfirm === 'approve' ? 'Confirmer l\'Approbation' : 'Confirmer le Rejet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
