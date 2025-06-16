
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
import type { Driver, DriverStatus, Truck } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { 
    addDriverToFirestore, 
    updateDriverInFirestore, 
    getEmployeeNameFromMock,
    getTrucksFromFirestore, // To fetch trucks for assignment
    updateTruckInFirestore, // To update truck's assignment
    getTruckByIdFromFirestore,
} from "@/lib/mock-data";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { Loader2, CalendarDays, UserCircle2 } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from "@/components/ui/separator";

const NO_TRUCK_ASSIGNED = "NO_TRUCK_ASSIGNED_VALUE";

const driverStatusOptions: { value: DriverStatus; label: string }[] = [
  { value: "available", label: "Disponible" },
  { value: "on_trip", label: "En Voyage" },
  { value: "off_duty", label: "En Repos" },
  { value: "unavailable", label: "Indisponible" },
];

const driverFormSchema = z.object({
  name: z.string().min(3, { message: "Le nom du chauffeur doit contenir au moins 3 caractères." }),
  licenseNumber: z.string().min(5, { message: "Le numéro de permis doit être valide." }),
  phone: z.string().min(8, { message: "Le numéro de téléphone doit être valide." }),
  status: z.enum(["available", "on_trip", "off_duty", "unavailable"], {
    required_error: "Veuillez sélectionner un statut pour le chauffeur.",
  }),
  currentTruckId: z.string().nullable().optional(), // Can be null or a truck's ID
  notes: z.string().optional(),
});

type DriverFormValues = z.infer<typeof driverFormSchema>;

interface DriverFormProps {
  initialData?: Driver | null;
}

export function DriverForm({ initialData }: DriverFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTrucks, setAvailableTrucks] = useState<Truck[]>([]);
  const [isLoadingTrucks, setIsLoadingTrucks] = useState(true);


  useEffect(() => {
    const fetchTrucks = async () => {
      setIsLoadingTrucks(true);
      try {
        const allTrucks = await getTrucksFromFirestore();
        // Filter for trucks that are 'available' OR are the currently assigned truck to this driver
        const filteredTrucks = allTrucks.filter(truck => 
            truck.status === 'available' ||
            (initialData && truck.id === initialData.currentTruckId)
        );
        setAvailableTrucks(filteredTrucks);
      } catch (error) {
        console.error("Failed to fetch trucks for driver form:", error);
        toast({ title: "Erreur", description: "Impossible de charger la liste des camions disponibles.", variant: "destructive"});
      } finally {
        setIsLoadingTrucks(false);
      }
    };
    fetchTrucks();
  }, [initialData, toast]);

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      currentTruckId: initialData.currentTruckId || null,
      notes: initialData.notes || "",
    } : {
      name: "",
      licenseNumber: "",
      phone: "",
      status: "available",
      currentTruckId: null,
      notes: "",
    },
  });
  
  useEffect(() => {
    if (initialData) {
         form.reset({
            ...initialData,
            currentTruckId: initialData.currentTruckId || null,
            notes: initialData.notes || "",
        });
    }
  },[initialData, form])

  const createdByUserName = initialData?.createdByUserId
    ? getEmployeeNameFromMock(initialData.createdByUserId)
    : user?.displayName || "Utilisateur Actuel";


  async function onSubmit(data: DriverFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const driverId = initialData?.id;
    const previousTruckId = initialData?.currentTruckId || null;
    const newTruckId = data.currentTruckId === NO_TRUCK_ASSIGNED ? null : data.currentTruckId;
    
    let newTruckReg: string | null = null;
    let newTruckStatus: TruckStatus = 'available';
    let newDriverStatusForTruckOp: DriverStatus = data.status;

    if (newTruckId) {
        const truckDetails = availableTrucks.find(t => t.id === newTruckId) || (newTruckId ? await getTruckByIdFromFirestore(newTruckId) : null);
        if (truckDetails) {
            newTruckReg = truckDetails.registrationNumber;
            if (data.status === 'on_trip') newTruckStatus = 'in_transit';
            else if (data.status === 'available') newTruckStatus = 'available';
             // If driver is off_duty/unavailable, truck should ideally be available
            else if (data.status === 'off_duty' || data.status === 'unavailable') newTruckStatus = 'available';
        } else if (newTruckId) {
            toast({ title: "Erreur", description: "Camion sélectionné introuvable.", variant: "destructive"});
            setIsSubmitting(false);
            return;
        }
    }
    
    // If driver is not available, any assigned truck should become available
    if (data.status === 'off_duty' || data.status === 'unavailable') {
        newTruckStatus = 'available';
    }

    const driverPayload: Partial<Driver> = {
      ...data,
      currentTruckId: newTruckId,
      currentTruckReg: newTruckReg,
    };

    try {
      // 1. Handle unassignment of the previous truck if different from new or if new is null
      if (previousTruckId && previousTruckId !== newTruckId) {
        await updateTruckInFirestore(previousTruckId, {
          currentDriverId: null,
          currentDriverName: null,
          status: 'available', // Make previous truck available
        });
      }

      // 2. Handle assignment of the new truck
      if (newTruckId) {
        await updateTruckInFirestore(newTruckId, {
          currentDriverId: driverId || "TEMP_DRIVER_ID_PLACEHOLDER", // Placeholder if new driver
          currentDriverName: data.name,
          status: newTruckStatus,
        });
      }

      // 3. Save the driver (either add new or update existing)
      if (driverId) { // Editing existing driver
        await updateDriverInFirestore(driverId, driverPayload);
         if (newTruckId && driverPayload.currentTruckId === "TEMP_DRIVER_ID_PLACEHOLDER") {
            // If it was a new driver, its ID is now known, update truck again
            await updateTruckInFirestore(newTruckId, { currentDriverId: driverId });
        }
        toast({ title: "Chauffeur Modifié", description: `Les informations de ${data.name} ont été modifiées.` });
      } else { // Adding new driver
        const newDriverFullData = await addDriverToFirestore({ 
            ...(driverPayload as Omit<Driver, 'id'|'createdAt'>), 
            createdByUserId: user.uid 
        });
        if (newTruckId) {
          // Update the newly assigned truck with the actual new driver's ID
          await updateTruckInFirestore(newTruckId, { currentDriverId: newDriverFullData.id });
        }
        toast({ title: "Chauffeur Ajouté", description: `Le chauffeur ${data.name} a été ajouté.` });
      }
      router.push("/drivers");
      router.refresh();
    } catch (error) {
      console.error("Failed to save driver and/or update truck:", error);
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
        <CardTitle>{initialData ? "Modifier le Chauffeur" : "Ajouter un Nouveau Chauffeur"}</CardTitle>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom Complet du Chauffeur</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Moussa Sow" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="licenseNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de Permis de Conduire</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: P123456789" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de Téléphone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Ex: +221 77 123 45 67" {...field} disabled={isSubmitting} />
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
                  <FormLabel>Statut du Chauffeur</FormLabel>
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
                      {driverStatusOptions.map((option) => (
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
              name="currentTruckId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Camion Assigné (Optionnel)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === NO_TRUCK_ASSIGNED ? null : value)}
                    value={field.value ?? NO_TRUCK_ASSIGNED}
                    disabled={isSubmitting || isLoadingTrucks}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingTrucks ? "Chargement camions..." : "Aucun camion"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_TRUCK_ASSIGNED}>Aucun Camion</SelectItem>
                      {availableTrucks.map((truck) => (
                        <SelectItem key={truck.id} value={truck.id}>
                          {truck.registrationNumber} ({truck.model || 'N/A'}) - {truck.status === 'available' ? 'Disponible' : `Actuellement: ${truck.currentDriverName || 'En transit'}`}
                        </SelectItem>
                      ))}
                      {initialData?.currentTruckId && !availableTrucks.find(t => t.id === initialData.currentTruckId) && initialData.currentTruckReg && (
                        <SelectItem value={initialData.currentTruckId} disabled>
                            {initialData.currentTruckReg} (Actuellement assigné)
                        </SelectItem>
                       )}
                    </SelectContent>
                  </Select>
                   <FormDescription>
                    Seuls les camions "disponibles" ou celui déjà assigné à ce chauffeur sont listés.
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
                      placeholder="Informations additionnelles sur le chauffeur..."
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
              <Button type="submit" disabled={isSubmitting || isLoadingTrucks}>
                {(isSubmitting || isLoadingTrucks) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Sauvegarder" : "Ajouter le Chauffeur"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
