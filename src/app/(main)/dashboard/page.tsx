
"use client"; 

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Users, FileText, DollarSign, CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown, ListChecks, ThumbsUp, ThumbsDown, Sigma, Activity, MessageSquare, Loader2, ListOrdered, ShieldAlert } from 'lucide-react';
import { 
    getClientsFromFirestore, 
    getBLsFromFirestore, 
    getExpensesFromFirestore,
    getApprovalRequestsFromFirestore, // For admin pending approvals
    getApprovalRequestsByUserIdFromFirestore // For user's pending requests
} from '@/lib/mock-data'; 
import type { BillOfLading, Client, Expense, ApprovalRequest } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ChartConfig } from "@/components/ui/chart";
import DashboardCharts from '@/components/dashboard/dashboard-charts'; 
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RecentChatCard } from '@/components/dashboard/recent-chat-card';
import { useAuth } from '@/contexts/auth-context';

export default function DashboardPage() { 
  const { user, isAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [blsData, setBlsData] = useState<BillOfLading[]>([]);
  const [expensesData, setExpensesData] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myPendingRequestsCount, setMyPendingRequestsCount] = useState(0);
  const [adminPendingApprovalsCount, setAdminPendingApprovalsCount] = useState(0);
  const [isLoadingCounters, setIsLoadingCounters] = useState(true);


  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setIsLoadingCounters(false);
      return; 
    }

    setIsLoading(true);
    setIsLoadingCounters(true);

    try {
      const [fetchedClients, fetchedBls, fetchedExpenses] = await Promise.all([
        getClientsFromFirestore(),
        getBLsFromFirestore(),
        getExpensesFromFirestore(),
      ]);
      setClients(fetchedClients);
      setBlsData(fetchedBls);
      setExpensesData(fetchedExpenses);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }

    // Fetch request counts
    try {
      if (isAdmin) {
        const pendingAdminRequests = await getApprovalRequestsFromFirestore('pending');
        setAdminPendingApprovalsCount(pendingAdminRequests.length);
      } else {
        const userRequests = await getApprovalRequestsByUserIdFromFirestore(user.uid);
        const pendingUserReqs = userRequests.filter(
          req => req.status === 'pending' || req.status === 'pin_issued'
        ).length;
        setMyPendingRequestsCount(pendingUserReqs);
      }
    } catch (error) {
        console.error("Error fetching request counts for dashboard:", error);
    } finally {
        setIsLoadingCounters(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const totalClients = clients.length;
  
  const blsByStatus = blsData.reduce((acc, bl) => {
    acc[bl.status] = (acc[bl.status] || 0) + 1;
    return acc;
  }, {} as Record<BillOfLading['status'], number>);

  const totalExpensesGlobal = expensesData.reduce((sum, exp) => sum + exp.amount, 0);

  const calculateTotalProfitability = () => {
    let totalAllocated = 0;
    blsData.forEach(bl => {
      totalAllocated += bl.allocatedAmount;
    });
    return totalAllocated - totalExpensesGlobal;
  };

  const overallProfitability = calculateTotalProfitability();
  const isOverallProfit = overallProfitability >= 0;

  const clientsWithOpenBLs = clients.filter(client => 
    blsData.some(bl => bl.clientId === client.id && bl.status === 'en cours'),
  );

  const stats = [
    { title: 'Rentabilité Globale', value: `${overallProfitability.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}`, icon: isOverallProfit ? TrendingUp : TrendingDown, color: isOverallProfit ? 'text-green-500' : 'text-red-500', link: "/reports" },
    { title: 'Total Dépenses', value: `${totalExpensesGlobal.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}`, icon: DollarSign, color: 'text-red-500', link: "/expenses" },
    { title: 'Total Clients', value: totalClients, icon: Users, color: 'text-primary', link: "/clients" },
    { title: 'BLs en Cours', value: blsByStatus['en cours'] || 0, icon: Clock, color: 'text-blue-500', link: "/bls" },
    { title: 'BLs Terminés', value: blsByStatus['terminé'] || 0, icon: CheckCircle, color: 'text-green-600', link: "/bls?status=terminé" }, // Example of potential future filtering
    { title: 'BLs Inactifs', value: blsByStatus['inactif'] || 0, icon: AlertCircle, color: 'text-gray-500', link: "/bls?status=inactif" },
  ];

  const blProfitabilityStats = () => {
    let profitableBls = 0;
    let lossMakingBls = 0;
    blsData.forEach(bl => {
      const expensesForBl = expensesData.filter(exp => exp.blId === bl.id);
      const totalExpensesForBl = expensesForBl.reduce((sum, exp) => sum + exp.amount, 0);
      const balance = bl.allocatedAmount - totalExpensesForBl;
      if (balance >= 0) {
        profitableBls++;
      } else {
        lossMakingBls++;
      }
    });
    return {
      totalBls: blsData.length,
      profitableBls,
      lossMakingBls,
    };
  };

  const { totalBls, profitableBls, lossMakingBls } = blProfitabilityStats();

  const blStatusChartData = [
    { status: 'en cours', count: blsByStatus['en cours'] || 0, fill: 'var(--color-en_cours)' },
    { status: 'terminé', count: blsByStatus['terminé'] || 0, fill: 'var(--color-terminé)' },
    { status: 'inactif', count: blsByStatus['inactif'] || 0, fill: 'var(--color-inactif)' },
  ].filter(d => d.count > 0);

  const blStatusChartConfig = {
    'en cours': { label: 'En Cours', color: 'hsl(var(--chart-1))' },
    terminé: { label: 'Terminés', color: 'hsl(var(--chart-2))' },
    inactif: { label: 'Inactifs', color: 'hsl(var(--chart-3))' },
    count: { label: 'Nombre de BLs' },
  } satisfies ChartConfig;

  const expensesByMonthAggregated: Record<string, number> = {};
  expensesData.forEach(expense => {
    if (!expense.date) return;
    const monthKey = format(parseISO(expense.date), 'yyyy-MM'); 
    expensesByMonthAggregated[monthKey] = (expensesByMonthAggregated[monthKey] || 0) + expense.amount;
  });
  const sortedMonthKeys = Object.keys(expensesByMonthAggregated).sort();
  const monthlyExpensesChartData = sortedMonthKeys.map(monthKey => {
    const [year, monthNum] = monthKey.split('-');
    const dateForLabel = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return {
      month: format(dateForLabel, 'MMM yy', { locale: fr }), 
      totalExpenses: expensesByMonthAggregated[monthKey],
    };
  });
  const monthlyExpensesChartConfig = {
    totalExpenses: { label: "Dépenses Totales", color: "hsl(var(--chart-4))" },
    month: { label: "Mois" },
  } satisfies ChartConfig;

  if (isLoading && isLoadingCounters) { // Keep main loading until both base data and counters are ready
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Tableau de Bord" description="Vue d'ensemble de vos opérations et performances." />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
        {stats.map((stat) => (
          <Link href={stat.link || "/dashboard"} key={stat.title} className="flex">
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col w-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent className="flex-grow">
                <div className={`text-2xl font-bold ${stat.color}`}>{typeof stat.value === 'number' && stat.title !== 'Rentabilité Globale' && stat.title !== 'Total Dépenses' ? stat.value : stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* Dynamic Request/Approval Cards */}
        {!isAdmin && (
            <Link href="/my-requests" className="flex">
                 <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col w-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Mes Demandes en Attente</CardTitle>
                        <ListOrdered className="h-5 w-5 text-orange-500" />
                    </CardHeader>
                    <CardContent className="flex-grow">
                        {isLoadingCounters ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : <div className="text-2xl font-bold text-orange-500">{myPendingRequestsCount}</div>}
                    </CardContent>
                </Card>
            </Link>
        )}
        {isAdmin && (
             <Link href="/admin/approvals" className="flex">
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col w-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Approbations Requises</CardTitle>
                        <ShieldAlert className="h-5 w-5 text-yellow-500" />
                    </CardHeader>
                    <CardContent className="flex-grow">
                         {isLoadingCounters ? <Loader2 className="h-6 w-6 animate-spin text-primary"/> : <div className="text-2xl font-bold text-yellow-500">{adminPendingApprovalsCount}</div>}
                    </CardContent>
                </Card>
            </Link>
        )}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-2 items-stretch"> 
        <DashboardCharts 
          blStatusChartData={blStatusChartData} 
          blStatusChartConfig={blStatusChartConfig} 
          monthlyExpensesChartData={monthlyExpensesChartData}
          monthlyExpensesChartConfig={monthlyExpensesChartConfig}
        />
      </div>
      
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
        <Card className="shadow-lg flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" />
              Analyse de Rentabilité des BLs
            </CardTitle>
            <CardDescription>Rentabilité des connaissements enregistrés.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-grow">
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
          </CardContent>
           <CardFooter className="pt-2">
              <Link href="/bls" passHref className="w-full">
                  <Button variant="outline" className="w-full">Voir tous les BLs</Button>
              </Link>
          </CardFooter>
        </Card>

        <Card className="shadow-lg flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-accent" />
              Aperçu Clients
            </CardTitle>
             <CardDescription>Clients avec des opérations en cours.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
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
          </CardContent>
          <CardFooter className="pt-4">
              <Link href="/clients" passHref className="w-full">
                  <Button variant="outline" className="w-full">Voir tous les clients</Button>
              </Link>
          </CardFooter>
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

    