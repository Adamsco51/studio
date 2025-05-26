
import { PageHeader } from '@/components/shared/page-header';
import { BLForm } from '@/components/bl/bl-form';
import { MOCK_WORK_TYPES } from '@/lib/mock-data'; // MOCK_WORK_TYPES is still used

export default function AddBLPage() {
  // Clients are now fetched directly within BLForm from Firestore
  const workTypes = MOCK_WORK_TYPES; // Fetch work types (still mock)

  return (
    <>
      <PageHeader
        title="Ajouter un Nouveau Connaissement (BL)"
        description="Remplissez les informations ci-dessous pour enregistrer un nouveau BL."
      />
      {/* BLForm will fetch clients from Firestore. workTypes is still passed as mock. */}
      <BLForm workTypes={workTypes} /> 
    </>
  );
}
