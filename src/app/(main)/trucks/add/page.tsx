
import { PageHeader } from '@/components/shared/page-header';
import { TruckForm } from '@/components/truck/truck-form';

export default function AddTruckPage() {
  return (
    <>
      <PageHeader
        title="Ajouter un Nouveau Camion"
        description="Remplissez les informations ci-dessous pour enregistrer un nouveau camion dans votre flotte."
      />
      <TruckForm />
    </>
  );
}
