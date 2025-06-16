
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
import { Checkbox } from "@/components/ui/checkbox";
import type { Transport, TransportStatus, BillOfLading, Container, Truck, Driver } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
    addTransportToFirestore,
    updateTransportInFirestore,
    getBLsFromFirestore,
    getContainersByBlIdFromFirestore,
    getTrucksFromFirestore,
    getDriversFromFirestore,
    getTransportByIdFromFirestore,
} from "@/lib/mock-data";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect, useCallback } from "react";
import { Loader2, CalendarIcon, UserCircle2, Route } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const transportStatusOptions: { value: TransportStatus; label: string }[] = [
  { value: "planned", label: "Planifié" },
  { value: "in_progress", label: "En Cours" },
  { value: "completed", label: "Terminé" },
  { value: "delayed", label: "Retardé" },
  { value: "cancelled", label: "Annulé" },
];

const transportFormSchema = z.object({
  transportNumber: z.string().min(3, { message: "Le N° de transport doit contenir au moins 3 caractères." }),
  blId: z.string({ required_error: "Veuillez sélectionner un Connaissement (BL)." }),
  containerIds: z.array(z.string()).min(1, { message: "Veuillez sélectionner au moins un conteneur." }),
  truckId: z.string().nullable().optional(),
  driverId: z.string().nullable().optional(),
  origin: z.string().min(3, { message: "L'origine est requise." }),
  destination: z.string().min(3, { message: "La destination est requise." }),
  plannedDepartureDate: z.string({ required_error: "La date de départ prévue est requise." }),
  plannedArrivalDate: z.string({ required_error: "La date d'arrivée prévue est requise." }),
  actualDepartureDate: z.string().nullable().optional(),
  actualArrivalDate: z.string().nullable().optional(),
  status: z.enum(["planned", "in_progress", "completed", "delayed", "cancelled"]),
  totalCost: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type TransportFormValues = z.infer<typeof transportFormSchema>;

interface TransportFormProps {
  initialData?: Transport | null;
  transportId?: string;
}

export function TransportForm({ initialData: passedInitialData, transportId }: TransportFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(!!transportId && !passedInitialData);
  const [internalInitialData, setInternalInitialData] = useState(passedInitialData);

  const [bls, setBls] = useState<BillOfLading[]>([]);
  const [containersForSelectedBl, setContainersForSelectedBl] = useState<Container[]>([]);
  const [availableTrucks, setAvailableTrucks] = useState<Truck[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);

  const isEditing = !!internalInitialData;

  const formatDateForInput = (dateString?: string | null) => {
    if (!dateString) return undefined;
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'yyyy-MM-dd') : undefined;
  };
  
  const form = useForm<TransportFormValues>({
    resolver: zodResolver(transportFormSchema),
    defaultValues: {
      transportNumber: "",
      blId: "",
      containerIds: [],
      truckId: null,
      driverId: null,
      origin: "",
      destination: "",
      plannedDepartureDate: "",
      plannedArrivalDate: "",
      actualDepartureDate: null,
      actualArrivalDate: null,
      status: "planned",
      totalCost: 0,
      notes: "",
    },
  });

  const selectedBlId = form.watch("blId");

  useEffect(() => {
    if (transportId && !passedInitialData) {
      setIsLoadingInitialData(true);
      getTransportByIdFromFirestore(transportId)
        .then(data => {
          setInternalInitialData(data);
          if (data) {
            form.reset({
              ...data,
              plannedDepartureDate: formatDateForInput(data.plannedDepartureDate)!,
              plannedArrivalDate: formatDateForInput(data.plannedArrivalDate)!,
              actualDepartureDate: formatDateForInput(data.actualDepartureDate),
              actualArrivalDate: formatDateForInput(data.actualArrivalDate),
            });
          }
        })
        .catch(err => {
          toast({ title: "Erreur", description: "Impossible de charger les données du transport.", variant: "destructive" });
        })
        .finally(() => setIsLoadingInitialData(false));
    } else if (passedInitialData) {
       form.reset({
          ...passedInitialData,
          plannedDepartureDate: formatDateForInput(passedInitialData.plannedDepartureDate)!,
          plannedArrivalDate: formatDateForInput(passedInitialData.plannedArrivalDate)!,
          actualDepartureDate: formatDateForInput(passedInitialData.actualDepartureDate),
          actualArrivalDate: formatDateForInput(passedInitialData.actualArrivalDate),
        });
    }
  }, [transportId, passedInitialData, form, toast]);


  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingDropdowns(true);
      try {
        const [fetchedBls, fetchedTrucks, fetchedDrivers] = await Promise.all([
          getBLsFromFirestore(),
          getTrucksFromFirestore(),
          getDriversFromFirestore(),
        ]);
        setBls(fetchedBls.filter(bl => bl.status === 'en cours')); // Only show active BLs
        setAvailableTrucks(fetchedTrucks.filter(t => t.status === 'available' || (internalInitialData && t.id === internalInitialData.truckId)));
        setAvailableDrivers(fetchedDrivers.filter(d => d.status === 'available' || (internalInitialData && d.id === internalInitialData.driverId)));
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de charger les listes pour le formulaire.", variant: "destructive" });
      } finally {
        setIsLoadingDropdowns(false);
      }
    };
    fetchData();
  }, [toast, internalInitialData]);

  useEffect(() => {
    if (selectedBlId) {
      setIsLoadingDropdowns(true); // Indicate loading containers for selected BL
      getContainersByBlIdFromFirestore(selectedBlId)
        .then(fetchedContainers => {
          setContainersForSelectedBl(fetchedContainers);
          // If editing, ensure initialData.containerIds are valid and available
          if (isEditing && internalInitialData?.containerIds) {
            const validInitialContainerIds = internalInitialData.containerIds.filter(id => 
              fetchedContainers.some(c => c.id === id)
            );
            form.setValue("containerIds", validInitialContainerIds);
          } else {
            // When BL changes for a new form, or if initial data is not yet set, reset selected containers
            // only if not editing or if editing and the BL ID changes
            if (!isEditing || (isEditing && selectedBlId !== internalInitialData?.blId)) {
                 form.setValue("containerIds", []);
            }
          }
        })
        .catch(err => {
          toast({ title: "Erreur", description: "Impossible de charger les conteneurs pour le BL sélectionné.", variant: "destructive" });
          setContainersForSelectedBl([]);
        })
        .finally(() => setIsLoadingDropdowns(false));
    } else {
      setContainersForSelectedBl([]);
      if (!isEditing) form.setValue("containerIds", []); // Clear if no BL selected on new form
    }
  }, [selectedBlId, toast, isEditing, internalInitialData, form]);


  async function onSubmit(data: TransportFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const payload = {
      ...data,
      createdByUserId: internalInitialData?.createdByUserId || user.uid,
      totalCost: data.totalCost || 0,
      truckId: data.truckId || null,
      driverId: data.driverId || null,
      actualDepartureDate: data.actualDepartureDate || null,
      actualArrivalDate: data.actualArrivalDate || null,
      notes: data.notes || null,
    };

    try {
      if (isEditing && internalInitialData?.id) {
        await updateTransportInFirestore(internalInitialData.id, payload);
        toast({ title: "Transport Modifié", description: `Le transport N° ${data.transportNumber} a été modifié.` });
      } else {
        await addTransportToFirestore(payload);
        toast({ title: "Transport Créé", description: `Le transport N° ${data.transportNumber} a été créé.` });
      }
      router.push("/transports");
      router.refresh();
    } catch (error) {
      console.error("Failed to save transport:", error);
      toast({
        title: "Erreur de Sauvegarde",
        description: `Échec de la sauvegarde du transport. ${error instanceof Error ? error.message : ''}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const createdByUserName = internalInitialData?.createdByUserId
  ? MOCK_USERS.find(u => u.id === internalInitialData.createdByUserId)?.name || 
    (user?.uid === internalInitialData.createdByUserId ? user.displayName || user.email : "Utilisateur Système")
  : user?.displayName || "Utilisateur Actuel";


  if (isLoadingInitialData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Chargement des données du transport...</p>
      </div>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{isEditing ? "Modifier le Transport" : "Créer un Nouveau Transport"}</CardTitle>
         {isEditing && internalInitialData?.createdAt && (
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>Créé le: {format(parseISO(internalInitialData.createdAt), 'dd MMMM yyyy, HH:mm', { locale: fr })}</span>
            </div>
            {createdByUserName && (
                <div className="flex items-center">
                    <UserCircle2 className="mr-2 h-4 w-4" />
                    <span>Créé par: {createdByUserName}</span>
                </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="transportNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de Transport</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: TRN-2024-001" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="blId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Connaissement (BL)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || isLoadingDropdowns || bls.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingDropdowns ? "Chargement..." : (bls.length === 0 ? "Aucun BL actif" : "Sélectionnez un BL")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bls.map((bl) => (
                          <SelectItem key={bl.id} value={bl.id}>{bl.blNumber}</SelectItem>
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
              name="containerIds"
              render={() => (
                <FormItem>
                  <FormLabel>Conteneurs</FormLabel>
                  {isLoadingDropdowns && selectedBlId ? <p className="text-sm text-muted-foreground">Chargement des conteneurs...</p> :
                   !selectedBlId ? <p className="text-sm text-muted-foreground">Veuillez d'abord sélectionner un BL.</p> :
                   containersForSelectedBl.length === 0 ? <p className="text-sm text-muted-foreground">Aucun conteneur trouvé pour ce BL.</p> :
                   (
                    <div className="space-y-2 rounded-md border p-4 max-h-48 overflow-y-auto">
                      {containersForSelectedBl.map((container) => (
                        <FormField
                          key={container.id}
                          control={form.control}
                          name="containerIds"
                          render={({ field }) => {
                            return (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(container.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), container.id])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (value) => value !== container.id
                                            )
                                          )
                                    }}
                                    disabled={isSubmitting}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {container.containerNumber} ({container.type}) - Statut: {container.status}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="truckId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Camion Assigné</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "NONE" ? null : val)} value={field.value ?? "NONE"} disabled={isSubmitting || isLoadingDropdowns}>
                        <FormControl><SelectTrigger><SelectValue placeholder={isLoadingDropdowns ? "Chargement..." : "Sélectionnez un camion"} /></SelectTrigger></FormControl>
                        <SelectContent>
                        <SelectItem value="NONE">Aucun camion</SelectItem>
                        {availableTrucks.map((truck) => (
                            <SelectItem key={truck.id} value={truck.id}>{truck.registrationNumber} ({truck.model || 'N/A'})</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Chauffeur Assigné</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "NONE" ? null : val)} value={field.value ?? "NONE"} disabled={isSubmitting || isLoadingDropdowns}>
                        <FormControl><SelectTrigger><SelectValue placeholder={isLoadingDropdowns ? "Chargement..." : "Sélectionnez un chauffeur"} /></SelectTrigger></FormControl>
                        <SelectContent>
                        <SelectItem value="NONE">Aucun chauffeur</SelectItem>
                        {availableDrivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="origin"
                    render={({ field }) => (
                        <FormItem><FormLabel>Origine</FormLabel><FormControl><Input placeholder="Ex: Port de Dakar" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                        <FormItem><FormLabel>Destination</FormLabel><FormControl><Input placeholder="Ex: Bamako, Mali" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { name: "plannedDepartureDate", label: "Date de Départ Prévue" },
                { name: "plannedArrivalDate", label: "Date d'Arrivée Prévue" },
                { name: "actualDepartureDate", label: "Date de Départ Réelle (Optionnel)" },
                { name: "actualArrivalDate", label: "Date d'Arrivée Réelle (Optionnel)" },
              ].map(dateField => (
                <FormField
                    key={dateField.name}
                    control={form.control}
                    name={dateField.name as keyof TransportFormValues}
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>{dateField.label}</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                                disabled={isSubmitting}
                                >
                                {field.value && isValid(parseISO(field.value as string)) ? 
                                    format(parseISO(field.value as string), "PPP", { locale: fr }) : 
                                    <span>Choisir une date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value && isValid(parseISO(field.value as string)) ? parseISO(field.value as string) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                disabled={isSubmitting}
                                initialFocus
                                locale={fr}
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
              ))}
            </div>
             <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut du Transport</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un statut" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {transportStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coût Total Estimé (XOF) (Optionnel)</FormLabel>
                  <FormControl><Input type="number" placeholder="Ex: 750000" {...field} onChange={event => field.onChange(+event.target.value)} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optionnel)</FormLabel>
                  <FormControl><Textarea placeholder="Détails supplémentaires sur le transport..." {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoadingDropdowns || isLoadingInitialData}>
                {(isSubmitting || isLoadingDropdowns || isLoadingInitialData) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Sauvegarder Modifications" : "Créer le Transport"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
