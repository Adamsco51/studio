
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Expense, BillOfLading } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { addExpenseToFirestore, getBLsFromFirestore, updateExpenseInFirestore } from "@/lib/mock-data";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Base schema for common fields
const expenseFormSchemaBase = z.object({
  label: z.string().min(3, { message: "Le libellé doit contenir au moins 3 caractères." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être positif." }),
  date: z.string().min(1, { message: "Veuillez sélectionner une date." }), // Date is now a string in 'yyyy-MM-dd'
});

// Conditional schema
const expenseFormSchema = z.discriminatedUnion("isEditingOrBlProvided", [
  expenseFormSchemaBase.extend({ // Case: Editing or BL ID is provided externally
    isEditingOrBlProvided: z.literal(true),
    blId: z.string().optional(), // Optional because it's provided or part of initialData
  }),
  expenseFormSchemaBase.extend({ // Case: Creating new, BL ID needs to be selected
    isEditingOrBlProvided: z.literal(false),
    blId: z.string({ required_error: "Veuillez sélectionner un N° BL." }),
  }),
]);

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  initialData?: Expense | null; // For editing
  blId?: string; // Optional: if provided, expense is for this BL (create mode)
  onExpenseAddedOrUpdated: (expense: Expense) => void;
  availableBls?: BillOfLading[];
  setDialogOpen?: (open: boolean) => void;
}

export function ExpenseForm({
  initialData,
  blId: providedBlId,
  onExpenseAddedOrUpdated,
  availableBls,
  setDialogOpen,
}: ExpenseFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blsForSelect, setBlsForSelect] = useState<BillOfLading[]>(availableBls || []);
  const [isLoadingBls, setIsLoadingBls] = useState(!availableBls && !initialData && !providedBlId);

  const isEditing = !!initialData;

  useEffect(() => {
    if (!availableBls && !initialData && !providedBlId) {
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
  }, [availableBls, toast, initialData, providedBlId]);

  const defaultDate = initialData ? format(parseISO(initialData.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: initialData
      ? { isEditingOrBlProvided: true, ...initialData, date: defaultDate, blId: initialData.blId }
      : providedBlId
        ? { isEditingOrBlProvided: true, label: "", amount: 0, date: defaultDate, blId: providedBlId }
        : { isEditingOrBlProvided: false, label: "", amount: 0, date: defaultDate, blId: undefined },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({ isEditingOrBlProvided: true, ...initialData, date: format(parseISO(initialData.date), 'yyyy-MM-dd'), blId: initialData.blId });
    } else if (providedBlId) {
      form.reset({ isEditingOrBlProvided: true, label: "", amount: 0, date: format(new Date(), 'yyyy-MM-dd'), blId: providedBlId });
    } else {
       form.reset({ isEditingOrBlProvided: false, label: "", amount: 0, date: format(new Date(), 'yyyy-MM-dd'), blId: undefined });
    }
  }, [initialData, providedBlId, form]);


  async function onSubmit(data: ExpenseFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const blIdToUse = data.isEditingOrBlProvided ? (initialData?.blId || providedBlId) : data.blId;

    if (!blIdToUse) {
        toast({ title: "Erreur", description: "N° BL manquant.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    const expensePayloadBase = {
      blId: blIdToUse,
      label: data.label,
      amount: data.amount,
      date: data.date, // Already in yyyy-MM-dd string format from form
      employeeId: isEditing ? initialData.employeeId : user.uid, // Keep original employeeId on edit
    };

    try {
      let savedExpense: Expense;
      if (isEditing && initialData) {
        const updatePayload: Partial<Omit<Expense, 'id'>> = {
          label: data.label,
          amount: data.amount,
          date: data.date, // This will be converted to Timestamp in updateExpenseInFirestore
          // blId and employeeId are generally not changed during an edit of an existing expense
        };
        await updateExpenseInFirestore(initialData.id, updatePayload);
        savedExpense = { ...initialData, ...updatePayload }; // Construct the updated expense
      } else {
        savedExpense = await addExpenseToFirestore(expensePayloadBase);
      }

      onExpenseAddedOrUpdated(savedExpense);
      toast({
        title: isEditing ? "Dépense Modifiée" : "Dépense Ajoutée",
        description: `La dépense "${data.label}" a été ${isEditing ? 'modifiée' : 'enregistrée'}.`,
      });
      form.reset(providedBlId
        ? { isEditingOrBlProvided: true, label: "", amount: 0, date: format(new Date(), 'yyyy-MM-dd'), blId: providedBlId }
        : { isEditingOrBlProvided: false, label: "", amount: 0, date: format(new Date(), 'yyyy-MM-dd'), blId: undefined });
      if (setDialogOpen) {
        setDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to save expense:", error);
      toast({
        title: "Erreur de Sauvegarde",
        description: `Échec de la sauvegarde. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
        {!providedBlId && !isEditing && (
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
        { (providedBlId || isEditing) && form.getValues("blId") &&
          <FormItem>
            <FormLabel>N° BL Associé</FormLabel>
            <Input 
              value={blsForSelect.find(bl => bl.id === (initialData?.blId || providedBlId))?.blNumber || 'Chargement...'} 
              disabled 
            />
          </FormItem>
        }
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
              <FormLabel>Montant (XOF)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ex: 25000" {...field} step="0.01" disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date de la Dépense</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                      disabled={isSubmitting}
                    >
                      {field.value ? (
                        format(parseISO(field.value), "PPP", { locale: fr })
                      ) : (
                        <span>Choisissez une date</span>
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
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01") || isSubmitting
                    }
                    initialFocus
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" className="w-full" disabled={isSubmitting || (isLoadingBls && !providedBlId && !isEditing )}>
          {(isSubmitting || (isLoadingBls && !providedBlId && !isEditing)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Sauvegarder les Modifications" : "Ajouter la Dépense"}
        </Button>
      </form>
    </Form>
  );
}
