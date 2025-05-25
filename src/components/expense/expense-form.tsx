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
import { Textarea } from "@/components/ui/textarea"; // If needed for 'Libellé' if it can be long
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@/lib/types";

const expenseFormSchema = z.object({
  label: z.string().min(3, { message: "Le libellé doit contenir au moins 3 caractères." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être positif." }),
  // Date will be auto-set or use a date picker
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  blId: string;
  onExpenseAdded: (expense: Expense) => void;
}

export function ExpenseForm({ blId, onExpenseAdded }: ExpenseFormProps) {
  const { toast } = useToast();
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      label: "",
      amount: 0,
    },
  });

  function onSubmit(data: ExpenseFormValues) {
    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      blId: blId,
      ...data,
      date: new Date().toISOString(),
      employeeId: "user-1", // Mocked employee ID
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
