
"use client";

import dynamic from 'next/dynamic';
import type { ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart as PieChartIcon, Activity } from 'lucide-react'; // Added Activity

// Define the props for this component, matching what DashboardCharts expects
interface ChartsLoaderProps {
  blStatusChartData: Array<{ status: string; count: number; fill: string }>;
  blStatusChartConfig: ChartConfig;
  monthlyExpensesChartData: Array<{ month: string; totalExpenses: number }>;
  monthlyExpensesChartConfig: ChartConfig;
}

const DashboardCharts = dynamic(() => import('@/components/dashboard/dashboard-charts'), {
  ssr: false,
  loading: () => (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-6 w-6 text-purple-500" />
            Chargement...
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
            <Activity className="h-6 w-6 text-red-500" />
            Chargement...
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
  monthlyExpensesChartConfig 
}: ChartsLoaderProps) {
  return (
    <DashboardCharts 
      blStatusChartData={blStatusChartData} 
      blStatusChartConfig={blStatusChartConfig}
      monthlyExpensesChartData={monthlyExpensesChartData}
      monthlyExpensesChartConfig={monthlyExpensesChartConfig}
    />
  );
}
