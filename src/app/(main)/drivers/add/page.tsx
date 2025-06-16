
import { PageHeader } from '@/components/shared/page-header';
import { DriverForm } from '@/components/driver/driver-form';

export default function AddDriverPage() {
  return (
    <>
      <PageHeader
        title="Ajouter un Nouveau Chauffeur"
        description="Remplissez les informations ci-dessous pour enregistrer un nouveau chauffeur."
      />
      <DriverForm />
    </>
  );
}
