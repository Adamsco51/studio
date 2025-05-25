
import { PageHeader } from '@/components/shared/page-header';
import { WorkTypeForm } from '@/components/work-type/work-type-form';

export default function AddWorkTypePage() {
  return (
    <>
      <PageHeader
        title="Ajouter un Nouveau Type de Travail"
        description="Remplissez les informations ci-dessous pour enregistrer un nouveau type de travail."
      />
      <WorkTypeForm />
    </>
  );
}
