
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, Printer, Filter, Loader2, AlertTriangle } from 'lucide-react';
import { getBLsFromFirestore, getExpensesFromFirestore, getClientsFromFirestore } from '@/lib/mock-data'; 
import type { BillOfLading, Expense, Client } from '@/lib/types'; 
import { format, parse, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

type ReportType = "profitability_bl" | "expenses_client" | "financial_summary";

interface ProfitabilityBlResult {
  blNumber: string;
  clientName?: string; 
  allocatedAmount: number;
  totalExpenses: number;
  profit: number;
  createdAt: string;
}

export default function ReportsPage() {
  const [selectedReportType, setSelectedReportType] = useState<ReportType | undefined>(undefined);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(""); // YYYY-MM
  const [isLoadingData, setIsLoadingData] = useState(true); 
  const [isGeneratingReport, setIsGeneratingReport] = useState(false); 
  const [reportResults, setReportResults] = useState<ProfitabilityBlResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const [allBls, setAllBls] = useState<BillOfLading[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]); 

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [bls, expenses, clients] = await Promise.all([
        getBLsFromFirestore(),
        getExpensesFromFirestore(),
        getClientsFromFirestore(), 
      ]);
      setAllBls(bls);
      setAllExpenses(expenses);
      setAllClients(clients); 
    } catch (err) {
      console.error("Error fetching base data for reports:", err);
      toast({ title: "Erreur", description: "Impossible de charger les données de base pour les rapports.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getClientName = useCallback((clientId: string) => {
    return allClients.find(c => c.id === clientId)?.name || 'N/A';
  }, [allClients]);

  const handleGenerateReport = async () => {
    if (!selectedReportType || !selectedPeriod) {
      toast({ title: "Sélection Requise", description: "Veuillez sélectionner un type de rapport et une période.", variant: "destructive" });
      return;
    }
    setIsGeneratingReport(true);
    setError(null);
    setReportResults(null);

    try {
      const periodDate = parse(selectedPeriod, 'yyyy-MM', new Date());
      const periodStart = startOfMonth(periodDate);
      const periodEnd = endOfMonth(periodDate);

      if (selectedReportType === "profitability_bl") {
        const filteredBls = allBls.filter(bl => 
          bl.createdAt && isWithinInterval(parseISO(bl.createdAt), { start: periodStart, end: periodEnd }),
        );

        if (filteredBls.length === 0) {
          toast({ title: "Aucune Donnée", description: `Aucun BL trouvé pour ${format(periodDate, 'MMMM yyyy', { locale: fr })}.` });
          setReportResults([]);
          setIsGeneratingReport(false);
          return;
        }
        
        const results: ProfitabilityBlResult[] = filteredBls.map(bl => {
          const expensesForBl = allExpenses.filter(exp => exp.blId === bl.id);
          const totalExpenses = expensesForBl.reduce((sum, exp) => sum + exp.amount, 0);
          return {
            blNumber: bl.blNumber,
            clientName: getClientName(bl.clientId), 
            allocatedAmount: bl.allocatedAmount,
            totalExpenses,
            profit: bl.allocatedAmount - totalExpenses,
            createdAt: bl.createdAt,
          };
        }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReportResults(results);
        toast({ title: "Rapport Généré", description: `Rentabilité par BL pour ${format(periodDate, 'MMMM yyyy', { locale: fr })}.` });

      } else {
        toast({ title: "Non Implémenté", description: "Ce type de rapport n'est pas encore disponible.", variant: "default" });
      }
    } catch (err: any) {
      console.error("Error generating report:", err);
      setError("Erreur lors de la génération du rapport.");
      toast({ title: "Erreur de Rapport", description: err.message || "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (isLoadingData) {
    return (
      <>
        <PageHeader
            title="Rapports et Exportations"
            description="Générez des rapports financiers et exportez vos données."
        />
        <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement des données de base...</p>
        </div>
      </>
    )
  }

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
              <Select 
                value={selectedReportType} 
                onValueChange={(value) => setSelectedReportType(value as ReportType)}
                disabled={isGeneratingReport}
              >
                <SelectTrigger id="reportType">
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profitability_bl">Rentabilité par BL</SelectItem>
                  <SelectItem value="expenses_client" disabled>Dépenses par Client (bientôt)</SelectItem>
                  <SelectItem value="financial_summary" disabled>Résumé Financier Périodique (bientôt)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="reportPeriod" className="block text-sm font-medium text-muted-foreground mb-1">Période (Mois/Année)</label>
              <Input 
                type="month" 
                id="reportPeriod" 
                className="w-full p-2 border rounded-md bg-input" 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                disabled={isGeneratingReport}
              />
            </div>
            <Button className="w-full" onClick={handleGenerateReport} disabled={isGeneratingReport || !selectedReportType || !selectedPeriod || allBls.length === 0}>
              {isGeneratingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
              Filtrer et Générer
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Exportation Comptable
            </CardTitle>
            <CardDescription>
              Exportez les données financières pour votre logiciel de comptabilité. (Fonctionnalité à venir)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="exportFormat" className="block text-sm font-medium text-muted-foreground mb-1">Format d'export</label>
              <select id="exportFormat" className="w-full p-2 border rounded-md bg-input" disabled>
                <option>CSV</option>
                <option>Excel (XLSX)</option>
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
              Exporter les Données (Bientôt)
            </Button>
          </CardContent>
        </Card>
      </div>

      {isGeneratingReport && (
        <div className="mt-6 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Génération du rapport...</p>
        </div>
      )}

      {error && (
        <Card className="mt-6 bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Erreur de Rapport
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {reportResults && !isGeneratingReport && !error && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle>
              Résultats: {selectedReportType === "profitability_bl" && selectedPeriod ? `Rentabilité par BL pour ${format(parse(selectedPeriod, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: fr })}` : "Rapport"}
            </CardTitle>
            {reportResults.length === 0 && <CardDescription>Aucun résultat à afficher pour la période sélectionnée.</CardDescription>}
          </CardHeader>
          <CardContent>
            {selectedReportType === "profitability_bl" && reportResults.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° BL</TableHead>
                      <TableHead>Client</TableHead> 
                      <TableHead>Date Création</TableHead>
                      <TableHead className="text-right">Montant Alloué</TableHead>
                      <TableHead className="text-right">Dépenses Totales</TableHead>
                      <TableHead className="text-right">Bénéfice / Perte</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportResults.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.blNumber}</TableCell>
                        <TableCell>{item.clientName}</TableCell> 
                        <TableCell>{item.createdAt ? format(parseISO(item.createdAt), 'dd MMM yyyy', { locale: fr }) : 'N/A'}</TableCell>
                        <TableCell className="text-right">{item.allocatedAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</TableCell>
                        <TableCell className="text-right">{item.totalExpenses.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</TableCell>
                        <TableCell className={`text-right font-semibold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.profit.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {selectedReportType !== "profitability_bl" && (
                 <p className="text-muted-foreground">Ce type de rapport n'est pas encore affiché ici.</p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

    
