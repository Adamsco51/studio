
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { BillOfLading, Client, BLStatus, WorkType } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { addBLToFirestore, updateBLInFirestore, getClientsFromFirestore, getWorkTypesFromFirestore } from "@/lib/mock-data"; 
import { useAuth } from "@/contexts/auth-context"; 
import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";

const blStatusOptions: { value: BLStatus; label: string }[] = [
  { value: "en cours", label: "En cours" },
  { value: "terminé", label: "Terminé" },
  { value: "inactif", label: "Inactif" },
];

const blFormSchema = z.object({
  blNumber: z.string().min(5, { message: "Le numéro de BL doit contenir au moins 5 caractères." }),
  clientId: z.string({ required_error: "Veuillez sélectionner un client." }),
  allocatedAmount: z.coerce.number().positive({ message: "Le montant alloué doit être positif." }),
  workTypeId: z.string({ required_error: "Veuillez sélectionner un type de travail." }),
  description: z.string().optional(),
  categories: z.string().min(1, { message: "Veuillez entrer au moins une catégorie." }), 
  status: z.enum(["en cours", "terminé", "inactif"], { required_error: "Veuillez sélectionner un statut." }),
});

type BLFormValues = z.infer<typeof blFormSchema>;

interface BLFormProps {
  initialData?: BillOfLading | null;
}

export function BLForm({ initialData }: BLFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');
  const { toast } = useToast();
  const { user } = useAuth(); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [isLoadingDropdownData, setIsLoadingDropdownData] = useState(true);

  const fetchDropdownData = useCallback(async () => {
    setIsLoadingDropdownData(true);
    try {
      const [fetchedClients, fetchedWorkTypes] = await Promise.all([
        getClientsFromFirestore(),
        getWorkTypesFromFirestore(),
      ]);
      setClients(fetchedClients);
      setWorkTypes(fetchedWorkTypes);
    } catch (error) {
      console.error("Failed to fetch clients or work types for BL form:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger les clients ou types de travail.", variant: "destructive" });
    } finally {
      setIsLoadingDropdownData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);


  const defaultCategories = initialData?.categories ? initialData.categories.join(", ") : "";

  const form = useForm<BLFormValues>({
    resolver: zodResolver(blFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        categories: defaultCategories,
        allocatedAmount: initialData.allocatedAmount || 0,
        status: initialData.status || "en cours",
        workTypeId: initialData.workTypeId || "",
    } : {
      blNumber: "",
      clientId: preselectedClientId || "",
      allocatedAmount: 0,
      workTypeId: "",
      description: "",
      categories: "",
      status: "en cours",
    },
  });

  async function onSubmit(data: BLFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté pour effectuer cette action.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const processedCategories = data.categories.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0);
    
    const blDataPayload: Omit<BillOfLading, 'id' | 'createdAt'> = {
        blNumber: data.blNumber,
        clientId: data.clientId,
        allocatedAmount: data.allocatedAmount,
        workTypeId: data.workTypeId,
        description: data.description || "",
        categories: processedCategories,
        status: data.status,
        createdByUserId: initialData ? initialData.createdByUserId : user.uid, 
    };

    try {
      if (initialData && initialData.id) {
          const updatePayload: Partial<Omit<BillOfLading, 'id' | 'createdAt' | 'createdByUserId'>> = {
            blNumber: data.blNumber,
            clientId: data.clientId,
            allocatedAmount: data.allocatedAmount,
            workTypeId: data.workTypeId,
            description: data.description || "",
            categories: processedCategories,
            status: data.status,
          };
          await updateBLInFirestore(initialData.id, updatePayload);
      } else {
          const newBLDataForFirestore = {
            ...blDataPayload,
            createdByUserId: user.uid, 
          };
          await addBLToFirestore(newBLDataForFirestore);
      }

      toast({
        title: initialData ? "BL Modifié" : "BL Créé",
        description: `Le BL N° ${data.blNumber} a été ${initialData ? 'modifié' : 'enregistré'} avec succès.`,
      });
      router.push("/bls"); 
      router.refresh();
    } catch (error) {
        console.error("Failed to save BL:", error);
        toast({
            title: "Erreur de Sauvegarde",
            description: `Échec de la sauvegarde du BL. ${error instanceof Error ? error.message : ''}`,
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  useEffect(() => {
    if (!initialData && preselectedClientId && clients.length > 0) {
      form.reset({
        ...form.getValues(),
        clientId: preselectedClientId,
      });
    }
    if (initialData) {
        form.reset({
            ...initialData,
            categories: initialData.categories ? initialData.categories.join(", ") : "",
            allocatedAmount: initialData.allocatedAmount || 0,
            status: initialData.status || "en cours",
            workTypeId: initialData.workTypeId || "",
        });
    }
  }, [preselectedClientId, initialData, clients, form]);


  return (
    <div className="space-y-6">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>{initialData ? "Modifier le Connaissement (BL)" : "Ajouter un Nouveau BL"}</CardTitle>
          <CardDescription>
            Remplissez les informations ci-dessous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="blNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de BL</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: MEDU824522" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Associé</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || isLoadingDropdownData || clients.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingDropdownData ? "Chargement..." : (clients.length === 0 ? "Aucun client" : "Sélectionnez un client")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
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
                name="workTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de Travail</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || isLoadingDropdownData || workTypes.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingDropdownData ? "Chargement..." : (workTypes.length === 0 ? "Aucun type" : "Sélectionnez un type")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {workTypes.map((wt) => (
                          <SelectItem key={wt.id} value={wt.id}>
                            {wt.name}
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
                name="allocatedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant Alloué par le Client (XOF)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 5000000" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégories (séparées par une virgule)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Urgent, Fragile, Import Asie" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>Entrez vos propres catégories pour ce BL.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut du BL</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {blStatusOptions.map((option) => (
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optionnelle)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes additionnelles, contexte pour ce BL..."
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
                <Button type="submit" disabled={isSubmitting || isLoadingDropdownData}>
                  {(isSubmitting || isLoadingDropdownData) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {initialData ? "Sauvegarder" : "Ajouter le BL"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    