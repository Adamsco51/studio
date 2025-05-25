import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, DollarSign, Activity } from 'lucide-react';
import { MOCK_CLIENTS, MOCK_BILLS_OF_LADING, MOCK_EXPENSES } from '@/lib/mock-data';

export default function DashboardPage() {
  const totalClients = MOCK_CLIENTS.length;
  const totalBLs = MOCK_BILLS_OF_LADING.length;

  const calculateTotalProfitability = () => {
    let totalNet = 0;
    MOCK_BILLS_OF_LADING.forEach(bl => {
      const expensesForBl = MOCK_EXPENSES.filter(exp => exp.blId === bl.id);
      const totalExpenseAmount = expensesForBl.reduce((sum, exp) => sum + exp.amount, 0);
      totalNet += bl.allocatedAmount - totalExpenseAmount;
    });
    return totalNet;
  };

  const overallProfitability = calculateTotalProfitability();

  const stats = [
    { title: 'Clients Actifs', value: totalClients, icon: Users, color: 'text-primary' },
    { title: 'BLs en Cours', value: totalBLs, icon: FileText, color: 'text-accent' },
    { 
      title: 'Rentabilité Globale', 
      value: `${overallProfitability.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, 
      icon: DollarSign, 
      color: overallProfitability >= 0 ? 'text-green-500' : 'text-red-500' 
    },
    { title: 'Activités Récentes', value: MOCK_EXPENSES.length, icon: Activity, color: 'text-yellow-500' }, // Example
  ];

  return (
    <>
      <PageHeader title="Tableau de Bord" description="Vue d'ensemble de vos opérations de transit." />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
      <div className="mt-8">
        <Card className="shadow-lg">
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
      </div>
    </>
  );
}
