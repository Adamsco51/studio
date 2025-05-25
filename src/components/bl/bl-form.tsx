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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillOfLading, Client } from "@/lib/types";
import { MOCK_CLIENTS } from "@/lib/mock-data"; // For client selection
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { AICategorization } from "./ai-categorization";
import { Checkbox } from "@/components/ui/checkbox";

const serviceTypesOptions = [
  { id: "transit", label: "Transit" },
  { id: "transport", label: "Transport" },
  { id: "logistique", label: "Logistique" },
  { id: "customs", label: "Dédouanement" },
  { id: "warehousing", label: "Entreposage" },
  { id: "other", label: "Autre" },
];

const blFormSchema = z.object({
  blNumber: z.string().min(5, { message: "Le numéro de BL doit contenir au moins 5 caractères." }),
  clientId: z.string({ required_error: "Veuillez sélectionner un client." }),
  allocatedAmount: z.coerce.number().positive({ message: "Le montant alloué doit être positif." }),
  serviceTypes: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Vous devez sélectionner au moins un type de service.",
  }),
  description: z.string().min(10, { message: "La description doit contenir au moins 10 caractères." }),
  aiSuggestedCategories: z.array(z.string()).optional(),
  aiSuggestedSubCategories: z.array(z.string()).optional(),
});

type BLFormValues = z.infer<typeof blFormSchema>;

interface BLFormProps {
  initialData?: BillOfLading | null;
  clients: Client[]; // Pass clients for the dropdown
  onSubmitSuccess?: (bl: BillOfLading) => void; // For real data handling
}

export function BLForm({ initialData, clients, onSubmitSuccess }: BLFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');
  const { toast } = useToast();

  const form = useForm<BLFormValues>({
    resolver: zodResolver(blFormSchema),
    defaultValues: initialData || {
      blNumber: "",
      clientId: preselectedClientId || "",
      allocatedAmount: 0,
      serviceTypes: [],
      description: "",
      aiSuggestedCategories: [],
      aiSuggestedSubCategories: [],
    },
  });

  function onSubmit(data: BLFormValues) {
    console.log("BL data submitted:", data);
    
    const newOrUpdatedBL: BillOfLading = {
        id: initialData?.id || `bl-${Date.now()}`,
        ...data,
        createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    if (onSubmitSuccess) {
        onSubmitSuccess(newOrUpdatedBL);
    }

    toast({
      title: initialData ? "BL Modifié" : "BL Créé",
      description: `Le BL N° ${data.blNumber} a été ${initialData ? 'modifié' : 'enregistré'} avec succès.`,
    });
    router.push("/bls");
  }

  const handleAISuggestions = (categories: string[], subCategories: string[]) => {
    form.setValue("aiSuggestedCategories", categories);
    form.setValue("aiSuggestedSubCategories", subCategories);
  };

  return (
    <div className="space-y-6">
      <AICategorization 
        initialDescription={form.getValues("description")} 
        onCategoriesSuggested={handleAISuggestions} 
      />
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>{initialData ? "Modifier le Connaissement (BL)" : "Ajouter un Nouveau BL"}</CardTitle>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description du BL (pour IA)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez le contenu, l'origine, la destination, etc."
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Optionally, update AICategorization component's state if needed live
                        }}
                      />
                    </FormControl>
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
