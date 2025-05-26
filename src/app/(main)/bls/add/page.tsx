
import { PageHeader } from '@/components/shared/page-header';
import { BLForm } from '@/components/bl/bl-form';

export default function AddBLPage() {
  // Clients and WorkTypes are now fetched directly within BLForm from Firestore

  return (
    <>
      <PageHeader
        title="Ajouter un Nouveau Connaissement (BL)"
        description="Remplissez les informations ci-dessous pour enregistrer un nouveau BL."
      />
      {/* BLForm will fetch clients and work types from Firestore. */}
      <BLForm /> 
    </>
  );
}
