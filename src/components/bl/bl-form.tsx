
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
import type { BillOfLading, Client, BLStatus } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const serviceTypesOptions = [
  { id: "transit", label: "Transit" },
  { id: "transport", label: "Transport" },
  { id: "logistique", label: "Logistique" },
  { id: "customs", label: "Dédouanement" },
  { id: "warehousing", label: "Entreposage" },
  { id: "other", label: "Autre" },
];

const blStatusOptions: { value: BLStatus; label: string }[] = [
  { value: "en cours", label: "En cours" },
  { value: "terminé", label: "Terminé" },
  { value: "inactif", label: "Inactif" },
];

const blFormSchema = z.object({
  blNumber: z.string().min(5, { message: "Le numéro de BL doit contenir au moins 5 caractères." }),
  clientId: z.string({ required_error: "Veuillez sélectionner un client." }),
  allocatedAmount: z.coerce.number().positive({ message: "Le montant alloué doit être positif." }),
  serviceTypes: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Vous devez sélectionner au moins un type de service.",
  }),
  description: z.string().optional(), // Description is now optional
  categories: z.string().min(1, { message: "Veuillez entrer au moins une catégorie."}), // Comma-separated string
  status: z.enum(["en cours", "terminé", "inactif"], { required_error: "Veuillez sélectionner un statut." }),
});

type BLFormValues = z.infer<typeof blFormSchema>;

interface BLFormProps {
  initialData?: BillOfLading | null;
  clients: Client[];
  onSubmitSuccess?: (bl: BillOfLading) => void;
}

export function BLForm({ initialData, clients, onSubmitSuccess }: BLFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');
  const { toast } = useToast();

  const defaultCategories = initialData?.categories ? initialData.categories.join(", ") : "";

  const form = useForm<BLFormValues>({
    resolver: zodResolver(blFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        categories: defaultCategories, // Convert array to comma-separated string for form
        allocatedAmount: initialData.allocatedAmount || 0,
        status: initialData.status || "en cours",
    } : {
      blNumber: "",
      clientId: preselectedClientId || "",
      allocatedAmount: 0,
      serviceTypes: [],
      description: "",
      categories: "",
      status: "en cours",
    },
  });

  function onSubmit(data: BLFormValues) {
    console.log("BL data submitted:", data);
    
    const processedCategories = data.categories.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0);

    const newOrUpdatedBL: BillOfLading = {
        id: initialData?.id || `bl-${Date.now()}`,
        blNumber: data.blNumber,
        clientId: data.clientId,
        allocatedAmount: data.allocatedAmount,
        serviceTypes: data.serviceTypes,
        description: data.description || "",
        categories: processedCategories,
        status: data.status,
        createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    // In a real app, you would save this to MOCK_BILLS_OF_LADING or call an API
    // For now, we'll just log and call onSubmitSuccess if provided
    // MOCK_BILLS_OF_LADING.push(newOrUpdatedBL); // This should be handled by the parent page or global state

    if (onSubmitSuccess) {
        onSubmitSuccess(newOrUpdatedBL);
    } else {
      // Basic mock data update simulation if no onSubmitSuccess provided
      // This part is tricky as forms shouldn't directly manipulate global mock data
      // Ideally, this logic resides in the page using the form.
      // For demo purposes, this would need a way to update the global MOCK_BILLS_OF_LADING
      // For now, we rely on the page to handle the mock data update logic.
       console.log("Simulating data save for:", newOrUpdatedBL);
    }

    toast({
      title: initialData ? "BL Modifié" : "BL Créé",
      description: `Le BL N° ${data.blNumber} a été ${initialData ? 'modifié' : 'enregistré'} avec succès.`,
    });
    router.push("/bls"); 
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>{initialData ? "Modifier le Connaissement (BL)" : "Ajouter un Nouveau BL"}</CardTitle>
          <CardDescription>
            Remplissez les informations ci-dessous. Les catégories manuelles remplacent la suggestion IA.
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
                name="serviceTypes"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Types de Service</FormLabel>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {serviceTypesOptions.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="serviceTypes"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), item.id])
                                      : field.onChange(
                                          (field.value || []).filter(
                                            (value) => value !== item.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {item.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                    </div>
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
