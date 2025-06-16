
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Truck, TruckStatus, Driver } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { 
    addTruckToFirestore, 
    updateTruckInFirestore, 
    getEmployeeNameFromMock,
    getDriversFromFirestore, // To fetch drivers for assignment
    updateDriverInFirestore, // To update driver's assignment
    getDriverByIdFromFirestore,
} from "@/lib/mock-data";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { Loader2, CalendarDays, UserCircle2 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from "@/components/ui/separator";

const NO_DRIVER_ASSIGNED = "NO_DRIVER_ASSIGNED_VALUE";

const truckStatusOptions: { value: TruckStatus; label: string }[] = [
  { value: "available", label: "Disponible" },
  { value: "in_transit", label: "En Transit" },
  { value: "maintenance", label: "En Maintenance" },
  { value: "out_of_service", label: "Hors Service" },
];

const truckFormSchema = z.object({
  registrationNumber: z.string().min(3, { message: "Le numéro d'immatriculation doit contenir au moins 3 caractères." }),
  model: z.string().optional(),
  capacity: z.string().optional(),
  status: z.enum(["available", "in_transit", "maintenance", "out_of_service"], {
    required_error: "Veuillez sélectionner un statut pour le camion.",
  }),
  currentDriverId: z.string().nullable().optional(), // Can be null or a driver's ID
  notes: z.string().optional(),
});

type TruckFormValues = z.infer<typeof truckFormSchema>;

interface TruckFormProps {
  initialData?: Truck | null;
}

export function TruckForm({ initialData }: TruckFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      setIsLoadingDrivers(true);
      try {
        const allDrivers = await getDriversFromFirestore();
        // Filter for drivers who are 'available' OR are the currently assigned driver to this truck
        const filteredDrivers = allDrivers.filter(driver => 
            driver.status === 'available' || 
            (initialData && driver.id === initialData.currentDriverId)
        );
        setAvailableDrivers(filteredDrivers);
      } catch (error) {
        console.error("Failed to fetch drivers for truck form:", error);
        toast({ title: "Erreur", description: "Impossible de charger la liste des chauffeurs disponibles.", variant: "destructive"});
      } finally {
        setIsLoadingDrivers(false);
      }
    };
    fetchDrivers();
  }, [initialData, toast]);

  const form = useForm<TruckFormValues>({
    resolver: zodResolver(truckFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      model: initialData.model || "",
      capacity: initialData.capacity || "",
      currentDriverId: initialData.currentDriverId || null,
      notes: initialData.notes || "",
    } : {
      registrationNumber: "",
      model: "",
      capacity: "",
      status: "available",
      currentDriverId: null,
      notes: "",
    },
  });

  useEffect(() => {
    if (initialData) {
         form.reset({
            ...initialData,
            model: initialData.model || "",
            capacity: initialData.capacity || "",
            currentDriverId: initialData.currentDriverId || null,
            notes: initialData.notes || "",
        });
    }
  },[initialData, form])


  const createdByUserName = initialData?.createdByUserId
    ? getEmployeeNameFromMock(initialData.createdByUserId)
    : user?.displayName || "Utilisateur Actuel";


  async function onSubmit(data: TruckFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const truckId = initialData?.id;
    const previousDriverId = initialData?.currentDriverId || null;
    const newDriverId = data.currentDriverId === NO_DRIVER_ASSIGNED ? null : data.currentDriverId;

    let newDriverName: string | null = null;
    let newDriverStatus: DriverStatus = 'available';
    let newTruckStatusForDriverOp: TruckStatus = data.status;

    if (newDriverId) {
        const driverDetails = availableDrivers.find(d => d.id === newDriverId) || (newDriverId ? await getDriverByIdFromFirestore(newDriverId) : null);
        if (driverDetails) {
            newDriverName = driverDetails.name;
            if (data.status === 'in_transit') newDriverStatus = 'on_trip';
            else if (data.status === 'available') newDriverStatus = 'available';
            // If truck is maintenance/out_of_service, driver should ideally be available
            else if (data.status === 'maintenance' || data.status === 'out_of_service') newDriverStatus = 'available';
        } else if (newDriverId) { // Driver ID provided but not found in available list (should not happen with current filter)
             toast({ title: "Erreur", description: "Chauffeur sélectionné introuvable.", variant: "destructive"});
             setIsSubmitting(false);
             return;
        }
    }
    
    // If the truck is not available, any assigned driver should become available
    if (data.status === 'maintenance' || data.status === 'out_of_service') {
        newDriverStatus = 'available';
    }


    const truckPayload: Partial<Truck> = {
      ...data,
      currentDriverId: newDriverId,
      currentDriverName: newDriverName,
    };

    try {
      // 1. Handle unassignment of the previous driver if different from new or if new is null
      if (previousDriverId && previousDriverId !== newDriverId) {
        await updateDriverInFirestore(previousDriverId, {
          currentTruckId: null,
          currentTruckReg: null,
          status: 'available', // Make previous driver available
        });
      }

      // 2. Handle assignment of the new driver
      if (newDriverId) {
        await updateDriverInFirestore(newDriverId, {
          currentTruckId: truckId || "TEMP_TRUCK_ID_PLACEHOLDER", // Placeholder if new truck
          currentTruckReg: data.registrationNumber,
          status: newDriverStatus,
        });
      }
      
      // 3. Save the truck (either add new or update existing)
      if (truckId) { // Editing existing truck
        await updateTruckInFirestore(truckId, truckPayload);
         if (newDriverId && truckPayload.currentTruckId === "TEMP_TRUCK_ID_PLACEHOLDER") {
            // If it was a new truck, its ID is now known, update driver again
            await updateDriverInFirestore(newDriverId, { currentTruckId: truckId });
        }
        toast({ title: "Camion Modifié", description: `Le camion ${data.registrationNumber} a été modifié.` });
      } else { // Adding new truck
        const newTruckFullData = await addTruckToFirestore({
             ...(truckPayload as Omit<Truck, 'id' | 'createdAt'>), 
             createdByUserId: user.uid 
        });
        if (newDriverId) {
          // Update the newly assigned driver with the actual new truck's ID
          await updateDriverInFirestore(newDriverId, { currentTruckId: newTruckFullData.id });
        }
        toast({ title: "Camion Ajouté", description: `Le camion ${data.registrationNumber} a été ajouté.` });
      }

      router.push("/trucks");
      router.refresh();
    } catch (error) {
      console.error("Failed to save truck and/or update driver:", error);
      toast({
        title: "Erreur de Sauvegarde",
        description: `Échec de la sauvegarde. ${error instanceof Error ? error.message : ""}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{initialData ? "Modifier le Camion" : "Ajouter un Nouveau Camion"}</CardTitle>
      </CardHeader>
      <CardContent>
         {initialData && initialData.createdAt && (
          <div className="mb-6 space-y-3 p-4 border rounded-md bg-muted/30">
            <div className="flex items-center text-sm text-muted-foreground">
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Créé le: {format(parseISO(initialData.createdAt), 'dd MMMM yyyy, HH:mm', { locale: fr })}</span>
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
              name="registrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro d'Immatriculation</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: DK-1234-AB" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modèle (Optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Renault Premium 420" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacité (Optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 1x40ft ou 2x20ft, 30 Tonnes" {...field} disabled={isSubmitting} />
                  </FormControl>
                   <FormDescription>Décrivez la capacité de chargement du camion.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut du Camion</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un statut" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {truckStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentDriverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chauffeur Assigné (Optionnel)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === NO_DRIVER_ASSIGNED ? null : value)}
                    value={field.value ?? NO_DRIVER_ASSIGNED}
                    disabled={isSubmitting || isLoadingDrivers}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingDrivers ? "Chargement chauffeurs..." : "Aucun chauffeur"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_DRIVER_ASSIGNED}>Aucun Chauffeur</SelectItem>
                      {availableDrivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name} ({driver.status === 'available' ? 'Disponible' : `Actuellement: ${driver.currentTruckReg || 'Voyage'}`})
                        </SelectItem>
                      ))}
                       {initialData?.currentDriverId && !availableDrivers.find(d => d.id === initialData.currentDriverId) && initialData.currentDriverName && (
                            <SelectItem value={initialData.currentDriverId} disabled>
                                {initialData.currentDriverName} (Actuellement assigné)
                            </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Seuls les chauffeurs "disponibles" ou celui déjà assigné à ce camion sont listés.
                  </FormDescription>
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
                  <FormControl>
                    <Textarea
                      placeholder="Informations additionnelles sur le camion..."
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoadingDrivers}>
                {(isSubmitting || isLoadingDrivers) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Sauvegarder" : "Ajouter le Camion"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
