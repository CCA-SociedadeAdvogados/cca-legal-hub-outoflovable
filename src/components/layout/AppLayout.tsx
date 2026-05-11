import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ImpersonationBanner } from './ImpersonationBanner';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useCliente } from '@/contexts/ClienteContext';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isImpersonating } = useImpersonation();
  const { isCollapsed } = useSidebar();
  const { cliente } = useCliente();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      <ImpersonationBanner />
      <Sidebar clientName={cliente?.nome} />

      <div
        className={cn(
          'min-h-screen w-full min-w-0 transition-[padding] duration-[220ms]',
          isCollapsed ? 'pl-16' : 'pl-[244px]',
          isImpersonating && 'pt-12',
        )}
      >
        <Header />
        <main className="w-full min-w-0 overflow-x-hidden px-8 pb-16 pt-7">{children}</main>
      </div>
    </div>
  );
}
