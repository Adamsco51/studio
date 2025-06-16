
"use client";

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Bell, Database, UserCircle, Loader2, Logs, Briefcase, Building, Mail, KeyRound } from 'lucide-react'; 
import { useAuth } from '@/contexts/auth-context';
import { useCompanyProfile } from '@/contexts/company-profile-context';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { updateUserProfileInFirestore, updateCompanyProfileInFirestore } from '@/lib/mock-data';
import type { CompanyProfile, UserProfile, UserProfileJobTitle } from '@/lib/types';
import { USER_PROFILE_JOB_TITLES } from '@/lib/types';
import Link from 'next/link';
import { Form, FormField, FormItem, FormControl, FormMessage, FormDescription } from "@/components/ui/form";

const userProfileFormSchema = z.object({
  displayName: z.string().min(1, { message: "Le nom d'affichage ne peut pas être vide." }),
  jobTitle: z.custom<UserProfileJobTitle>((val) => USER_PROFILE_JOB_TITLES.includes(val as UserProfileJobTitle), {
    message: "Veuillez sélectionner un poste valide.",
  }),
});
type UserProfileFormValues = z.infer<typeof userProfileFormSchema>;

const emailFormSchema = z.object({
  newEmail: z.string().email({ message: "Veuillez entrer une adresse email valide." }),
});
type EmailFormValues = z.infer<typeof emailFormSchema>;

const passwordFormSchema = z.object({
  newPassword: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const companyProfileFormSchema = z.object({
  appName: z.string().optional(),
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  companyEmail: z.string().email({ message: "Veuillez entrer un email valide." }).optional().or(z.literal('')),
  companyPhone: z.string().optional(),
});
type CompanyProfileFormValues = z.infer<typeof companyProfileFormSchema>;

export default function SettingsPage() {
  const { user, loading: authLoading, isAdmin, refreshAuthContextUser } = useAuth(); 
  const { companyProfile, refreshProfile: refreshCompanyProfile, loadingProfile } = useCompanyProfile();
  const { toast } = useToast();

  const [isSubmittingUserProfile, setIsSubmittingUserProfile] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isSubmittingCompanyProfile, setIsSubmittingCompanyProfile] = useState(false);
  
  const userSettingsForm = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileFormSchema),
    defaultValues: { 
      displayName: '',
      jobTitle: 'Agent Opérationnel',
    },
  });

  const emailSettingsForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { newEmail: '' },
  });

  const passwordSettingsForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const companySettingsForm = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileFormSchema),
    defaultValues: {
      appName: '',
      companyName: '',
      companyAddress: '',
      companyEmail: '',
      companyPhone: '',
    },
  });

  useEffect(() => {
    if (user) {
      userSettingsForm.reset({ 
        displayName: user.displayName || '',
        jobTitle: user.jobTitle || 'Agent Opérationnel',
      });
      emailSettingsForm.reset({ newEmail: user.email || '' });
    }
    if (isAdmin && companyProfile) {
      companySettingsForm.reset(companyProfile);
    } else if (isAdmin && !companyProfile && !loadingProfile) {
        companySettingsForm.reset({
            appName: 'TransitFlow',
            companyName: '',
            companyAddress: '',
            companyEmail: '',
            companyPhone: '',
        });
    }
  }, [user, companyProfile, isAdmin, userSettingsForm, emailSettingsForm, companySettingsForm, loadingProfile]);

  const onUserSettingsSubmit = async (data: UserProfileFormValues) => {
    if (!user || !auth.currentUser) {
      toast({ title: "Erreur", description: "Utilisateur non authentifié.", variant: "destructive" });
      return;
    }
    setIsSubmittingUserProfile(true);
    try {
      const updates: Partial<UserProfile> = {};
      if (data.displayName !== user.displayName) {
        await updateProfile(auth.currentUser, { displayName: data.displayName });
        updates.displayName = data.displayName;
      }
      if (data.jobTitle !== user.jobTitle) {
        updates.jobTitle = data.jobTitle;
      }

      if (Object.keys(updates).length > 0) {
        await updateUserProfileInFirestore(user.uid, updates);
        await refreshAuthContextUser(); // Refresh user in AuthContext
        toast({ title: "Profil Utilisateur Mis à Jour", description: "Vos informations personnelles ont été mises à jour." });
      } else {
        toast({ title: "Information", description: "Aucune modification détectée.", variant: "default" });
      }
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      toast({ title: "Erreur de Mise à Jour", description: error.message || "Impossible de mettre à jour le profil utilisateur.", variant: "destructive" });
    } finally {
      setIsSubmittingUserProfile(false);
    }
  };

  const onEmailSettingsSubmit = async (data: EmailFormValues) => {
    if (!user || !auth.currentUser) {
      toast({ title: "Erreur", description: "Utilisateur non authentifié.", variant: "destructive" });
      return;
    }
    if (auth.currentUser.email === data.newEmail) {
        toast({ title: "Information", description: "Le nouvel email est identique à l'actuel.", variant: "default" });
        return;
    }
    setIsSubmittingEmail(true);
    try {
      await updateEmail(auth.currentUser, data.newEmail);
      await updateUserProfileInFirestore(user.uid, { email: data.newEmail });
      await refreshAuthContextUser();
      toast({ title: "Email Mis à Jour", description: "Votre email a été mis à jour. Vous devrez peut-être vous reconnecter." });
    } catch (error: any) {
      console.error("Error updating email:", error);
      toast({ title: "Erreur de Mise à Jour Email", description: error.message || "Impossible de mettre à jour l'email. Une reconnexion récente peut être nécessaire.", variant: "destructive" });
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const onPasswordSettingsSubmit = async (data: PasswordFormValues) => {
    if (!user || !auth.currentUser) {
      toast({ title: "Erreur", description: "Utilisateur non authentifié.", variant: "destructive" });
      return;
    }
    setIsSubmittingPassword(true);
    try {
      await updatePassword(auth.currentUser, data.newPassword);
      toast({ title: "Mot de Passe Mis à Jour", description: "Votre mot de passe a été changé avec succès." });
      passwordSettingsForm.reset();
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({ title: "Erreur de Mise à Jour Mot de Passe", description: error.message || "Impossible de changer le mot de passe. Une reconnexion récente peut être nécessaire.", variant: "destructive" });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const onCompanySettingsSubmit = async (data: CompanyProfileFormValues) => {
    if (!isAdmin) {
      toast({ title: "Non Autorisé", description: "Seuls les administrateurs peuvent modifier ces informations.", variant: "destructive" });
      return;
    }
    setIsSubmittingCompanyProfile(true);
    try {
      await updateCompanyProfileInFirestore(data);
      await refreshCompanyProfile();
      toast({ title: "Informations de l'Entreprise Mises à Jour", description: "Les détails ont été sauvegardés." });
    } catch (error: any) {
      console.error("Error updating company profile:", error);
      toast({ title: "Erreur de Sauvegarde", description: error.message || "Impossible de sauvegarder les informations de l'entreprise.", variant: "destructive" });
    } finally {
      setIsSubmittingCompanyProfile(false);
    }
  };

  if (authLoading || (isAdmin && loadingProfile)) {
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
        <Card className="shadow-lg lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCircle className="h-5 w-5 text-primary" /> Mon Profil</CardTitle>
            <CardDescription>Gérez vos informations personnelles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {user ? (
              <>
                <Form {...userSettingsForm}>
                  <form onSubmit={userSettingsForm.handleSubmit(onUserSettingsSubmit)} className="space-y-4">
                    <div>
                      <Label htmlFor="currentEmail">Email Actuel</Label>
                      <Input id="currentEmail" type="email" value={user.email || ''} disabled className="mt-1 bg-muted/50" />
                    </div>
                    <FormField
                      control={userSettingsForm.control}
                      name="displayName"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <Label htmlFor="displayName">Nom d'affichage</Label>
                          <FormControl>
                            <Input id="displayName" {...field} placeholder="Votre nom complet" disabled={isSubmittingUserProfile} className="mt-1" />
                          </FormControl>
                          {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userSettingsForm.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <Label htmlFor="jobTitle">Poste</Label>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isSubmittingUserProfile}>
                            <FormControl>
                              <SelectTrigger id="jobTitle" className="mt-1">
                                <SelectValue placeholder="Sélectionner un poste" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {USER_PROFILE_JOB_TITLES.map((title) => (
                                <SelectItem key={title} value={title}>{title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isSubmittingUserProfile} className="w-full">
                      {isSubmittingUserProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sauvegarder Profil
                    </Button>
                  </form>
                </Form>
                <Separator />
                <Form {...emailSettingsForm}>
                   <h3 className="text-md font-medium flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/> Changer d'Adresse Email</h3>
                  <form onSubmit={emailSettingsForm.handleSubmit(onEmailSettingsSubmit)} className="space-y-4">
                    <FormField
                      control={emailSettingsForm.control}
                      name="newEmail"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <Label htmlFor="newEmail">Nouvel Email</Label>
                          <FormControl>
                            <Input id="newEmail" type="email" {...field} placeholder="nouveau@example.com" disabled={isSubmittingEmail} className="mt-1" />
                          </FormControl>
                           <FormDescription className="text-xs">Un email de vérification pourrait être envoyé. Le changement d'email peut nécessiter une reconnexion.</FormDescription>
                          {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isSubmittingEmail} className="w-full">
                      {isSubmittingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Changer l'Email
                    </Button>
                  </form>
                </Form>
                <Separator />
                <Form {...passwordSettingsForm}>
                   <h3 className="text-md font-medium flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground"/> Changer de Mot de Passe</h3>
                  <form onSubmit={passwordSettingsForm.handleSubmit(onPasswordSettingsSubmit)} className="space-y-4">
                     <FormField
                      control={passwordSettingsForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <Label htmlFor="newPassword">Nouveau Mot de Passe</Label>
                          <FormControl><Input id="newPassword" type="password" {...field} placeholder="********" disabled={isSubmittingPassword} className="mt-1" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={passwordSettingsForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <Label htmlFor="confirmPassword">Confirmer Nouveau Mot de Passe</Label>
                          <FormControl><Input id="confirmPassword" type="password" {...field} placeholder="********" disabled={isSubmittingPassword} className="mt-1" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormDescription className="text-xs">Le changement de mot de passe peut nécessiter une reconnexion récente pour des raisons de sécurité.</FormDescription>
                    <Button type="submit" disabled={isSubmittingPassword} className="w-full">
                      {isSubmittingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Changer le Mot de Passe
                    </Button>
                  </form>
                </Form>
              </>
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
              <Form {...companySettingsForm}>
                <form onSubmit={companySettingsForm.handleSubmit(onCompanySettingsSubmit)} className="space-y-4">
                  <FormField control={companySettingsForm.control} name="appName" render={({ field }) => (<FormItem><Label htmlFor="appName">Nom de l'Application</Label><FormControl><Input id="appName" placeholder="Ex: TransitFlow" {...field} disabled={isSubmittingCompanyProfile || loadingProfile} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={companySettingsForm.control} name="companyName" render={({ field }) => (<FormItem><Label htmlFor="companyName">Nom de l'Entreprise</Label><FormControl><Input id="companyName" placeholder="Ex: Votre Entreprise SARL" {...field} disabled={isSubmittingCompanyProfile || loadingProfile} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={companySettingsForm.control} name="companyAddress" render={({ field }) => (<FormItem><Label htmlFor="companyAddress">Adresse de l'Entreprise</Label><FormControl><Input id="companyAddress" placeholder="Ex: 123 Rue Principale, Ville" {...field} disabled={isSubmittingCompanyProfile || loadingProfile} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={companySettingsForm.control} name="companyEmail" render={({ field }) => (<FormItem><Label htmlFor="companyEmail">Email de l'Entreprise</Label><FormControl><Input id="companyEmail" type="email" placeholder="Ex: contact@entreprise.com" {...field} disabled={isSubmittingCompanyProfile || loadingProfile} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={companySettingsForm.control} name="companyPhone" render={({ field }) => (<FormItem><Label htmlFor="companyPhone">Téléphone de l'Entreprise</Label><FormControl><Input id="companyPhone" type="tel" placeholder="Ex: +221 33 800 00 00" {...field} disabled={isSubmittingCompanyProfile || loadingProfile} /></FormControl><FormMessage /></FormItem>)} />
                  <Button type="submit" disabled={isSubmittingCompanyProfile || loadingProfile}>
                    {(isSubmittingCompanyProfile || (isAdmin && loadingProfile)) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sauvegarder les Informations
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg lg:col-span-1">
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
            <p className="text-xs text-muted-foreground">Les configurations de notification seront disponibles dans une future version.</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg lg:col-span-2">
           <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /> Données et Audit</CardTitle>
            <CardDescription>Gérez les options d'exportation des données et la traçabilité.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <h4 className="font-medium">Journal d'audit (Sessions)</h4>
                <p className="text-sm text-muted-foreground">Consultez l'historique des connexions et déconnexions.</p>
                {isAdmin ? (
                  <Link href="/admin/audit-log/sessions" passHref>
                    <Button variant="outline"><Logs className="mr-2 h-4 w-4" />Voir le journal d'audit</Button>
                  </Link>
                ) : (
                  <Button variant="outline" disabled>Voir le journal d'audit (Admin)</Button>
                )}
            </div>
            <Separator/>
            <div className="space-y-2">
                <h4 className="font-medium">Exportation Comptable</h4>
                <p className="text-sm text-muted-foreground">Configurez les formats et options pour l'exportation comptable.</p>
                <Button variant="outline" disabled>Configurer l'export (Bientôt disponible)</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
