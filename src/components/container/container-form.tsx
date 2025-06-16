
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import type { Container, BillOfLading } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { addContainerToFirestore, updateContainerInFirestore, getBLsFromFirestore } from "@/lib/mock-data";
import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const containerStatusOptions = [
  "At Origin Port", "On Vessel", "At Destination Port", "Loaded on Truck", "Customs Clearance", "Delivered", "Empty Returned", "Other"
];

const containerTypeOptions = [
    "20ft Standard Dry", "40ft Standard Dry", "40ft High Cube (HC)", "20ft Reefer", "40ft Reefer", "20ft Open Top", "40ft Open Top", "20ft Flat Rack", "40ft Flat Rack", "Tank Container", "Other"
];

const containerFormSchemaBase = z.object({
  containerNumber: z.string().min(5, { message: "Le numéro de conteneur doit être valide (ex: MSCU1234567)." }),
  type: z.string({ required_error: "Veuillez sélectionner un type de conteneur." }),
  sealNumber: z.string().optional(),
  status: z.string({ required_error: "Veuillez sélectionner un statut." }),
  shippingDate: z.string().optional().nullable(),
  dischargeDate: z.string().optional().nullable(),
  truckLoadingDate: z.string().optional().nullable(),
  destinationArrivalDate: z.string().optional().nullable(),
  notes: z.string().optional(),
});

const containerFormSchema = z.discriminatedUnion("isBlProvided", [
  containerFormSchemaBase.extend({
    isBlProvided: z.literal(true),
    blId: z.string(), // blId is directly provided
  }),
  containerFormSchemaBase.extend({
    isBlProvided: z.literal(false),
    blId: z.string({ required_error: "Veuillez sélectionner un Connaissement (BL)." }), // blId must be selected
  }),
]);


type ContainerFormValues = z.infer<typeof containerFormSchema>;

interface ContainerFormProps {
  initialData?: Container | null;
  blId?: string; // Optional: if provided, form is for this specific BL
  availableBls?: BillOfLading[]; // Optional: if adding standalone, pass available BLs
  onContainerSaved: (container: Container) => void;
  setDialogOpen?: (open: boolean) => void;
}

export function ContainerForm({
  initialData,
  blId: providedBlId,
  availableBls: passedAvailableBls,
  onContainerSaved,
  setDialogOpen,
}: ContainerFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [internalAvailableBls, setInternalAvailableBls] = useState<BillOfLading[]>(passedAvailableBls || []);
  const [isLoadingBls, setIsLoadingBls] = useState(!passedAvailableBls && !initialData && !providedBlId);


  const isEditing = !!initialData;
  const isBlContextProvided = !!providedBlId || isEditing;

  const formatDateForInput = (dateString?: string | null) => {
    if (!dateString) return undefined;
    try {
      return format(parseISO(dateString), 'yyyy-MM-dd');
    } catch {
      return undefined;
    }
  };

  const form = useForm<ContainerFormValues>({
    resolver: zodResolver(containerFormSchema),
    defaultValues: initialData
      ? {
          isBlProvided: true,
          blId: initialData.blId,
          ...initialData,
          shippingDate: formatDateForInput(initialData.shippingDate),
          dischargeDate: formatDateForInput(initialData.dischargeDate),
          truckLoadingDate: formatDateForInput(initialData.truckLoadingDate),
          destinationArrivalDate: formatDateForInput(initialData.destinationArrivalDate),
        }
      : providedBlId
        ? {
            isBlProvided: true,
            blId: providedBlId,
            containerNumber: "", type: "", sealNumber: "", status: "At Origin Port",
            shippingDate: null, dischargeDate: null, truckLoadingDate: null, destinationArrivalDate: null, notes: "",
          }
        : { // Adding standalone, blId will come from select
            isBlProvided: false,
            blId: "", // Requires selection
            containerNumber: "", type: "", sealNumber: "", status: "At Origin Port",
            shippingDate: null, dischargeDate: null, truckLoadingDate: null, destinationArrivalDate: null, notes: "",
          },
  });
  
  const fetchBlsForSelect = useCallback(async () => {
    if (!passedAvailableBls && !isBlContextProvided) {
      setIsLoadingBls(true);
      try {
        const fetchedBls = await getBLsFromFirestore();
        setInternalAvailableBls(fetchedBls.filter(bl => bl.status === 'en cours'));
      } catch (error) {
        console.error("Failed to fetch BLs for container form:", error);
        toast({ title: "Erreur", description: "Impossible de charger la liste des BLs.", variant: "destructive" });
      } finally {
        setIsLoadingBls(false);
      }
    }
  }, [passedAvailableBls, isBlContextProvided, toast]);

  useEffect(() => {
    fetchBlsForSelect();
  }, [fetchBlsForSelect]);

  useEffect(() => {
    // Reset form when initialData or providedBlId changes
    if (initialData) {
      form.reset({
        isBlProvided: true,
        blId: initialData.blId,
        ...initialData,
        shippingDate: formatDateForInput(initialData.shippingDate),
        dischargeDate: formatDateForInput(initialData.dischargeDate),
        truckLoadingDate: formatDateForInput(initialData.truckLoadingDate),
        destinationArrivalDate: formatDateForInput(initialData.destinationArrivalDate),
      });
    } else if (providedBlId) {
      form.reset({
        isBlProvided: true,
        blId: providedBlId,
        containerNumber: "", type: "", sealNumber: "", status: "At Origin Port",
        shippingDate: null, dischargeDate: null, truckLoadingDate: null, destinationArrivalDate: null, notes: "",
      });
    } else {
       form.reset({
        isBlProvided: false,
        blId: "", // Reset blId for standalone add to force selection
        containerNumber: "", type: "", sealNumber: "", status: "At Origin Port",
        shippingDate: null, dischargeDate: null, truckLoadingDate: null, destinationArrivalDate: null, notes: "",
      });
    }
  }, [initialData, providedBlId, form]);


  async function onSubmit(data: ContainerFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const finalBlId = data.isBlProvided ? data.blId : data.blId; // data.blId is always populated by schema logic

    if (!finalBlId) {
        toast({ title: "Erreur", description: "Connaissement (BL) non spécifié.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const containerPayloadBase = {
      blId: finalBlId,
      containerNumber: data.containerNumber,
      type: data.type,
      sealNumber: data.sealNumber || "",
      status: data.status,
      shippingDate: data.shippingDate || undefined,
      dischargeDate: data.dischargeDate || undefined,
      truckLoadingDate: data.truckLoadingDate || undefined,
      destinationArrivalDate: data.destinationArrivalDate || undefined,
      notes: data.notes || "",
    };
    
    try {
      let savedContainer: Container;
      if (isEditing && initialData) {
        await updateContainerInFirestore(initialData.id, containerPayloadBase);
        savedContainer = { ...initialData, ...containerPayloadBase };
      } else {
        savedContainer = await addContainerToFirestore({ ...containerPayloadBase, createdByUserId: user.uid });
      }

      onContainerSaved(savedContainer);
      toast({
        title: isEditing ? "Conteneur Modifié" : "Conteneur Ajouté",
        description: `Le conteneur ${data.containerNumber} a été ${isEditing ? 'modifié' : 'enregistré'}.`,
      });
      if (setDialogOpen) {
        setDialogOpen(false);
      } else {
         form.reset(providedBlId ? {
            isBlProvided: true, blId: providedBlId, containerNumber: "", type: "", sealNumber: "", status: "At Origin Port",
            shippingDate: null, dischargeDate: null, truckLoadingDate: null, destinationArrivalDate: null, notes: ""
         } : {
            isBlProvided: false, blId: "", containerNumber: "", type: "", sealNumber: "", status: "At Origin Port",
            shippingDate: null, dischargeDate: null, truckLoadingDate: null, destinationArrivalDate: null, notes: ""
         });
      }
    } catch (error) {
      console.error("Failed to save container:", error);
      toast({
        title: "Erreur de Sauvegarde",
        description: `Échec de la sauvegarde. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const renderDateField = (name: keyof Pick<ContainerFormValues, "shippingDate" | "dischargeDate" | "truckLoadingDate" | "destinationArrivalDate">, label: string) => (
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
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground",
                  )}
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1 max-h-[70vh] overflow-y-auto pr-2">
        {!isBlContextProvided && (
             <FormField
                control={form.control}
                name="blId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Connaissement (BL) Associé</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting || isLoadingBls || internalAvailableBls.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingBls ? "Chargement des BLs..." : (internalAvailableBls.length === 0 ? "Aucun BL actif disponible" : "Sélectionnez un BL")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {internalAvailableBls.map((bl) => (
                          <SelectItem key={bl.id} value={bl.id}>
                            {bl.blNumber} - {bl.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
            />
        )}
        {isBlContextProvided && form.getValues("blId") && (
             <FormItem>
                <FormLabel>N° BL Associé</FormLabel>
                <Input 
                    value={internalAvailableBls.find(bl => bl.id === (initialData?.blId || providedBlId))?.blNumber || 'Chargement...'} 
                    disabled 
                />
             </FormItem>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="containerNumber"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Numéro de Conteneur</FormLabel>
                <FormControl>
                    <Input placeholder="Ex: MSCU1234567" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Type de Conteneur</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {containerTypeOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="sealNumber"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Numéro de Plomb (Optionnel)</FormLabel>
                <FormControl>
                    <Input placeholder="Ex: S12345" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Statut du Conteneur</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un statut" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {containerStatusOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormDescription className="text-sm text-muted-foreground pt-2">
          Dates de Suivi (Optionnel)
        </FormDescription>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderDateField("shippingDate", "Date d'embarquement (Navire)")}
            {renderDateField("dischargeDate", "Date de déchargement (Navire)")}
            {renderDateField("truckLoadingDate", "Date de chargement (Camion)")}
            {renderDateField("destinationArrivalDate", "Date d'arrivée (Destination)")}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optionnel)</FormLabel>
              <FormControl>
                <Textarea placeholder="Informations additionnelles sur le conteneur..." {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting || isLoadingBls}>
            {isSubmitting || isLoadingBls && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Sauvegarder Modifications" : "Ajouter Conteneur"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
