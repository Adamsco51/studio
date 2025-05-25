
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Users, FileText, DollarSign, CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown, ListChecks, ThumbsUp, ThumbsDown, Sigma, Activity, MessageSquare } from 'lucide-react';
import { getClientsFromFirestore, MOCK_BILLS_OF_LADING, MOCK_EXPENSES } from '@/lib/mock-data'; // Import getClientsFromFirestore
import type { BillOfLading, Client } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ChartConfig } from "@/components/ui/chart";
import ChartsLoader from '@/components/dashboard/charts-loader';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RecentChatCard } from '@/components/dashboard/recent-chat-card';


export default async function DashboardPage() { // Make the component async
  const clients: Client[] = await getClientsFromFirestore(); // Fetch clients from Firestore
  const totalClients = clients.length;
  
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

  const clientsWithOpenBLs = clients.filter(client => 
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

  const blProfitabilityStats = () => {
    let profitableBls = 0;
    let lossMakingBls = 0;
    MOCK_BILLS_OF_LADING.forEach(bl => {
      const expensesForBl = MOCK_EXPENSES.filter(exp => exp.blId === bl.id);
      const totalExpensesForBl = expensesForBl.reduce((sum, exp) => sum + exp.amount, 0);
      const balance = bl.allocatedAmount - totalExpensesForBl;
      if (balance >= 0) {
        profitableBls++;
      } else {
        lossMakingBls++;
      }
    });
    return {
      totalBls: MOCK_BILLS_OF_LADING.length,
      profitableBls,
      lossMakingBls,
    };
  };

  const { totalBls, profitableBls, lossMakingBls } = blProfitabilityStats();

  // Data for BL Status Pie Chart
  const blStatusChartData = [
    { status: 'en cours', count: blsByStatus['en cours'] || 0, fill: 'var(--color-en_cours)' },
    { status: 'terminé', count: blsByStatus['terminé'] || 0, fill: 'var(--color-terminé)' },
    { status: 'inactif', count: blsByStatus['inactif'] || 0, fill: 'var(--color-inactif)' },
  ].filter(d => d.count > 0);

  const blStatusChartConfig = {
    'en cours': {
      label: 'En Cours',
      color: 'hsl(var(--chart-1))', 
    },
    terminé: {
      label: 'Terminés',
      color: 'hsl(var(--chart-2))', 
    },
    inactif: {
      label: 'Inactifs',
      color: 'hsl(var(--chart-3))', 
    },
    count: { 
      label: 'Nombre de BLs',
    }
  } satisfies ChartConfig;

  // Data for Monthly Expenses Line Chart
  const expensesByMonthAggregated: Record<string, number> = {};
  MOCK_EXPENSES.forEach(expense => {
    const monthKey = format(parseISO(expense.date), 'yyyy-MM'); // Key for sorting
    expensesByMonthAggregated[monthKey] = (expensesByMonthAggregated[monthKey] || 0) + expense.amount;
  });

  const sortedMonthKeys = Object.keys(expensesByMonthAggregated).sort();

  const monthlyExpensesChartData = sortedMonthKeys.map(monthKey => {
    const [year, monthNum] = monthKey.split('-');
    const dateForLabel = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return {
      month: format(dateForLabel, 'MMM yy', { locale: fr }), // Short month format for X-axis
      totalExpenses: expensesByMonthAggregated[monthKey],
    };
  });
  
  const monthlyExpensesChartConfig = {
    totalExpenses: {
      label: "Dépenses Totales",
      color: "hsl(var(--chart-4))", // Using a different chart color variable
    },
    month: {
      label: "Mois", // Not directly used by line chart data, but good for consistency
    }
  } satisfies ChartConfig;


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
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-2"> 
        <ChartsLoader 
          blStatusChartData={blStatusChartData} 
          blStatusChartConfig={blStatusChartConfig} 
          monthlyExpensesChartData={monthlyExpensesChartData}
          monthlyExpensesChartConfig={monthlyExpensesChartConfig}
        />
      </div>
      
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3"> {/* Adjusted for 3 columns to include chat */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" />
              Analyse de Rentabilité des BLs
            </CardTitle>
            <CardDescription>Rentabilité des connaissements enregistrés.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-md">
              <div className="flex items-center">
                <Sigma className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>Total des Connaissements</span>
              </div>
              <Badge variant="secondary" className="bg-gray-100 text-gray-700">{totalBls}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-md">
              <div className="flex items-center">
                <ThumbsUp className="h-5 w-5 mr-2 text-green-600" />
                <span>BLs Gagnants (Bénéfice)</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700">{profitableBls}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-md">
              <div className="flex items-center">
                <ThumbsDown className="h-5 w-5 mr-2 text-red-500" />
                <span>BLs Perdants (Perte)</span>
              </div>
              <Badge variant="secondary" className="bg-red-100 text-red-700">{lossMakingBls}</Badge>
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
                {clientsWithOpenBLs.slice(0, 5).map(client => ( 
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
        
        <RecentChatCard />

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

    