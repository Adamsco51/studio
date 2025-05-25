
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WorkType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { MOCK_USERS, MOCK_WORK_TYPES, addWorkType, updateWorkType } from "@/lib/mock-data";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { UserCircle2, CalendarDays } from "lucide-react";


const workTypeFormSchema = z.object({
  name: z.string().min(3, { message: "Le nom du type de travail doit contenir au moins 3 caractères." }),
  description: z.string().optional(),
});

type WorkTypeFormValues = z.infer<typeof workTypeFormSchema>;

interface WorkTypeFormProps {
  initialData?: WorkType | null;
}

export function WorkTypeForm({ initialData }: WorkTypeFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<WorkTypeFormValues>({
    resolver: zodResolver(workTypeFormSchema),
    defaultValues: initialData ? {
        name: initialData.name,
        description: initialData.description || "",
    } : {
      name: "",
      description: "",
    },
  });

  const createdByUserName = initialData?.createdByUserId
    ? MOCK_USERS.find(u => u.id === initialData.createdByUserId)?.name || "Inconnu"
    : null;

  function onSubmit(data: WorkTypeFormValues) {
    if (initialData) {
        const updatedWorkTypeData: WorkType = {
            ...initialData, // This includes id, createdAt, createdByUserId
            ...data, // name, description
        };
        updateWorkType(updatedWorkTypeData);
    } else {
        const newWorkType: Omit<WorkType, 'id' | 'createdAt' | 'createdByUserId'> = data;
        addWorkType(newWorkType); // addWorkType handles id, createdAt, createdByUserId
    }
    
    toast({
      title: initialData ? "Type de Travail Modifié" : "Type de Travail Créé",
      description: `Le type de travail "${data.name}" a été ${initialData ? 'modifié' : 'enregistré'} avec succès.`,
    });
    router.push("/work-types");
    router.refresh();
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{initialData ? "Modifier le Type de Travail" : "Ajouter un Nouveau Type de Travail"}</CardTitle>
        <CardDescription>
          Remplissez les informations ci-dessous pour ce type de travail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {initialData && initialData.createdAt && (
          <div className="mb-6 space-y-3 p-4 border rounded-md bg-muted/30">
            <div className="flex items-center text-sm text-muted-foreground">
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Créé le: {format(new Date(initialData.createdAt), 'dd MMMM yyyy, HH:mm', { locale: fr })}</span>
            </div>
            {createdByUserName && (
                <div className="flex items-center text-sm text-muted-foreground">
                    <UserCircle2 className="mr-2 h-4 w-4" />
                    <span>Créé par: {createdByUserName}</span>
                </div>
            )}
            <Separator />
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du Type de Travail</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Transit Maritime Standard" {...field} />
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
                  <FormLabel>Description (optionnelle)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez brièvement ce type de travail..."
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
              <Button type="submit">{initialData ? "Sauvegarder les Modifications" : "Ajouter le Type de Travail"}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
