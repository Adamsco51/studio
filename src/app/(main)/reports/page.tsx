import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Printer, Filter } from 'lucide-react';

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Rapports et Exportations"
        description="Générez des rapports financiers et exportez vos données."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              Rapports Imprimables
            </CardTitle>
            <CardDescription>
              Générez des rapports détaillés par BL, client ou période.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="reportType" className="block text-sm font-medium text-muted-foreground mb-1">Type de rapport</label>
              <select id="reportType" className="w-full p-2 border rounded-md bg-input" disabled>
                <option>Rentabilité par BL</option>
                <option>Dépenses par Client</option>
                <option>Résumé Financier Périodique</option>
              </select>
            </div>
            <div>
              <label htmlFor="reportPeriod" className="block text-sm font-medium text-muted-foreground mb-1">Période</label>
              <input type="month" id="reportPeriod" className="w-full p-2 border rounded-md bg-input" disabled/>
            </div>
            <Button className="w-full" disabled>
              <Filter className="mr-2 h-4 w-4" />
              Filtrer et Générer
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              La génération de rapports sera implémentée prochainement.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Exportation Comptable
            </CardTitle>
            <CardDescription>
              Exportez les données financières pour votre logiciel de comptabilité.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="exportFormat" className="block text-sm font-medium text-muted-foreground mb-1">Format d'export</label>
              <select id="exportFormat" className="w-full p-2 border rounded-md bg-input" disabled>
                <option>CSV</option>
                <option>Excel (XLSX)</option>
                <option>Format Comptable Spécifique (à configurer)</option>
              </select>
            </div>
             <div>
              <label htmlFor="exportDataRange" className="block text-sm font-medium text-muted-foreground mb-1">Plage de données</label>
              <select id="exportDataRange" className="w-full p-2 border rounded-md bg-input" disabled>
                <option>Mois en cours</option>
                <option>Trimestre en cours</option>
                <option>Année en cours</option>
                <option>Personnalisé</option>
              </select>
            </div>
            <Button className="w-full" disabled>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exporter les Données
            </Button>
             <p className="text-xs text-muted-foreground text-center">
              L'exportation comptable sera disponible dans une future mise à jour.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
