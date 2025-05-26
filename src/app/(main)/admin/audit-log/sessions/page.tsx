
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSessionAuditEvents } from '@/lib/mock-data';
import type { SessionAuditEvent } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, LogIn, LogOut, History } from 'lucide-react';

export default function SessionAuditLogPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [auditEvents, setAuditEvents] = useState<SessionAuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard'); 
    }
  }, [authLoading, isAdmin, router]);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const events = await getSessionAuditEvents();
      setAuditEvents(events);
    } catch (error) {
      console.error("Failed to fetch session audit events:", error);
      // Consider adding a toast notification for the error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchEvents();
    }
  }, [isAdmin, fetchEvents]);

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Chargement du journal d'audit...</p>
      </div>
    );
  }

  if (!isAdmin) {
    // This case should ideally be handled by the redirect in the first useEffect
    return <div className="text-center py-10"><p className="text-xl">Accès non autorisé.</p></div>;
  }

  return (
    <>
      <PageHeader
        title="Journal d'Audit des Sessions"
        description="Historique des connexions et déconnexions des utilisateurs."
      />
      <Card>
        <CardHeader>
          <CardTitle>Événements de Session</CardTitle>
          <CardDescription>
            {auditEvents.length > 0 
              ? `Total des événements enregistrés: ${auditEvents.length}.`
              : "Aucun événement de session enregistré pour le moment."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditEvents.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <History className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">Aucun événement à afficher.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Date et Heure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.userDisplayName || 'N/A'}</TableCell>
                    <TableCell>{event.userEmail || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1 ${event.action === 'login' ? 'text-green-600' : 'text-red-600'}`}>
                        {event.action === 'login' ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                        {event.action === 'login' ? 'Connexion' : 'Déconnexion'}
                      </span>
                    </TableCell>
                    <TableCell>{event.timestamp ? format(parseISO(event.timestamp), 'dd MMM yyyy, HH:mm:ss', { locale: fr }) : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

    