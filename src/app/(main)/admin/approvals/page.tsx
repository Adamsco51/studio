
"use client";

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getApprovalRequestsFromFirestore, updateApprovalRequestStatusInFirestore } from '@/lib/mock-data';
import type { ApprovalRequest, ApprovalRequestStatus } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, CheckCircle, XCircle, HelpCircle, Edit, Trash2, ShieldQuestion } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

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


  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard'); // Redirect non-admins
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      const fetchRequests = async () => {
        setIsLoading(true);
        try {
          // Fetch all requests, or filter by 'pending' initially
          const fetchedRequests = await getApprovalRequestsFromFirestore(); 
          setRequests(fetchedRequests);
        } catch (error) {
          console.error("Failed to fetch approval requests:", error);
          toast({ title: "Erreur", description: "Impossible de charger les demandes.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchRequests();
    }
  }, [isAdmin, toast]);

  const handleOpenConfirmationDialog = (request: ApprovalRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionToConfirm(action);
    setAdminNotes(request.adminNotes || ''); // Pre-fill notes if any
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest || !actionToConfirm) return;

    setIsProcessingAction(true);
    const newStatus = actionToConfirm === 'approve' ? 'approved' : 'rejected';
    try {
      await updateApprovalRequestStatusInFirestore(selectedRequest.id, newStatus, adminNotes);
      setRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, status: newStatus, adminNotes, processedAt: new Date().toISOString() } : r));
      toast({ title: "Demande Traitée", description: `La demande a été ${newStatus === 'approved' ? 'approuvée' : 'rejetée'}.` });
      setSelectedRequest(null);
      setActionToConfirm(null);
      setAdminNotes('');
    } catch (error) {
      console.error("Failed to process request:", error);
      toast({ title: "Erreur", description: "Échec du traitement de la demande.", variant: "destructive" });
    } finally {
      setIsProcessingAction(false);
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
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{req.requestedByUserName || req.requestedByUserId}</TableCell>
                    <TableCell>
                        <div>{getEntityTypeText(req.entityType)}</div>
                        <div className="text-xs text-muted-foreground">{req.entityDescription || req.entityId}</div>
                    </TableCell>
                    <TableCell>{getActionText(req.actionType)}</TableCell>
                    <TableCell className="max-w-xs truncate" title={req.reason}>{req.reason}</TableCell>
                    <TableCell>{format(new Date(req.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr })}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(req.status) as any} className="capitalize">
                         {req.status === 'pending' && <HelpCircle className="mr-1 h-3 w-3" />}
                         {req.status === 'approved' && <CheckCircle className="mr-1 h-3 w-3" />}
                         {req.status === 'rejected' && <XCircle className="mr-1 h-3 w-3" />}
                        {getStatusText(req.status)}
                      </Badge>
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
                         <p className="text-xs text-muted-foreground italic text-left" title={`Notes: ${req.adminNotes}`}>Traité {req.processedAt ? format(new Date(req.processedAt), 'dd/MM/yy', {locale: fr}) : ''}</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirmer : {actionToConfirm === 'approve' ? 'Approuver' : 'Rejeter'} la Demande
            </DialogTitle>
            <DialogDescription>
              Demande de {selectedRequest?.actionType === 'edit' ? 'modification' : 'suppression'} pour {getEntityTypeText(selectedRequest?.entityType || 'bl')} "{selectedRequest?.entityDescription || selectedRequest?.entityId}".<br/>
              Demandeur: {selectedRequest?.requestedByUserName}. Raison: "{selectedRequest?.reason}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="adminNotes">Notes Administrateur (Optionnel)</Label>
            <Textarea 
              id="adminNotes" 
              value={adminNotes} 
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Ajoutez des notes sur votre décision..." 
              disabled={isProcessingAction}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessingAction}>Annuler</Button>
            </DialogClose>
            <Button 
                onClick={handleProcessRequest} 
                disabled={isProcessingAction}
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
