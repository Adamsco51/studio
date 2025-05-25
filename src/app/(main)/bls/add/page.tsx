import { PageHeader } from '@/components/shared/page-header';
import { BLForm } from '@/components/bl/bl-form';
import { MOCK_CLIENTS } from '@/lib/mock-data';

export default function AddBLPage() {
  // In a real app, clients would be fetched from an API
  const clients = MOCK_CLIENTS;

  return (
    <>
      <PageHeader
        title="Ajouter un Nouveau Connaissement (BL)"
        description="Remplissez les informations ci-dessous pour enregistrer un nouveau BL."
      />
      <BLForm clients={clients} />
    </>
  );
}
