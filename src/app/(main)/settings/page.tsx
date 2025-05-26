
"use client";

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Bell, Database, UserCircle, Loader2, Logs, Briefcase, Building } from 'lucide-react'; 
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { updateUserProfileInFirestore, getCompanyProfileFromFirestore, updateCompanyProfileInFirestore } from '@/lib/mock-data';
import type { CompanyProfile } from '@/lib/types';
import Link from 'next/link';
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form"; // Added Form, FormField, FormItem

const profileFormSchema = z.object({
  displayName: z.string().min(1, { message: "Le nom d'affichage ne peut pas être vide." }),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const companyProfileFormSchema = z.object({
  appName: z.string().optional(),
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  companyEmail: z.string().email({ message: "Veuillez entrer un email valide." }).optional().or(z.literal('')),
  companyPhone: z.string().optional(),
});
type CompanyProfileFormValues = z.infer<typeof companyProfileFormSchema>;


export default function SettingsPage() {
  const { user, loading: authLoading, isAdmin } = useAuth(); 
  const { toast } = useToast();
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingCompanyProfile, setIsSubmittingCompanyProfile] = useState(false);
  const [initialCompanyProfile, setInitialCompanyProfile] = useState<CompanyProfile | null>(null);

  const userProfileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
    },
  });

  const companyForm = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileFormSchema),
    defaultValues: {
      appName: '',
      companyName: '',
      companyAddress: '',
      companyEmail: '',
      companyPhone: '',
    },
  });

  const fetchCompanyProfile = useCallback(async () => {
    if (isAdmin) {
      try {
        const profile = await getCompanyProfileFromFirestore();
        setInitialCompanyProfile(profile);
        if (profile) {
          companyForm.reset(profile);
        }
      } catch (error) {
        console.error("Failed to fetch company profile for settings:", error);
        toast({ title: "Erreur", description: "Impossible de charger les informations de l'entreprise.", variant: "destructive" });
      }
    }
  }, [isAdmin, companyForm, toast]);


  useEffect(() => {
    if (user?.displayName) {
      userProfileForm.reset({ displayName: user.displayName });
    }
    fetchCompanyProfile();
  }, [user, userProfileForm, fetchCompanyProfile]);


  const onUserProfileSubmit = async (data: ProfileFormValues) => {
    if (!user || !auth.currentUser) {
      toast({ title: "Erreur", description: "Utilisateur non authentifié.", variant: "destructive" });
      return;
    }
    setIsSubmittingProfile(true);
    try {
      await updateProfile(auth.currentUser, { displayName: data.displayName });
      await updateUserProfileInFirestore(user.uid, { displayName: data.displayName });
      
      toast({ title: "Profil Utilisateur Mis à Jour", description: "Votre nom d'affichage a été mis à jour." });
    } catch (error) {
      console.error("Error updating user profile:", error);
      toast({ title: "Erreur de Mise à Jour", description: "Impossible de mettre à jour le profil utilisateur.", variant: "destructive" });
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const onCompanyProfileSubmit = async (data: CompanyProfileFormValues) => {
    if (!isAdmin) {
      toast({ title: "Non Autorisé", description: "Seuls les administrateurs peuvent modifier ces informations.", variant: "destructive" });
      return;
    }
    setIsSubmittingCompanyProfile(true);
    try {
      await updateCompanyProfileInFirestore(data);
      toast({ title: "Informations de l'Entreprise Mises à Jour", description: "Les détails ont été sauvegardés." });
      fetchCompanyProfile(); 
    } catch (error) {
      console.error("Error updating company profile:", error);
      toast({ title: "Erreur de Sauvegarde", description: "Impossible de sauvegarder les informations de l'entreprise.", variant: "destructive" });
    } finally {
      setIsSubmittingCompanyProfile(false);
    }
  };


  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Chargement des paramètres...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Configurez votre profil et les options de l'application."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5 text-primary" /> Mon Profil</CardTitle>
            <CardDescription>Gérez vos informations personnelles.</CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <Form {...userProfileForm}>
                <form onSubmit={userProfileForm.handleSubmit(onUserProfileSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user.email || ''} disabled className="mt-1" />
                  </div>
                  <FormField
                    control={userProfileForm.control}
                    name="displayName"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <Label htmlFor="displayName">Nom d'affichage</Label>
                        <FormControl>
                          <Input
                            id="displayName"
                            {...field}
                            placeholder="Votre nom complet"
                            disabled={isSubmittingProfile}
                            className="mt-1"
                          />
                        </FormControl>
                        {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmittingProfile}>
                    {isSubmittingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sauvegarder le Profil
                  </Button>
                </form>
              </Form>
            ) : (
              <p className="text-muted-foreground">Chargement du profil utilisateur...</p>
            )}
          </CardContent>
        </Card>
        
        {isAdmin && (
          <Card className="shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" /> Informations de l'Entreprise</CardTitle>
              <CardDescription>Modifiez les informations générales de l'application et de l'entreprise.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(onCompanyProfileSubmit)} className="space-y-4">
                  <FormField
                    control={companyForm.control}
                    name="appName"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="appName">Nom de l'Application</Label>
                        <FormControl>
                           <Input id="appName" placeholder="Ex: TransitFlow" {...field} disabled={isSubmittingCompanyProfile} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={companyForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="companyName">Nom de l'Entreprise</Label>
                         <FormControl>
                           <Input id="companyName" placeholder="Ex: Votre Entreprise SARL" {...field} disabled={isSubmittingCompanyProfile} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={companyForm.control}
                    name="companyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="companyAddress">Adresse de l'Entreprise</Label>
                        <FormControl>
                           <Input id="companyAddress" placeholder="Ex: 123 Rue Principale, Ville" {...field} disabled={isSubmittingCompanyProfile} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={companyForm.control}
                    name="companyEmail"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="companyEmail">Email de l'Entreprise</Label>
                        <FormControl>
                           <Input id="companyEmail" type="email" placeholder="Ex: contact@entreprise.com" {...field} disabled={isSubmittingCompanyProfile} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={companyForm.control}
                    name="companyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <Label htmlFor="companyPhone">Téléphone de l'Entreprise</Label>
                        <FormControl>
                           <Input id="companyPhone" type="tel" placeholder="Ex: +221 33 800 00 00" {...field} disabled={isSubmittingCompanyProfile} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmittingCompanyProfile}>
                    {isSubmittingCompanyProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sauvegarder les Informations
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notifications et Alertes</CardTitle>
            <CardDescription>Configurez les préférences de notification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailNotifications">Notifications par email</Label>
              <Switch id="emailNotifications" defaultChecked disabled />
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="approvalNotifications">Alertes d'approbation</Label>
              <Switch id="approvalNotifications" defaultChecked disabled/>
            </div>
            <p className="text-xs text-muted-foreground">
                Les configurations de notification seront disponibles dans une future version.
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
           <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Données et Audit</CardTitle>
            <CardDescription>Gérez les options d'exportation des données et la traçabilité.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <h4 className="font-medium">Journal d'audit (Sessions)</h4>
                <p className="text-sm text-muted-foreground">
                    Consultez l'historique des connexions et déconnexions.
                </p>
                {isAdmin ? (
                  <Link href="/admin/audit-log/sessions" passHref>
                    <Button variant="outline">
                      <Logs className="mr-2 h-4 w-4" /> 
                      Voir le journal d'audit
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" disabled>Voir le journal d'audit (Admin)</Button>
                )}
            </div>
            <Separator/>
            <div className="space-y-2">
                <h4 className="font-medium">Exportation Comptable</h4>
                <p className="text-sm text-muted-foreground">
                    Configurez les formats et options pour l'exportation comptable.
                </p>
                <Button variant="outline" disabled>Configurer l'export (Bientôt disponible)</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
