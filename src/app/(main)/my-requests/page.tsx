
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getApprovalRequestsByUserIdFromFirestore } from '@/lib/mock-data';
import type { ApprovalRequest, ApprovalRequestStatus } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, CheckCircle, XCircle, HelpCircle, KeyRound, ShieldQuestion, Clock } from 'lucide-react';
import Link from 'next/link';
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

export default function MyRequestsPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && isAdmin) {
      router.push('/admin/approvals');
    }
  }, [authLoading, user, isAdmin, router]);

  const fetchRequests = useCallback(async () => {
    if (user && !isAdmin) { 
      setIsLoading(true);
      try {
        const fetchedRequests = await getApprovalRequestsByUserIdFromFirestore(user.uid);
        setRequests(fetchedRequests);
      } catch (error) {
        console.error("Failed to fetch user approval requests:", error);
        toast({ title: "Erreur", description: "Impossible de charger vos demandes.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    } else if (!user && !authLoading) {
        setIsLoading(false); 
    }
  }, [user, isAdmin, toast]); 

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]); 

  const getEntityLink = (request: ApprovalRequest) => {
    switch (request.entityType) {
      case 'bl':
        return `/bls/${request.entityId}`;
      case 'client':
        return `/clients/${request.entityId}`;
      case 'workType': 
        // For work types, an edit link might be more appropriate if the action was edit
        // But for now, link to the list page if no specific ID page exists.
        return request.actionType === 'edit' ? `/work-types/${request.entityId}/edit` : `/work-types`; 
      case 'expense': 
         // For expenses, linking to the parent BL might be most useful
         if (request.entityDescription?.includes("BL N°")) {
          const blMatch = request.entityDescription.match(/BL N°\\s*([a-zA-Z0-9-]+)/);
          if (blMatch && blMatch[1]) {
            return `/bls/${blMatch[1]}`; // Link to the BL detail page
          }
        }
        // Fallback to the general expenses page if BL ID can't be parsed
        return `/expenses`;
      default:
        return null;
    }
  };


  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Chargement de vos demandes...</p>
      </div>
    );
  }

  if (!user || isAdmin) { 
    return null; 
  }

  return (
    <>
      <PageHeader
        title="Mes Demandes d'Approbation"
        description="Suivez le statut de vos demandes de modification ou de suppression."
      />
      <Card>
        <CardHeader>
          <CardTitle>Vos Demandes Soumises</CardTitle>
          <CardDescription>
            {requests.length > 0 
              ? `Vous avez ${requests.length} demande(s) enregistrée(s).`
              : "Vous n'avez aucune demande d'approbation soumise pour le moment."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShieldQuestion className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">Aucune demande à afficher.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entité</TableHead>
                    <TableHead>Action Demandée</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Date Demande</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Notes Admin</TableHead>
                    <TableHead>Date Traitement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => {
                    const entityLink = getEntityLink(req);
                    const isPinValid = req.pinCode && req.pinExpiresAt && new Date() < parseISO(req.pinExpiresAt);
                    return (
                      <TableRow key={req.id}>
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
                             {req.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                             {req.status === 'approved' && <CheckCircle className="mr-1 h-3 w-3" />}
                             {req.status === 'rejected' && <XCircle className="mr-1 h-3 w-3" />}
                             {req.status === 'completed' && <CheckCircle className="mr-1 h-3 w-3 text-green-500" />}
                             {req.status === 'pin_issued' && <KeyRound className="mr-1 h-3 w-3" />}
                            {getStatusText(req.status)}
                          </Badge>
                          {req.status === 'pin_issued' && req.pinCode && (
                            <p className={`text-xs ${isPinValid ? 'text-green-600' : 'text-red-500 line-through'} italic`}>
                              PIN: {req.pinCode} {req.pinExpiresAt && isPinValid ? `(Expire le ${format(parseISO(req.pinExpiresAt), 'dd/MM HH:mm', { locale: fr })})` : '(Expiré)'}
                            </p>
                          )}
                        </TableCell>
                         <TableCell className="max-w-xs truncate text-xs text-muted-foreground italic" title={req.adminNotes}>
                          {req.adminNotes || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {req.processedAt ? format(parseISO(req.processedAt), 'dd MMM yyyy, HH:mm', { locale: fr }) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
