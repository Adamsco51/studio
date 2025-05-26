
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
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context"; 
import { addExpenseToFirestore } from "@/lib/mock-data"; // Use Firestore function
import { useState } from "react";
import { Loader2 } from "lucide-react";

const expenseFormSchema = z.object({
  label: z.string().min(3, { message: "Le libellé doit contenir au moins 3 caractères." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être positif." }),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  blId: string;
  onExpenseAdded: (expense: Expense) => void; // Callback to update parent state
}

export function ExpenseForm({ blId, onExpenseAdded }: ExpenseFormProps) {
  const { toast } = useToast();
  const { user } = useAuth(); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      label: "",
      amount: 0,
    },
  });

  async function onSubmit(data: ExpenseFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté pour ajouter une dépense.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const expensePayload: Omit<Expense, 'id' | 'date'> = {
      blId: blId,
      label: data.label,
      amount: data.amount,
      employeeId: user.uid,
    };

    try {
      const newExpense = await addExpenseToFirestore(expensePayload);
      onExpenseAdded(newExpense); // Pass the full new expense (with ID and date) to parent
      toast({
        title: "Dépense Ajoutée",
        description: `La dépense "${data.label}" a été ajoutée au BL.`,
      });
      form.reset();
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-card mt-4">
        <h3 className="text-lg font-semibold">Ajouter une Dépense</h3>
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
                <Input type="number" placeholder="Ex: 250" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Ajouter la Dépense
        </Button>
      </form>
    </Form>
  );
}
