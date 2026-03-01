import { Suspense } from 'react';
import RecebimentoWizardEtiquetas from '@/app/home/recebimento/_components/RecebimentoWizardEtiquetas';

export default function RecebimentoComNfPage() {
  return (
    <Suspense fallback={null}>
      <RecebimentoWizardEtiquetas withNf />
    </Suspense>
  );
}

