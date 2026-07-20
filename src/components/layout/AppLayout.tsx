import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ImpersonationBanner } from './ImpersonationBanner';
import { PendingPedidosDialog } from '@/components/pedidos/PendingPedidosDialog';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useCliente } from '@/contexts/ClienteContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isImpersonating } = useImpersonation();
  const { cliente } = useCliente();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      <ImpersonationBanner />
      <PendingPedidosDialog />
      <Sidebar clientName={cliente?.nome} />

      <div className={cn('min-h-screen w-full min-w-0 pl-[68px]', isImpersonating && 'pt-12')}>
        <Header />
        <main className="w-full min-w-0 overflow-x-hidden px-8 pb-16 pt-7">{children}</main>
      </div>
    </div>
  );
}
