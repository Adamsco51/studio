
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
import { useAuth } from "@/contexts/auth-context"; // Import useAuth

const expenseFormSchema = z.object({
  label: z.string().min(3, { message: "Le libellé doit contenir au moins 3 caractères." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être positif." }),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  blId: string;
  onExpenseAdded: (expense: Expense) => void;
}

export function ExpenseForm({ blId, onExpenseAdded }: ExpenseFormProps) {
  const { toast } = useToast();
  const { user } = useAuth(); // Get authenticated user

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      label: "",
      amount: 0,
    },
  });

  function onSubmit(data: ExpenseFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté pour ajouter une dépense.", variant: "destructive" });
      return;
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      blId: blId,
      ...data,
      date: new Date().toISOString(),
      employeeId: user.uid, // Use authenticated user's UID
    };
    onExpenseAdded(newExpense);
    toast({
      title: "Dépense Ajoutée",
      description: `La dépense "${data.label}" a été ajoutée au BL.`,
    });
    form.reset();
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
                <Input placeholder="Ex: Frais de port" {...field} />
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
                <Input type="number" placeholder="Ex: 250" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="sm">Ajouter la Dépense</Button>
      </form>
    </Form>
  );
}
