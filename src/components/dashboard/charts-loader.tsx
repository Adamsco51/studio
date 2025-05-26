
"use client";

import dynamic from 'next/dynamic';
import type { ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart as PieChartIcon, Activity, Loader2 } from 'lucide-react'; // Added Loader2

// Define the props for this component, matching what DashboardCharts expects
interface ChartsLoaderProps {
  blStatusChartData: Array<{ status: string; count: number; fill: string }>;
  blStatusChartConfig: ChartConfig;
  monthlyExpensesChartData: Array<{ month: string; totalExpenses: number }>;
  monthlyExpensesChartConfig: ChartConfig;
  isLoading: boolean; // Add isLoading prop
}

const DashboardCharts = dynamic(() => import('@/components/dashboard/dashboard-charts'), {
  ssr: false, // Keep ssr:false for recharts if it was specifically needed
  loading: () => ( // This loading state is for the dynamic import itself.
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            Chargement Graphique Statuts...
          </CardTitle>
          <CardDescription>Statuts de BL.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[250px] aspect-square">
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
             Chargement Graphique Dépenses...
          </CardTitle>
          <CardDescription>Dépenses mensuelles.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[250px]">
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    </>
  )
});

export default function ChartsLoader({ 
  blStatusChartData, 
  blStatusChartConfig,
  monthlyExpensesChartData,
  monthlyExpensesChartConfig,
  isLoading // Destructure isLoading
}: ChartsLoaderProps) {
  // If parent component (DashboardPage) is loading data, show a more generic loading state for charts.
  if (isLoading) {
    return (
      <>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-6 w-6 text-purple-500" />
              Répartition des Statuts de BL
            </CardTitle>
            <CardDescription>Chargement des données...</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[250px] aspect-square">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-red-500" />
              Évolution des Dépenses Mensuelles
            </CardTitle>
            <CardDescription>Chargement des données...</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[250px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </>
    );
  }

  // If data is loaded, render DashboardCharts.
  // The dynamic import's own loading state handles the initial component load.
  return (
    <DashboardCharts 
      blStatusChartData={blStatusChartData} 
      blStatusChartConfig={blStatusChartConfig}
      monthlyExpensesChartData={monthlyExpensesChartData}
      monthlyExpensesChartConfig={monthlyExpensesChartConfig}
    />
  );
}
