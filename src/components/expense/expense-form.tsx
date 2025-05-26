
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Expense, BillOfLading } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { addExpenseToFirestore, getBLsFromFirestore } from "@/lib/mock-data"; // Use Firestore function
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const expenseFormSchemaBase = z.object({
  label: z.string().min(3, { message: "Le libellé doit contenir au moins 3 caractères." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être positif." }),
});

// Conditional schema based on whether blId is provided
const expenseFormSchema = z.discriminatedUnion("hasBlId", [
  expenseFormSchemaBase.extend({
    hasBlId: z.literal(true), // blId is provided externally
    blId: z.string().optional(), // Optional because it's provided, not from form
  }),
  expenseFormSchemaBase.extend({
    hasBlId: z.literal(false), // blId needs to be selected
    blId: z.string({ required_error: "Veuillez sélectionner un N° BL." }),
  }),
]);


type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  blId?: string; // Optional: if provided, expense is for this BL
  onExpenseAdded: (expense: Expense) => void; // Callback to update parent state
  availableBls?: BillOfLading[]; // Optional: pass if already fetched by parent
  setDialogOpen?: (open: boolean) => void; // To close dialog on success
}

export function ExpenseForm({ blId: providedBlId, onExpenseAdded, availableBls, setDialogOpen }: ExpenseFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blsForSelect, setBlsForSelect] = useState<BillOfLading[]>(availableBls || []);
  const [isLoadingBls, setIsLoadingBls] = useState(!availableBls);

  useEffect(() => {
    if (!availableBls) {
      const fetchBls = async () => {
        setIsLoadingBls(true);
        try {
          const fetchedBls = await getBLsFromFirestore();
          setBlsForSelect(fetchedBls);
        } catch (error) {
          console.error("Failed to fetch BLs for expense form:", error);
          toast({ title: "Erreur", description: "Impossible de charger la liste des BLs.", variant: "destructive" });
        } finally {
          setIsLoadingBls(false);
        }
      };
      fetchBls();
    }
  }, [availableBls, toast]);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: providedBlId
      ? { hasBlId: true, label: "", amount: 0, blId: providedBlId }
      : { hasBlId: false, label: "", amount: 0, blId: undefined },
  });
  
  // Effect to reset form if providedBlId changes (e.g. when form is reused in a dialog)
  useEffect(() => {
    form.reset(providedBlId
      ? { hasBlId: true, label: "", amount: 0, blId: providedBlId }
      : { hasBlId: false, label: "", amount: 0, blId: undefined });
  }, [providedBlId, form]);


  async function onSubmit(data: ExpenseFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté pour ajouter une dépense.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const blIdToUse = data.hasBlId ? providedBlId : data.blId;

    if (!blIdToUse) {
        toast({ title: "Erreur", description: "N° BL manquant.", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    const expensePayload: Omit<Expense, 'id' | 'date'> = {
      blId: blIdToUse,
      label: data.label,
      amount: data.amount,
      employeeId: user.uid,
    };

    try {
      const newExpense = await addExpenseToFirestore(expensePayload);
      onExpenseAdded(newExpense);
      toast({
        title: "Dépense Ajoutée",
        description: `La dépense "${data.label}" a été ajoutée.`,
      });
      form.reset(providedBlId
        ? { hasBlId: true, label: "", amount: 0, blId: providedBlId }
        : { hasBlId: false, label: "", amount: 0, blId: undefined });
      if (setDialogOpen) {
        setDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to add expense:", error);
      toast({
        title: "Erreur d'Ajout",
        description: `Échec de l'ajout de la dépense. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
        {!providedBlId && (
          <FormField
            control={form.control}
            name="blId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>N° BL Associé</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || isLoadingBls}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingBls ? "Chargement des BLs..." : "Sélectionnez un N° BL"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {blsForSelect.map((bl) => (
                      <SelectItem key={bl.id} value={bl.id}>
                        {bl.blNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Libellé de la dépense</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Frais de port" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant (€)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ex: 250" {...field} step="0.01" disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" disabled={isSubmitting || (isLoadingBls && !providedBlId)}>
          {(isSubmitting || (isLoadingBls && !providedBlId)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Ajouter la Dépense
        </Button>
      </form>
    </Form>
  );
}
