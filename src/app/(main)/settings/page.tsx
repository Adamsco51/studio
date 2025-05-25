import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Users, ShieldCheck, Bell, Database } from 'lucide-react';

export default function SettingsPage() {
  // This page is a placeholder for actual settings functionality.
  // In a real app, these would interact with a backend.

  return (
    <>
      <PageHeader
        title="Paramètres de l'Application"
        description="Configurez les options générales de TransitFlow et gérez les accès."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Informations de l'Entreprise</CardTitle>
            <CardDescription>Modifiez les informations de base de votre entreprise.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="appName">Nom de l'application</Label>
              <Input id="appName" defaultValue="TransitFlow" />
            </div>
            <div>
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <Input id="companyName" placeholder="Votre Entreprise SARL" />
            </div>
            <div>
              <Label htmlFor="companyAddress">Adresse de l'entreprise</Label>
              <Input id="companyAddress" placeholder="123 Rue Principale, Paris" />
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
