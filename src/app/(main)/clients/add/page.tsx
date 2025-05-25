import { PageHeader } from '@/components/shared/page-header';
import { ClientForm } from '@/components/client/client-form';

export default function AddClientPage() {
  return (
    <>
      <PageHeader
        title="Ajouter un Nouveau Client"
        description="Remplissez les informations ci-dessous pour enregistrer un nouveau client."
      />
      <ClientForm />
    </>
  );
}
