
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getChatMessagesFromFirestore } from '@/lib/mock-data'; // Use Firestore function
import type { ChatMessage } from '@/lib/types';
import Link from 'next/link';
import { MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/auth-context';

const getInitials = (name: string) => {
  if (!name) return "??";
  const names = name.split(' ');
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

const MAX_MESSAGES_TO_SHOW_DASHBOARD = 5;

export function RecentChatCard() {
  const { user } = useAuth();
  const [recentMessages, setRecentMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setRecentMessages([]);
      return;
    }
    setIsLoading(true);
    // For the dashboard, we'll use a real-time listener but limit to the last few messages.
    // Firestore's `limitToLast` is better but `onSnapshot` with client-side slicing is simpler here.
    const unsubscribe = getChatMessagesFromFirestore((allMessages) => {
      const sorted = allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentMessages(sorted.slice(0, MAX_MESSAGES_TO_SHOW_DASHBOARD).reverse());
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (isLoading && user) {
    return (
      <Card className="shadow-lg flex flex-col h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-500" />
            Dernières Discussions
          </CardTitle>
          <CardDescription>Chargement des messages...</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
         <CardFooter>
          <Link href="/chat" passHref className="w-full">
            <Button variant="outline" className="w-full" disabled>
              Aller au Chat <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }


  if (recentMessages.length === 0 && !isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-500" />
            Dernières Discussions
          </CardTitle>
          <CardDescription>Aperçu des conversations récentes de l'équipe.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-4">
            {user ? "Aucune discussion récente." : "Connectez-vous pour voir les discussions."}
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/chat" passHref className="w-full">
            <Button variant="outline" className="w-full" disabled={!user}>
              Aller au Chat <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-500" />
          Dernières Discussions
        </CardTitle>
        <CardDescription>Aperçu des conversations récentes de l'équipe.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 overflow-hidden">
        <ScrollArea className="h-[200px] pr-3"> 
          {recentMessages.map((msg, index) => (
            <React.Fragment key={msg.id}>
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 border">
                  <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(msg.senderName || '??')}`} alt={msg.senderName} data-ai-hint="user initial"/>
                  <AvatarFallback>{getInitials(msg.senderName || '??')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-semibold">{msg.senderName || 'Utilisateur Inconnu'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(msg.timestamp), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{msg.text}</p>
                </div>
              </div>
              {index < recentMessages.length - 1 && <Separator className="my-2" />}
            </React.Fragment>
          ))}
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <Link href="/chat" passHref className="w-full">
          <Button variant="outline" className="w-full">
            Voir le chat complet <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
