
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
// Removed Textarea import: import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SecretaryDocument, SecretaryDocumentType, SecretaryDocumentStatus, Client, BillOfLading } from "@/lib/types";
import { SECRETARY_DOCUMENT_TYPES, SECRETARY_DOCUMENT_STATUSES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { 
    addSecretaryDocumentToFirestore, 
    updateSecretaryDocumentInFirestore,
    getClientsFromFirestore, 
    getBLsFromFirestore,      
} from "@/lib/mock-data";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Send } from "lucide-react";
import dynamic from 'next/dynamic';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-[200px] border rounded-md bg-muted/50"><Loader2 className="h-6 w-6 animate-spin text-primary"/> <span className="ml-2 text-muted-foreground">Chargement éditeur...</span></div>,
});


const documentFormSchema = z.object({
  title: z.string().min(3, { message: "Le titre doit contenir au moins 3 caractères." }),
  documentType: z.custom<SecretaryDocumentType>((val) => SECRETARY_DOCUMENT_TYPES.includes(val as SecretaryDocumentType), {
    message: "Veuillez sélectionner un type de document valide.",
  }),
  content: z.string().min(10, { message: "Le contenu doit contenir au moins 10 caractères." }),
  status: z.custom<SecretaryDocumentStatus>((val) => SECRETARY_DOCUMENT_STATUSES.includes(val as SecretaryDocumentStatus), {
    message: "Veuillez sélectionner un statut valide.",
  }),
  version: z.coerce.number().int().positive({ message: "La version doit être un nombre positif." }).default(1),
  relatedClientId: z.string().nullable().optional(),
  relatedBlId: z.string().nullable().optional(),
  recipientEmail: z.string().email({ message: "Veuillez entrer un email valide." }).nullable().optional().or(z.literal('')),
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

interface DocumentFormProps {
  initialData?: SecretaryDocument | null;
}

const NO_SELECTION_VALUE = "NONE";

export function SecretaryDocumentForm({ initialData }: DocumentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [bls, setBls] = useState<BillOfLading[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);

  const fetchDropdownData = useCallback(async () => {
    setIsLoadingDropdowns(true);
    try {
        const [fetchedClients, fetchedBls] = await Promise.all([
            getClientsFromFirestore(),
            getBLsFromFirestore(),
        ]);
        setClients(fetchedClients);
        setBls(fetchedBls);
    } catch (error) {
        console.error("Error fetching dropdown data for secretary form:", error);
        toast({ title: "Erreur de chargement", description: "Impossible de charger les listes de clients/BLs.", variant: "destructive" });
    } finally {
        setIsLoadingDropdowns(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
  }), []);


  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      relatedClientId: initialData.relatedClientId || null,
      relatedBlId: initialData.relatedBlId || null,
      recipientEmail: initialData.recipientEmail || '',
    } : {
      title: "",
      documentType: "lettre",
      content: "",
      status: "brouillon",
      version: 1,
      relatedClientId: null,
      relatedBlId: null,
      recipientEmail: '',
    },
  });

  async function onSubmit(data: DocumentFormValues) {
    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const payload: Omit<SecretaryDocument, 'id' | 'createdAt' | 'updatedAt' | 'createdByUserId'> = {
        ...data,
        relatedClientId: data.relatedClientId === NO_SELECTION_VALUE ? null : data.relatedClientId,
        relatedBlId: data.relatedBlId === NO_SELECTION_VALUE ? null : data.relatedBlId,
        recipientEmail: data.recipientEmail || null,
    };

    try {
      if (initialData && initialData.id) {
        await updateSecretaryDocumentInFirestore(initialData.id, { ...payload, version: initialData.version + 1 });
      } else {
        await addSecretaryDocumentToFirestore({ ...payload, createdByUserId: user.uid, createdByUserName: user.displayName || user.email || "Utilisateur inconnu" });
      }
      toast({
        title: initialData ? "Document Modifié" : "Document Créé",
        description: `Le document "${data.title}" a été ${initialData ? 'modifié' : 'enregistré'}.`,
      });
      router.push("/secretary/documents");
      router.refresh();
    } catch (error) {
      console.error("Failed to save document:", error);
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
    <Card className="max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>{initialData ? "Modifier le Document" : "Nouveau Document (Secrétariat)"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre du Document</FormLabel>
                  <FormControl><Input placeholder="Ex: Lettre de relance Client X" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Type de Document</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un type" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {SECRETARY_DOCUMENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Statut du Document</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez un statut" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {SECRETARY_DOCUMENT_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
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
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenu du Document</FormLabel>
                  <FormControl>
                     <ReactQuill 
                        theme="snow" 
                        value={field.value} 
                        onChange={field.onChange}
                        modules={quillModules}
                        className="bg-background text-foreground" // Added for better theme integration
                        readOnly={isSubmitting}
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="relatedClientId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Client Associé (Optionnel)</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value === NO_SELECTION_VALUE ? null : value)} value={field.value ?? NO_SELECTION_VALUE} disabled={isSubmitting || isLoadingDropdowns}>
                                <FormControl><SelectTrigger><SelectValue placeholder={isLoadingDropdowns ? "Chargement..." : "Aucun client"} /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value={NO_SELECTION_VALUE}>Aucun Client</SelectItem>
                                    {clients.map(client => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="relatedBlId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>BL Associé (Optionnel)</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value === NO_SELECTION_VALUE ? null : value)} value={field.value ?? NO_SELECTION_VALUE} disabled={isSubmitting || isLoadingDropdowns}>
                                <FormControl><SelectTrigger><SelectValue placeholder={isLoadingDropdowns ? "Chargement..." : "Aucun BL"} /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value={NO_SELECTION_VALUE}>Aucun BL</SelectItem>
                                    {bls.map(bl => <SelectItem key={bl.id} value={bl.id}>{bl.blNumber}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
                control={form.control}
                name="recipientEmail"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email du Destinataire (Optionnel)</FormLabel>
                        <FormControl><Input type="email" placeholder="Ex: destinataire@example.com" {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                        <FormDescription>Pour l'envoi direct du document.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version</FormLabel>
                  <FormControl><Input type="number" {...field} disabled={true} className="bg-muted/50" /></FormControl>
                  <FormDescription>La version est incrémentée automatiquement à chaque modification.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-between items-center pt-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="outline" disabled={true} className="cursor-not-allowed">
                      <Send className="mr-2 h-4 w-4"/>
                      Envoyer par Email
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fonctionnalité bientôt disponible</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting || isLoadingDropdowns}>
                  {(isSubmitting || isLoadingDropdowns) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {initialData ? "Sauvegarder" : "Créer Document"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
