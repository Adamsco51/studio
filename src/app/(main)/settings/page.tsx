
"use client";

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Users, ShieldCheck, Bell, Database, UserCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { updateUserProfileInFirestore } from '@/lib/mock-data';

const profileFormSchema = z.object({
  displayName: z.string().min(1, { message: "Le nom d'affichage ne peut pas être vide." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
    },
  });

  useEffect(() => {
    if (user?.displayName) {
      form.reset({ displayName: user.displayName });
    }
  }, [user, form]);

  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user || !auth.currentUser) {
      toast({ title: "Erreur", description: "Utilisateur non authentifié.", variant: "destructive" });
      return;
    }
    setIsSubmittingProfile(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { displayName: data.displayName });
      // Update Firestore profile
      await updateUserProfileInFirestore(user.uid, { displayName: data.displayName });
      
      toast({ title: "Profil Mis à Jour", description: "Votre nom d'affichage a été mis à jour." });
      // AuthContext should pick up the change via onAuthStateChanged, or you might need to manually update it
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Erreur de Mise à Jour", description: "Impossible de mettre à jour le profil.", variant: "destructive" });
    } finally {
      setIsSubmittingProfile(false);
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
              <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={user.email || ''} disabled className="mt-1" />
                </div>
                <Controller
                  name="displayName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div>
                      <Label htmlFor="displayName">Nom d'affichage</Label>
                      <Input
                        id="displayName"
                        {...field}
                        placeholder="Votre nom complet"
                        disabled={isSubmittingProfile}
                        className="mt-1"
                      />
                      {fieldState.error && <p className="text-sm text-destructive mt-1">{fieldState.error.message}</p>}
                    </div>
                  )}
                />
                <Button type="submit" disabled={isSubmittingProfile}>
                  {isSubmittingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sauvegarder le Profil
                </Button>
              </form>
            ) : (
              <p className="text-muted-foreground">Chargement du profil utilisateur...</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Informations de l'Entreprise</CardTitle>
            <CardDescription>Modifiez les informations de base de votre entreprise.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="appName">Nom de l'application</Label>
              <Input id="appName" defaultValue="TransitFlow" disabled />
            </div>
            <div>
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <Input id="companyName" placeholder="Votre Entreprise SARL" disabled />
            </div>
            <div>
              <Label htmlFor="companyAddress">Adresse de l'entreprise</Label>
              <Input id="companyAddress" placeholder="123 Rue Principale, Paris" disabled />
            </div>
            <Button disabled>Sauvegarder les Informations</Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Gestion des Utilisateurs</CardTitle>
            <CardDescription>Gérez les comptes employés et administrateurs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              La gestion des utilisateurs (ajout, modification des rôles, suppression) est une fonctionnalité avancée.
              Pour le moment, cette section est indicative.
            </p>
            <Button variant="outline" disabled>Voir la liste des utilisateurs</Button>
            <Button disabled>Ajouter un nouvel utilisateur</Button>
          </CardContent>
        </Card>
        
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
        
        <Card className="shadow-lg md:col-span-2 lg:col-span-3">
           <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Données et Export</CardTitle>
            <CardDescription>Gérez les options d'exportation des données et la traçabilité.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <h4 className="font-medium">Journal d'audit (Traçabilité)</h4>
                <p className="text-sm text-muted-foreground">
                    Consultez l'historique des connexions, modifications et demandes.
                </p>
                <Button variant="outline" disabled>Voir le journal d'audit</Button>
            </div>
            <Separator/>
            <div className="space-y-2">
                <h4 className="font-medium">Exportation Comptable</h4>
                <p className="text-sm text-muted-foreground">
                    Configurez les formats et options pour l'exportation comptable.
                </p>
                <Button variant="outline" disabled>Configurer l'export</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
