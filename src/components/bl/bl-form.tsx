
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
import { MOCK_BILLS_OF_LADING, MOCK_WORK_TYPES, addBL, updateBL } from "@/lib/mock-data"; // Import MOCK_WORK_TYPES

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
  categories: z.string().min(1, { message: "Veuillez entrer au moins une catégorie."}), // Comma-separated string
  status: z.enum(["en cours", "terminé", "inactif"], { required_error: "Veuillez sélectionner un statut." }),
});

type BLFormValues = z.infer<typeof blFormSchema>;

interface BLFormProps {
  initialData?: BillOfLading | null;
  clients: Client[];
  workTypes: WorkType[]; // Add workTypes prop
}

export function BLForm({ initialData, clients, workTypes }: BLFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');
  const { toast } = useToast();

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

  function onSubmit(data: BLFormValues) {
    const processedCategories = data.categories.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0);

    const newOrUpdatedBL: BillOfLading = {
        id: initialData?.id || `bl-${Date.now()}`,
        blNumber: data.blNumber,
        clientId: data.clientId,
        allocatedAmount: data.allocatedAmount,
        workTypeId: data.workTypeId,
        description: data.description || "",
        categories: processedCategories,
        status: data.status,
        createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    if (initialData) {
        updateBL(newOrUpdatedBL);
    } else {
        addBL(newOrUpdatedBL);
    }

    toast({
      title: initialData ? "BL Modifié" : "BL Créé",
      description: `Le BL N° ${data.blNumber} a été ${initialData ? 'modifié' : 'enregistré'} avec succès.`,
    });
    router.push("/bls"); 
    router.refresh();
  }

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
                      <Input placeholder="Ex: MEDU824522" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un client" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un type de travail" />
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
                    <FormLabel>Montant Alloué par le Client (€)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ex: 5000" {...field} />
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
                      <Input placeholder="Ex: Urgent, Fragile, Import Asie" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Annuler
                </Button>
                <Button type="submit">{initialData ? "Sauvegarder les Modifications" : "Ajouter le BL"}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
