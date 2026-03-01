import { Suspense } from 'react';
import RecebimentoWizardEtiquetas from '@/app/home/recebimento/_components/RecebimentoWizardEtiquetas';

export default function RecebimentoSemNfPage() {
  return (
    <Suspense fallback={null}>
      <RecebimentoWizardEtiquetas withNf={false} />
    </Suspense>
  );
}

