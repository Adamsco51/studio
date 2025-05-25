
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, FileText, DollarSign, Activity, CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown, ListChecks } from 'lucide-react';
import { MOCK_CLIENTS, MOCK_BILLS_OF_LADING, MOCK_EXPENSES } from '@/lib/mock-data';
import type { BillOfLading, Client } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  const totalClients = MOCK_CLIENTS.length;
  
  const blsByStatus = MOCK_BILLS_OF_LADING.reduce((acc, bl) => {
    acc[bl.status] = (acc[bl.status] || 0) + 1;
    return acc;
  }, {} as Record<BillOfLading['status'], number>);

  const totalExpensesGlobal = MOCK_EXPENSES.reduce((sum, exp) => sum + exp.amount, 0);

  const calculateTotalProfitability = () => {
    let totalAllocated = 0;
    MOCK_BILLS_OF_LADING.forEach(bl => {
      totalAllocated += bl.allocatedAmount;
    });
    return totalAllocated - totalExpensesGlobal;
  };

  const overallProfitability = calculateTotalProfitability();
  const isOverallProfit = overallProfitability >= 0;

  const clientsWithOpenBLs = MOCK_CLIENTS.filter(client => 
    MOCK_BILLS_OF_LADING.some(bl => bl.clientId === client.id && bl.status === 'en cours')
  );

  const stats = [
    { title: 'Rentabilité Globale', value: `${overallProfitability.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, icon: isOverallProfit ? TrendingUp : TrendingDown, color: isOverallProfit ? 'text-green-500' : 'text-red-500' },
    { title: 'Total Dépenses (BLs)', value: `${totalExpensesGlobal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, icon: DollarSign, color: 'text-red-500' },
    { title: 'Total Clients', value: totalClients, icon: Users, color: 'text-primary' },
    { title: 'BLs en Cours', value: blsByStatus['en cours'] || 0, icon: Clock, color: 'text-blue-500' },
    { title: 'BLs Terminés', value: blsByStatus['terminé'] || 0, icon: CheckCircle, color: 'text-green-600' },
    { title: 'BLs Inactifs', value: blsByStatus['inactif'] || 0, icon: AlertCircle, color: 'text-gray-500' },
  ];

  return (
    <>
      <PageHeader title="Tableau de Bord" description="Vue d'ensemble de vos opérations et performances." />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              {/* <p className="text-xs text-muted-foreground mt-1">+20.1% from last month</p> */}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" />
              Statut des Connaissements
            </CardTitle>
            <CardDescription>Répartition des BLs par leur statut actuel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-md">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-500" />
                <span>BLs en Cours</span>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">{blsByStatus['en cours'] || 0}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-md">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                <span>BLs Terminés</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">{blsByStatus['terminé'] || 0}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-gray-500" />
                <span>BLs Inactifs</span>
              </div>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">{blsByStatus['inactif'] || 0}</Badge>
            </div>
             <div className="pt-2">
                <Link href="/bls" passHref>
                    <Button variant="outline" className="w-full">Voir tous les BLs</Button>
                </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-accent" />
              Aperçu Clients
            </CardTitle>
             <CardDescription>Clients avec des opérations en cours.</CardDescription>
          </CardHeader>
          <CardContent>
            {clientsWithOpenBLs.length > 0 ? (
              <ul className="space-y-2">
                {clientsWithOpenBLs.slice(0, 5).map(client => ( // Show top 5
                  <li key={client.id} className="flex justify-between items-center p-2 bg-secondary/30 rounded-md text-sm">
                    <span>{client.name}</span>
                    <Link href={`/clients/${client.id}`} passHref>
                      <Button variant="ghost" size="sm" className="text-xs h-auto py-1">Voir fiche</Button>
                    </Link>
                  </li>
                ))}
                {clientsWithOpenBLs.length > 5 && <p className="text-xs text-muted-foreground text-center mt-2">et {clientsWithOpenBLs.length - 5} autres...</p>}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun client avec des BLs "en cours" actuellement.</p>
            )}
            <div className="pt-4">
                <Link href="/clients" passHref>
                    <Button variant="outline" className="w-full">Voir tous les clients</Button>
                </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle>Bienvenue sur TransitFlow</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Utilisez le menu de navigation à gauche pour gérer vos clients, connaissements (BL), dépenses et plus encore.
            Cette application est conçue pour simplifier et optimiser vos opérations de transit.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
