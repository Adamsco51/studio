
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
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { useToast } from "@/hooks/use-toast";
import type { Container, BillOfLading } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { addContainerToFirestore, updateContainerInFirestore, getBLsFromFirestore } from "@/lib/mock-data";
import { useState, useEffect, useCallback } from "react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const baseContainerStatusOptions = [
  "At Origin Port", "On Vessel", "At Destination Port", "Loaded on Truck", "Customs Clearance", "Delivered", "Empty Returned"
];
const OTHER_STATUS_VALUE = "Other";
const containerStatusOptions = [...baseContainerStatusOptions, OTHER_STATUS_VALUE];


const containerTypeOptions = [
    "20ft Standard Dry", "40ft Standard Dry", "40ft High Cube (HC)", "20ft Reefer", "40ft Reefer", "20ft Open Top", "40ft Open Top", "20ft Flat Rack", "40ft Flat Rack", "Tank Container", "Other"
];

const containerFormSchemaBase = z.object({
  containerNumber: z.string().min(5, { message: "Le numéro de conteneur doit être valide (ex: MSCU1234567)." }),
  type: z.string({ required_error: "Veuillez sélectionner un type de conteneur." }),
  sealNumber: z.string().optional(),
  status: z.string({ required_error: "Veuillez sélectionner un statut." }),
  customStatusText: z.string().optional(),
  shippingDate: z.string().optional().nullable(),
  dischargeDate: z.string().optional().nullable(),
  truckLoadingDate: z.string().optional().nullable(),
  destinationArrivalDate: z.string().optional().nullable(),
  notes: z.string().optional(),
});

const containerFormSchema = z.discriminatedUnion("isBlProvided", [
  containerFormSchemaBase.extend({
    isBlProvided: z.literal(true),
    blId: z.string(), 
  }),
  containerFormSchemaBase.extend({
    isBlProvided: z.literal(false),
    blId: z.string({ required_error: "Veuillez sélectionner un Connaissement (BL)." }), 
  }),
]).superRefine((data, ctx) => {
  if (data.status === OTHER_STATUS_VALUE && (!data.customStatusText || data.customStatusText.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Veuillez spécifier le statut personnalisé.",
      path: ["customStatusText"],
    });
  }
});


type ContainerFormValues = z.infer<typeof containerFormSchema>;

interface ContainerFormProps {
  initialData?: Container | null;
  blId?: string; 
  availableBls?: BillOfLading[]; 
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

  const [showShippingDateInput, setShowShippingDateInput] = useState(!!initialData?.shippingDate);
  const [showDischargeDateInput, setShowDischargeDateInput] = useState(!!initialData?.dischargeDate);
  const [showTruckLoadingDateInput, setShowTruckLoadingDateInput] = useState(!!initialData?.truckLoadingDate);
  const [showDestinationArrivalDateInput, setShowDestinationArrivalDateInput] = useState(!!initialData?.destinationArrivalDate);


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
  
  let initialStatus = initialData?.status || "At Origin Port";
  let initialCustomStatusText = "";
  if (initialData && !baseContainerStatusOptions.includes(initialData.status)) {
    initialStatus = OTHER_STATUS_VALUE;
    initialCustomStatusText = initialData.status;
  }


  const form = useForm<ContainerFormValues>({
    resolver: zodResolver(containerFormSchema),
    defaultValues: initialData
      ? {
          isBlProvided: true,
          blId: initialData.blId,
          ...initialData,
          status: initialStatus,
          customStatusText: initialCustomStatusText,
          shippingDate: formatDateForInput(initialData.shippingDate),
          dischargeDate: formatDateForInput(initialData.dischargeDate),
          truckLoadingDate: formatDateForInput(initialData.truckLoadingDate),
          destinationArrivalDate: formatDateForInput(initialData.destinationArrivalDate),
        }
      : providedBlId
        ? {
            isBlProvided: true,
            blId: providedBlId,
            containerNumber: "", type: "", sealNumber: "", status: "At Origin Port", customStatusText: "",
            shippingDate: null, dischargeDate: null, truckLoadingDate: null, destinationArrivalDate: null, notes: "",
          }
        : { 
            isBlProvided: false,
            blId: "", 
            containerNumber: "", type: "", sealNumber: "", status: "At Origin Port", customStatusText: "",
            shippingDate: null, dischargeDate: null, truckLoadingDate: null, destinationArrivalDate: null, notes: "",
          },
  });
  
  const watchStatus = form.watch("status");

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
    let newStatus = initialData?.status || "At Origin Port";
    let newCustomStatusText = "";
    if (initialData && !baseContainerStatusOptions.includes(initialData.status)) {
        newStatus = OTHER_STATUS_VALUE;
        newCustomStatusText = initialData.status;
    }

    if (initialData) {
      form.reset({
        isBlProvided: true,
        blId: initialData.blId,
        ...initialData,
        status: newStatus,
        customStatusText: newCustomStatusText,
        shippingDate: formatDateForInput(initialData.shippingDate),
        dischargeDate: formatDateForInput(initialData.dischargeDate),
        truckLoadingDate: formatDateForInput(initialData.truckLoadingDate),
        destinationArrivalDate: formatDateForInput(initialData.destinationArrivalDate),
      });
      setShowShippingDateInput(!!initialData.shippingDate);
      setShowDischargeDateInput(!!initialData.dischargeDate);
      setShowTruckLoadingDateInput(!!initialData.truckLoadingDate);
      setShowDestinationArrivalDateInput(!!initialData.destinationArrivalDate);
    } else if (providedBlId) {
      form.reset({
        isBlProvided: true,
        blId: providedBlId,
        containerNumber: "", type: "", sealNumber: "", status: "At Origin Port", customStatusText: "",
        shippingDate: null, dischargeDate: null, truckLoadingDate: null, destinationArrivalDate: null, notes: "",
      });
       setShowShippingDateInput(false); setShowDischargeDateInput(false); setShowTruckLoadingDateInput(false); setShowDestinationArrivalDateInput(false);
    } else {
       form.reset({
        isBlProvided: false,
        blId: "", 
        containerNumber: "", type: "", sealNumber: "", status: "At Origin Port", customStatusText: "",
        shippingDate: null, dischargeDate: null, truckLoadingDate: null, destinationArrivalDate: null, notes: "",
      });
       setShowShippingDateInput(false); setShowDischargeDateInput(false); setShowTruckLoadingDateInput(false); setShowDestinationArrivalDateInput(false);
    }
  }, [initialData, providedBlId, form]);


  async function onSubmit(data: ContainerFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const finalBlId = data.isBlProvided ? data.blId : data.blId;

    if (!finalBlId) {
        toast({ title: "Erreur", description: "Connaissement (BL) non spécifié.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    const statusToSave = data.status === OTHER_STATUS_VALUE ? (data.customStatusText?.trim() || "Other (Not Specified)") : data.status;

    // Prepare payload by explicitly taking values from form `data` to avoid issues with `undefined`
    const containerPayloadBase: Omit<Container, 'id' | 'createdAt' | 'createdByUserId'> = {
      blId: finalBlId,
      containerNumber: data.containerNumber,
      type: data.type,
      sealNumber: data.sealNumber || "",
      status: statusToSave,
      shippingDate: showShippingDateInput && data.shippingDate && isValid(parseISO(data.shippingDate)) ? data.shippingDate : undefined,
      dischargeDate: showDischargeDateInput && data.dischargeDate && isValid(parseISO(data.dischargeDate)) ? data.dischargeDate : undefined,
      truckLoadingDate: showTruckLoadingDateInput && data.truckLoadingDate && isValid(parseISO(data.truckLoadingDate)) ? data.truckLoadingDate : undefined,
      destinationArrivalDate: showDestinationArrivalDateInput && data.destinationArrivalDate && isValid(parseISO(data.destinationArrivalDate)) ? data.destinationArrivalDate : undefined,
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
         const resetValues = providedBlId
            ? { isBlProvided: true, blId: providedBlId, containerNumber: "", type: "", sealNumber: "", status: "At Origin Port", customStatusText: "", shippingDate: null, dischargeDate: null, truckLoadingDate: null, destinationArrivalDate: null, notes: "" }
            : { isBlProvided: false, blId: "", containerNumber: "", type: "", sealNumber: "", status: "At Origin Port", customStatusText: "", shippingDate: null, dischargeDate: null, truckLoadingDate: null, destinationArrivalDate: null, notes: "" };
         form.reset(resetValues);
         setShowShippingDateInput(false); setShowDischargeDateInput(false); setShowTruckLoadingDateInput(false); setShowDestinationArrivalDateInput(false);
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

  const renderDateFieldWithCheckbox = (
    showState: boolean,
    setShowState: (show: boolean) => void,
    fieldName: keyof Pick<ContainerFormValues, "shippingDate" | "dischargeDate" | "truckLoadingDate" | "destinationArrivalDate">,
    label: string,
    checkboxLabel: string
  ) => (
    <div>
        <div className="flex items-center space-x-2 mb-2">
            <Checkbox
            id={`checkbox-${fieldName}`}
            checked={showState}
            onCheckedChange={(checked) => {
                setShowState(!!checked);
                if (!checked) {
                form.setValue(fieldName, null);
                }
            }}
            disabled={isSubmitting}
            />
            <label
            htmlFor={`checkbox-${fieldName}`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
            {checkboxLabel}
            </label>
        </div>
        {showState && (
            <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
                <FormItem className="flex flex-col">
                {/* <FormLabel>{label}</FormLabel> */}
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                        disabled={isSubmitting}
                        >
                        {field.value && isValid(parseISO(field.value)) ? 
                            format(parseISO(field.value), "PPP", { locale: fr }) : 
                            <span>Choisir une date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value && isValid(parseISO(field.value)) ? parseISO(field.value) : undefined}
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
        )}
    </div>
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
        {watchStatus === OTHER_STATUS_VALUE && (
            <FormField
            control={form.control}
            name="customStatusText"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Préciser le statut "Autre"</FormLabel>
                <FormControl>
                    <Input placeholder="Statut personnalisé..." {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}

        <FormDescription className="text-sm text-muted-foreground pt-2">
          Dates de Suivi (Cochez pour ajouter une date)
        </FormDescription>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
            {renderDateFieldWithCheckbox(showShippingDateInput, setShowShippingDateInput, "shippingDate", "Date d'embarquement (Navire)", "Date d'embarquement")}
            {renderDateFieldWithCheckbox(showDischargeDateInput, setShowDischargeDateInput, "dischargeDate", "Date de déchargement (Navire)", "Date de déchargement")}
            {renderDateFieldWithCheckbox(showTruckLoadingDateInput, setShowTruckLoadingDateInput, "truckLoadingDate", "Date de chargement (Camion)", "Date de chargement camion")}
            {renderDateFieldWithCheckbox(showDestinationArrivalDateInput, setShowDestinationArrivalDateInput, "destinationArrivalDate", "Date d'arrivée (Destination)", "Date d'arrivée destination")}
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
            {(isSubmitting || (isLoadingBls && !isBlContextProvided)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Sauvegarder Modifications" : "Ajouter Conteneur"}
            </Button>
        </div>
      </form>
    </Form>
  );
}

