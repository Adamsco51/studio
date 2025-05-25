
"use client";

import dynamic from 'next/dynamic';
import type { ChartConfig } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';

// Define the props for this component, matching what DashboardCharts expects
interface ChartsLoaderProps {
  blStatusChartData: Array<{ status: string; count: number; fill: string }>;
  blStatusChartConfig: ChartConfig;
}

const DashboardCharts = dynamic(() => import('@/components/dashboard/dashboard-charts'), {
  ssr: false,
  loading: () => (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-6 w-6 text-purple-500" />
          Chargement du graphique...
        </CardTitle>
        <CardDescription>Visualisation du nombre de BLs par statut.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center min-h-[250px] aspect-square">
        <p className="text-muted-foreground">Chargement...</p>
      </CardContent>
    </Card>
  )
});

export default function ChartsLoader({ blStatusChartData, blStatusChartConfig }: ChartsLoaderProps) {
  return <DashboardCharts blStatusChartData={blStatusChartData} blStatusChartConfig={blStatusChartConfig} />;
}
