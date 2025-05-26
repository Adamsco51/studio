
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
import { PieChart as PieChartIcon, Activity } from 'lucide-react'; 

// Define the props for this component
interface DashboardChartsProps {
  blStatusChartData: Array<{ status: string; count: number; fill: string }>;
  blStatusChartConfig: ChartConfig;
  monthlyExpensesChartData: Array<{ month: string; totalExpenses: number }>;
  monthlyExpensesChartConfig: ChartConfig;
}

export default function DashboardCharts({ 
  blStatusChartData, 
  blStatusChartConfig,
  monthlyExpensesChartData,
  monthlyExpensesChartConfig
}: DashboardChartsProps) {

  return (
    <>
      {/* BL Status Pie Chart */}
      {blStatusChartData && blStatusChartData.length > 0 ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-6 w-6 text-purple-500" />
              Répartition des Statuts de BL
            </CardTitle>
            <CardDescription>Visualisation du nombre de BLs par statut.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
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
                  label={false}
                  innerRadius="30%" 
                  outerRadius="70%"
                  paddingAngle={2}
                  cy="45%"
                >
                  {blStatusChartData.map((entry) => (
                    <RechartsPrimitive.Cell
                      key={`cell-status-${entry.status}`}
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
      ) : (
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
      )}

      {/* Monthly Expenses Line Chart */}
      {monthlyExpensesChartData && monthlyExpensesChartData.length > 0 ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-red-500" />
              Évolution des Dépenses Mensuelles
            </CardTitle>
            <CardDescription>Total des dépenses enregistrées par mois.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthlyExpensesChartConfig} className="h-[250px] w-full">
              <RechartsPrimitive.LineChart
                accessibilityLayer
                data={monthlyExpensesChartData}
                margin={{
                  left: 0, 
                  right: 12,
                  top: 5,
                  bottom: 5,
                }}
              >
                <RechartsPrimitive.CartesianGrid vertical={false} strokeDasharray="3 3" />
                <RechartsPrimitive.XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <RechartsPrimitive.YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', notation: 'compact', compactDisplay: 'short', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  domain={['auto', 'auto']}
                />
                <ChartTooltip
                  cursor={true}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <RechartsPrimitive.Line
                  dataKey="totalExpenses"
                  type="monotone"
                  stroke="var(--color-totalExpenses)" 
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: "var(--color-totalExpenses)",
                    opacity: 1,
                  }}
                  activeDot={{
                    r: 6,
                    strokeWidth: 1,
                    fill: "hsl(var(--background))",
                    stroke: "var(--color-totalExpenses)",
                  }}
                />
              </RechartsPrimitive.LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : (
         <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-6 w-6 text-red-500" />
                    Évolution des Dépenses Mensuelles
                </CardTitle>
                <CardDescription>Aucune donnée de dépense à afficher.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[250px]">
                <p className="text-muted-foreground">Pas de données pour le graphique.</p>
            </CardContent>
        </Card>
      )}
    </>
  );
}
