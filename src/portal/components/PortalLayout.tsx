import { ReactNode } from 'react';
import { PortalSidebar } from './PortalSidebar';
import { PortalHeader } from './PortalHeader';
import { PortalAssistantBubble } from './PortalAssistantBubble';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface PortalLayoutProps {
  children: ReactNode;
}

/**
 * PortalLayout — shell do Portal do Cliente.
 * Espelha o AppLayout do cockpit em estrutura, mas sem banner de impersonação
 * nem qualquer chrome interno da CCA.
 */
export function PortalLayout({ children }: PortalLayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      <PortalSidebar />
      <div
        className={cn(
          'min-h-screen w-full min-w-0 transition-[padding] duration-[220ms]',
          isCollapsed ? 'pl-16' : 'pl-[244px]',
        )}
      >
        <PortalHeader />
        <main className="w-full min-w-0 overflow-x-hidden px-8 pb-16 pt-7">{children}</main>
      </div>
      {/* Assistente IA — bolha flutuante sobre todas as páginas do portal */}
      <PortalAssistantBubble />
    </div>
  );
}
