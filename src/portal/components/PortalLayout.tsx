import { ReactNode } from 'react';
import { PortalSidebar } from './PortalSidebar';
import { PortalHeader } from './PortalHeader';
import { PortalAssistantBubble } from './PortalAssistantBubble';

interface PortalLayoutProps {
  children: ReactNode;
}

/**
 * PortalLayout — shell do Portal do Cliente.
 * Espelha o AppLayout do cockpit em estrutura, mas sem banner de impersonação
 * nem qualquer chrome interno da CCA.
 */
export function PortalLayout({ children }: PortalLayoutProps) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      <PortalSidebar />
      <div className="min-h-screen w-full min-w-0 pl-[68px]">
        <PortalHeader />
        <main className="w-full min-w-0 overflow-x-hidden px-8 pb-16 pt-7">{children}</main>
      </div>
      {/* Assistente IA — bolha flutuante sobre todas as páginas do portal */}
      <PortalAssistantBubble />
    </div>
  );
}
