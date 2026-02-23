import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import ContractTriageAgent from '@/components/contracts/ContractTriageAgent';

export default function ContratosTriagem() {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <ContractTriageAgent />
      </div>
    </AppLayout>
  );
}
