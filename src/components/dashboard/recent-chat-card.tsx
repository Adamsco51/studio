
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MOCK_CHAT_MESSAGES, MOCK_USERS } from '@/lib/mock-data';
import type { ChatMessage, User } from '@/lib/types';
import Link from 'next/link';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const getInitials = (name: string) => {
  const names = name.split(' ');
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

const MAX_MESSAGES_TO_SHOW = 4;

export function RecentChatCard() {
  const [recentMessages, setRecentMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Ensure messages are sorted by timestamp (newest first for slicing, then reverse for display)
    const sortedMessages = [...MOCK_CHAT_MESSAGES].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentMessages(sortedMessages.slice(0, MAX_MESSAGES_TO_SHOW).reverse());
  }, []); // Run once on mount to get client-side evaluated mock data

  if (recentMessages.length === 0) {
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
          <p className="text-muted-foreground text-sm text-center py-4">Aucune discussion récente.</p>
        </CardContent>
        <CardFooter>
          <Link href="/chat" passHref className="w-full">
            <Button variant="outline" className="w-full">
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
        <ScrollArea className="h-[200px] pr-3"> {/* Adjust height as needed */}
          {recentMessages.map((msg, index) => {
            const sender = MOCK_USERS.find(u => u.id === msg.senderId);
            return (
              <React.Fragment key={msg.id}>
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(sender?.name || '??')}`} alt={sender?.name} data-ai-hint="user initial"/>
                    <AvatarFallback>{getInitials(sender?.name || '??')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <p className="text-xs font-semibold">{sender?.name || 'Utilisateur Inconnu'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(parseISO(msg.timestamp), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{msg.text}</p>
                  </div>
                </div>
                {index < recentMessages.length - 1 && <Separator className="my-2" />}
              </React.Fragment>
            );
          })}
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
