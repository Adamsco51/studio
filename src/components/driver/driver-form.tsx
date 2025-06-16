
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Driver, DriverStatus } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { addDriverToFirestore, updateDriverInFirestore, getEmployeeNameFromMock } from "@/lib/mock-data";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { Loader2, CalendarDays, UserCircle2 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from "@/components/ui/separator";

const driverStatusOptions: { value: DriverStatus; label: string }[] = [
  { value: "available", label: "Disponible" },
  { value: "on_trip", label: "En Voyage" },
  { value: "off_duty", label: "En Repos" },
  { value: "unavailable", label: "Indisponible" },
];

const driverFormSchema = z.object({
  name: z.string().min(3, { message: "Le nom du chauffeur doit contenir au moins 3 caractères." }),
  licenseNumber: z.string().min(5, { message: "Le numéro de permis doit être valide." }),
  phone: z.string().min(8, { message: "Le numéro de téléphone doit être valide." }),
  status: z.enum(["available", "on_trip", "off_duty", "unavailable"], {
    required_error: "Veuillez sélectionner un statut pour le chauffeur.",
  }),
  notes: z.string().optional(),
  // currentTruckId and currentTruckReg are not directly managed here for simplicity
});

type DriverFormValues = z.infer<typeof driverFormSchema>;

interface DriverFormProps {
  initialData?: Driver | null;
}

export function DriverForm({ initialData }: DriverFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      notes: initialData.notes || "",
    } : {
      name: "",
      licenseNumber: "",
      phone: "",
      status: "available",
      notes: "",
    },
  });

  const createdByUserName = initialData?.createdByUserId
    ? getEmployeeNameFromMock(initialData.createdByUserId)
    : user?.displayName || "Utilisateur Actuel";


  async function onSubmit(data: DriverFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const driverPayload = {
      ...data,
      // currentTruckId and currentTruckReg will be managed by a separate assignment process
      // For now, ensure they are not accidentally overwritten if not present in form values
      currentTruckId: initialData?.currentTruckId || null,
      currentTruckReg: initialData?.currentTruckReg || null,
    };

    try {
      if (initialData && initialData.id) {
        await updateDriverInFirestore(initialData.id, driverPayload);
        toast({ title: "Chauffeur Modifié", description: `Les informations de ${data.name} ont été modifiées.` });
      } else {
        await addDriverToFirestore({ ...driverPayload, createdByUserId: user.uid });
        toast({ title: "Chauffeur Ajouté", description: `Le chauffeur ${data.name} a été ajouté.` });
      }
      router.push("/drivers");
      router.refresh();
    } catch (error) {
      console.error("Failed to save driver:", error);
      toast({
        title: "Erreur de Sauvegarde",
        description: `Échec de la sauvegarde du chauffeur. ${error instanceof Error ? error.message : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{initialData ? "Modifier le Chauffeur" : "Ajouter un Nouveau Chauffeur"}</CardTitle>
      </CardHeader>
      <CardContent>
         {initialData && initialData.createdAt && (
          <div className="mb-6 space-y-3 p-4 border rounded-md bg-muted/30">
            <div className="flex items-center text-sm text-muted-foreground">
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Créé le: {format(parseISO(initialData.createdAt), 'dd MMMM yyyy, HH:mm', { locale: fr })}</span>
            </div>
            {createdByUserName && (
                <div className="flex items-center text-sm text-muted-foreground">
                    <UserCircle2 className="mr-2 h-4 w-4" />
                    <span>Créé par: {createdByUserName}</span>
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
                  <FormLabel>Nom Complet du Chauffeur</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Moussa Sow" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de Permis de Conduire</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: P123456789" {...field} disabled={isSubmitting} />
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
                  <FormLabel>Numéro de Téléphone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Ex: +221 77 123 45 67" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut du Chauffeur</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un statut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {driverStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informations additionnelles sur le chauffeur..."
                      {...field}
                      disabled={isSubmitting}
                    />
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
                {initialData ? "Sauvegarder" : "Ajouter le Chauffeur"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
