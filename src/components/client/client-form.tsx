
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Client } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { MOCK_USERS, addClientToFirestore, updateClientInFirestore } from "@/lib/mock-data"; // Updated functions
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { UserCircle2, CalendarDays, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";

const clientFormSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères." }),
  contactPerson: z.string().min(2, { message: "Le nom du contact doit contenir au moins 2 caractères." }),
  email: z.string().email({ message: "Veuillez entrer une adresse email valide." }),
  phone: z.string().min(8, { message: "Le numéro de téléphone doit être valide." }),
  address: z.string().min(5, { message: "L'adresse doit contenir au moins 5 caractères." }),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  initialData?: Client | null;
}

export function ClientForm({ initialData }: ClientFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: initialData || {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  const createdByMockUserName = initialData?.createdByUserId
    ? MOCK_USERS.find(u => u.id === initialData.createdByUserId)?.name || 
      (user?.uid === initialData.createdByUserId ? user.displayName || user.email : "Utilisateur Système")
    : user?.displayName || "Utilisateur Actuel";

  async function onSubmit(data: ClientFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté pour effectuer cette action.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      if (initialData) {
        await updateClientInFirestore(initialData.id, data);
      } else {
        const clientDataForFirestore = {
          ...data,
          createdByUserId: user.uid,
        };
        await addClientToFirestore(clientDataForFirestore);
      }
      
      toast({
        title: initialData ? "Client Modifié" : "Client Créé",
        description: `Le client ${data.name} a été ${initialData ? 'modifié' : 'enregistré'} avec succès.`,
      });
      router.push("/clients");
      router.refresh(); // Important to re-fetch data on the list page
    } catch (error) {
      console.error("Failed to save client:", error);
      toast({
        title: "Erreur",
        description: `Échec de la sauvegarde du client. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{initialData ? "Modifier le Client" : "Ajouter un Nouveau Client"}</CardTitle>
      </CardHeader>
      <CardContent>
        {initialData && initialData.createdAt && (
          <div className="mb-6 space-y-3 p-4 border rounded-md bg-muted/30">
            <div className="flex items-center text-sm text-muted-foreground">
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Créé le: {format(new Date(initialData.createdAt), 'dd MMMM yyyy, HH:mm', { locale: fr })}</span>
            </div>
            {createdByMockUserName && (
                <div className="flex items-center text-sm text-muted-foreground">
                    <UserCircle2 className="mr-2 h-4 w-4" />
                    <span>Créé par: {createdByMockUserName}</span>
                </div>
            )}
            <Separator />
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'entreprise</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Global Imports Inc." {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personne à contacter</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: John Doe" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Ex: contact@example.com" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: +1-555-1234" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 123 Main St, Anytown, USA" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Sauvegarder" : "Ajouter le Client"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
