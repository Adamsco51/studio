
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
import type { Truck, TruckStatus } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { addTruckToFirestore, updateTruckInFirestore, getEmployeeNameFromMock } from "@/lib/mock-data";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { Loader2, CalendarDays, UserCircle2 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from "@/components/ui/separator";

const truckStatusOptions: { value: TruckStatus; label: string }[] = [
  { value: "available", label: "Disponible" },
  { value: "in_transit", label: "En Transit" },
  { value: "maintenance", label: "En Maintenance" },
  { value: "out_of_service", label: "Hors Service" },
];

const truckFormSchema = z.object({
  registrationNumber: z.string().min(3, { message: "Le numéro d'immatriculation doit contenir au moins 3 caractères." }),
  model: z.string().optional(),
  capacity: z.string().optional(),
  status: z.enum(["available", "in_transit", "maintenance", "out_of_service"], {
    required_error: "Veuillez sélectionner un statut pour le camion.",
  }),
  notes: z.string().optional(),
});

type TruckFormValues = z.infer<typeof truckFormSchema>;

interface TruckFormProps {
  initialData?: Truck | null;
}

export function TruckForm({ initialData }: TruckFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TruckFormValues>({
    resolver: zodResolver(truckFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      model: initialData.model || "",
      capacity: initialData.capacity || "",
      notes: initialData.notes || "",
    } : {
      registrationNumber: "",
      model: "",
      capacity: "",
      status: "available",
      notes: "",
    },
  });

  const createdByUserName = initialData?.createdByUserId
    ? getEmployeeNameFromMock(initialData.createdByUserId)
    : user?.displayName || "Utilisateur Actuel";


  async function onSubmit(data: TruckFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const truckPayload = {
      ...data,
      // currentDriverId and currentDriverName will be managed separately
    };

    try {
      if (initialData && initialData.id) {
        await updateTruckInFirestore(initialData.id, truckPayload);
        toast({ title: "Camion Modifié", description: `Le camion ${data.registrationNumber} a été modifié.` });
      } else {
        await addTruckToFirestore({ ...truckPayload, createdByUserId: user.uid });
        toast({ title: "Camion Ajouté", description: `Le camion ${data.registrationNumber} a été ajouté.` });
      }
      router.push("/trucks");
      router.refresh();
    } catch (error) {
      console.error("Failed to save truck:", error);
      toast({
        title: "Erreur de Sauvegarde",
        description: `Échec de la sauvegarde du camion. ${error instanceof Error ? error.message : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{initialData ? "Modifier le Camion" : "Ajouter un Nouveau Camion"}</CardTitle>
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
              name="registrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro d'Immatriculation</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: DK-1234-AB" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modèle (Optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Renault Premium 420" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacité (Optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 1x40ft ou 2x20ft, 30 Tonnes" {...field} disabled={isSubmitting} />
                  </FormControl>
                   <FormDescription>Décrivez la capacité de chargement du camion.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut du Camion</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un statut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {truckStatusOptions.map((option) => (
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
                      placeholder="Informations additionnelles sur le camion..."
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
                {initialData ? "Sauvegarder" : "Ajouter le Camion"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
