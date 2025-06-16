
import { PageHeader } from '@/components/shared/page-header';
import { TransportForm } from '@/components/transport/transport-form';

export default function AddTransportPage() {
  return (
    <>
      <PageHeader
        title="Créer un Nouveau Transport"
        description="Planifiez un nouveau transport de conteneurs."
      />
      <TransportForm />
    </>
  );
}
