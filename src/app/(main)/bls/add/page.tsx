
import { PageHeader } from '@/components/shared/page-header';
import { BLForm } from '@/components/bl/bl-form';
import { MOCK_CLIENTS, MOCK_WORK_TYPES } from '@/lib/mock-data'; // Import MOCK_WORK_TYPES

export default function AddBLPage() {
  const clients = MOCK_CLIENTS;
  const workTypes = MOCK_WORK_TYPES; // Fetch work types

  return (
    <>
      <PageHeader
        title="Ajouter un Nouveau Connaissement (BL)"
        description="Remplissez les informations ci-dessous pour enregistrer un nouveau BL."
      />
      <BLForm clients={clients} workTypes={workTypes} /> {/* Pass workTypes to the form */}
    </>
  );
}
