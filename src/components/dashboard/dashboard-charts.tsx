
"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart as PieChartIcon } from 'lucide-react';

// Define the props for this component
interface DashboardChartsProps {
  blStatusChartData: Array<{ status: string; count: number; fill: string }>;
  blStatusChartConfig: ChartConfig;
}

export default function DashboardCharts({ blStatusChartData, blStatusChartConfig }: DashboardChartsProps) {
  if (!blStatusChartData || blStatusChartData.length === 0) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-6 w-6 text-purple-500" />
                    Répartition des Statuts de BL
                </CardTitle>
                <CardDescription>Aucune donnée de statut de BL à afficher.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[250px] aspect-square">
                <p className="text-muted-foreground">Pas de données pour le graphique.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-6 w-6 text-purple-500" />
          Répartition des Statuts de BL
        </CardTitle>
        <CardDescription>Visualisation du nombre de BLs par statut.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0"> {/* Adjusted padding for better visual with chart legend */}
        <ChartContainer config={blStatusChartConfig} className="mx-auto aspect-square max-h-[250px]">
          <RechartsPrimitive.PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="status" />}
            />
            <RechartsPrimitive.Pie
              data={blStatusChartData}
              dataKey="count"
              nameKey="status" 
              labelLine={false}
              label={false} // Set to false, legend will show labels
              innerRadius="30%" 
              outerRadius="70%"
              paddingAngle={2}
              cy="45%" // Adjusted for legend below
            >
              {blStatusChartData.map((entry) => (
                <RechartsPrimitive.Cell
                  key={`cell-${entry.status}`} // Ensure unique key
                  fill={entry.fill}
                  className="focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-offset-1 dark:focus-visible:ring-ring/80 dark:focus-visible:ring-offset-background"
                />
              ))}
            </RechartsPrimitive.Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="status" />}
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ paddingTop: '10px', paddingBottom: '0px' }}
            />
          </RechartsPrimitive.PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

