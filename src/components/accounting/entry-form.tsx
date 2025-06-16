
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import type { AccountingEntry, AccountingEntryType, AccountingEntryStatus, Client, BillOfLading } from "@/lib/types";
import { ACCOUNTING_ENTRY_TYPES, ACCOUNTING_ENTRY_STATUSES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { 
    addAccountingEntryToFirestore, 
    updateAccountingEntryInFirestore,
    getClientsFromFirestore, 
    getBLsFromFirestore,      
} from "@/lib/mock-data";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect, useCallback } from "react";
import { Loader2, CalendarIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const NO_SELECTION_VALUE = "NONE";

const entryFormSchema = z.object({
  entryType: z.custom<AccountingEntryType>((val) => ACCOUNTING_ENTRY_TYPES.includes(val as AccountingEntryType), {
    message: "Veuillez sélectionner un type d'écriture valide.",
  }),
  referenceNumber: z.string().min(3, { message: "Le numéro de référence est requis." }),
  relatedClientId: z.string().nullable().optional(),
  relatedBlId: z.string().nullable().optional(),
  issueDate: z.string().min(1, { message: "La date d'émission est requise." }),
  dueDate: z.string().nullable().optional(),
  amount: z.coerce.number().positive({ message: "Le montant doit être positif." }),
  currency: z.string().min(3, {message: "La devise est requise (ex: XOF)."}).default("XOF"),
  taxAmount: z.coerce.number().min(0, {message: "Le montant de la taxe ne peut être négatif."}).optional().default(0),
  totalAmount: z.coerce.number().positive({ message: "Le montant total doit être positif." }),
  status: z.custom<AccountingEntryStatus>((val) => ACCOUNTING_ENTRY_STATUSES.includes(val as AccountingEntryStatus), {
    message: "Veuillez sélectionner un statut valide.",
  }),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type EntryFormValues = z.infer<typeof entryFormSchema>;

interface EntryFormProps {
  initialData?: AccountingEntry | null;
}

export function AccountingEntryForm({ initialData }: EntryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [bls, setBls] = useState<BillOfLading[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);

  const fetchDropdownData = useCallback(async () => {
    setIsLoadingDropdowns(true);
    try {
        const [fetchedClients, fetchedBls] = await Promise.all([
            getClientsFromFirestore(),
            getBLsFromFirestore(),
        ]);
        setClients(fetchedClients);
        setBls(fetchedBls);
    } catch (error) {
        console.error("Error fetching dropdown data for accounting form:", error);
        toast({ title: "Erreur de chargement", description: "Impossible de charger les listes de clients/BLs.", variant: "destructive" });
    } finally {
        setIsLoadingDropdowns(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      issueDate: format(parseISO(initialData.issueDate), 'yyyy-MM-dd'),
      dueDate: initialData.dueDate ? format(parseISO(initialData.dueDate), 'yyyy-MM-dd') : null,
      relatedClientId: initialData.relatedClientId || null,
      relatedBlId: initialData.relatedBlId || null,
      taxAmount: initialData.taxAmount || 0,
      description: initialData.description || "",
      notes: initialData.notes || "",
    } : {
      entryType: "facture_client",
      referenceNumber: "",
      relatedClientId: null,
      relatedBlId: null,
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: null,
      amount: 0,
      currency: "XOF",
      taxAmount: 0,
      totalAmount: 0,
      status: "brouillon",
      description: "",
      notes: "",
    },
  });

  const watchAmount = form.watch("amount");
  const watchTaxAmount = form.watch("taxAmount");

  useEffect(() => {
    const newTotal = (watchAmount || 0) + (watchTaxAmount || 0);
    if (form.getValues("totalAmount") !== newTotal) {
         form.setValue("totalAmount", newTotal, { shouldValidate: true });
    }
  }, [watchAmount, watchTaxAmount, form]);


  async function onSubmit(data: EntryFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const payload: Omit<AccountingEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        ...data,
        relatedClientId: data.relatedClientId === NO_SELECTION_VALUE ? null : data.relatedClientId,
        relatedBlId: data.relatedBlId === NO_SELECTION_VALUE ? null : data.relatedBlId,
        dueDate: data.dueDate || null,
        createdByUserId: initialData?.createdByUserId || user.uid,
    };

    try {
      if (initialData && initialData.id) {
        await updateAccountingEntryInFirestore(initialData.id, payload);
      } else {
        await addAccountingEntryToFirestore(payload);
      }
      toast({
        title: initialData ? "Écriture Modifiée" : "Écriture Créée",
        description: `L'écriture "${data.referenceNumber}" a été ${initialData ? 'modifiée' : 'enregistrée'}.`,
      });
      router.push("/accounting/invoices");
      router.refresh();
    } catch (error) {
      console.error("Failed to save accounting entry:", error);
      toast({
        title: "Erreur de Sauvegarde",
        description: `Échec de la sauvegarde. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const renderDateField = (name: "issueDate" | "dueDate", label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                  disabled={isSubmitting}
                >
                  {field.value ? (
                    format(parseISO(field.value), "PPP", { locale: fr })
                  ) : (
                    <span>Choisir une date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value ? parseISO(field.value) : undefined}
                onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                disabled={(date) => date < new Date("1900-01-01") || isSubmitting}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );


  return (
    <Card className="max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{initialData ? "Modifier l'Écriture Comptable" : "Nouvelle Écriture Comptable"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="entryType" render={({ field }) => (
                    <FormItem><FormLabel>Type d'Écriture</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un type" /></SelectTrigger></FormControl>
                        <SelectContent>{ACCOUNTING_ENTRY_TYPES.map((type) => (<SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')}</SelectItem>))}</SelectContent>
                    </Select><FormMessage /></FormItem>)}
                />
                <FormField control={form.control} name="referenceNumber" render={({ field }) => (
                    <FormItem><FormLabel>Numéro de Référence</FormLabel>
                    <FormControl><Input placeholder="Ex: FACT2024001" {...field} disabled={isSubmitting} /></FormControl>
                    <FormMessage /></FormItem>)}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderDateField("issueDate", "Date d'Émission")}
                {renderDateField("dueDate", "Date d'Échéance (Optionnel)")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="relatedClientId" render={({ field }) => (
                    <FormItem><FormLabel>Client Associé (Optionnel)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === NO_SELECTION_VALUE ? null : value)} value={field.value ?? NO_SELECTION_VALUE} disabled={isSubmitting || isLoadingDropdowns}>
                        <FormControl><SelectTrigger><SelectValue placeholder={isLoadingDropdowns ? "Chargement..." : "Aucun"} /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value={NO_SELECTION_VALUE}>Aucun Client</SelectItem>{clients.map(client => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>)}
                />
                <FormField control={form.control} name="relatedBlId" render={({ field }) => (
                    <FormItem><FormLabel>BL Associé (Optionnel)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === NO_SELECTION_VALUE ? null : value)} value={field.value ?? NO_SELECTION_VALUE} disabled={isSubmitting || isLoadingDropdowns}>
                        <FormControl><SelectTrigger><SelectValue placeholder={isLoadingDropdowns ? "Chargement..." : "Aucun"} /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value={NO_SELECTION_VALUE}>Aucun BL</SelectItem>{bls.map(bl => <SelectItem key={bl.id} value={bl.id}>{bl.blNumber}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>)}
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Montant HT (XOF)</FormLabel>
                    <FormControl><Input type="number" placeholder="Ex: 100000" {...field} step="0.01" disabled={isSubmitting} /></FormControl>
                    <FormMessage /></FormItem>)}
                />
                <FormField control={form.control} name="taxAmount" render={({ field }) => (
                    <FormItem><FormLabel>Montant Taxe (XOF)</FormLabel>
                    <FormControl><Input type="number" placeholder="Ex: 18000" {...field} step="0.01" disabled={isSubmitting} /></FormControl>
                    <FormMessage /></FormItem>)}
                />
                 <FormField control={form.control} name="totalAmount" render={({ field }) => (
                    <FormItem><FormLabel>Montant Total TTC (XOF)</FormLabel>
                    <FormControl><Input type="number" {...field} disabled={true} className="bg-muted/50" /></FormControl>
                    <FormDescription className="text-xs">Calculé automatiquement (Montant HT + Taxe).</FormDescription>
                    <FormMessage /></FormItem>)}
                />
            </div>
             <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem className="md:col-span-1"><FormLabel>Devise</FormLabel>
                <FormControl><Input placeholder="XOF" {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage /></FormItem>)}
            />
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description / Lignes d'article (Optionnel)</FormLabel>
                <FormControl><Textarea placeholder="Ex: Prestation de transit pour BL X..." {...field} rows={3} disabled={isSubmitting} /></FormControl>
                <FormMessage /></FormItem>)}
            />
            <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes Internes (Optionnel)</FormLabel>
                <FormControl><Textarea placeholder="Remarques, suivi..." {...field} rows={3} disabled={isSubmitting} /></FormControl>
                <FormMessage /></FormItem>)}
            />
            <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Statut</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un statut" /></SelectTrigger></FormControl>
                    <SelectContent>{ACCOUNTING_ENTRY_STATUSES.map((status) => (<SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}</SelectItem>))}</SelectContent>
                </Select><FormMessage /></FormItem>)}
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Annuler</Button>
              <Button type="submit" disabled={isSubmitting || isLoadingDropdowns}>
                {(isSubmitting || isLoadingDropdowns) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Sauvegarder" : "Créer Écriture"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

