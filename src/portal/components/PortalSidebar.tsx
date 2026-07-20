import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useUserTheme } from '@/hooks/useUserTheme';
import ccaLogo from '@/assets/cca-logo.png';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Home,
  Briefcase,
  FileText,
  FolderOpen,
  CalendarClock,
  ListChecks,
  Wallet,
  MessageSquarePlus,
  Newspaper,
  ShieldCheck,
  Moon,
  Sun,
  Settings,
  LogOut,
  ChevronsLeft,
} from 'lucide-react';

interface NavItemProps {
  to?: string;
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

/** Single portal nav row — primary or secondary variant. */
function NavItem({
  to,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  onClick,
  variant = 'primary',
}: NavItemProps) {
  const stateClass = isActive
    ? 'bg-sidebar-active text-sidebar-active-ink font-medium'
    : variant === 'secondary'
      ? 'text-sidebar-ink/70 hover:bg-sidebar-ink/10 hover:text-sidebar-ink'
      : 'text-sidebar-ink/85 hover:bg-sidebar-ink/[0.08] hover:text-sidebar-ink';

  const className = cn(
    'flex h-[34px] w-full min-w-0 items-center gap-3 rounded-control text-[13px] transition-colors duration-150',
    isCollapsed ? 'justify-center px-0' : 'pl-3.5 pr-3.5',
    stateClass,
  );

  const inner = (
    <>
      <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
      {!isCollapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </>
  );

  const content = !to ? (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  ) : (
    <Link to={to} className={className} onClick={onClick}>
      {inner}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }
  return content;
}

/**
 * PortalSidebar — navegação enxuta do Portal do Cliente.
 *
 * Deliberadamente NÃO contém conceitos internos da CCA (impersonação, platform admin,
 * org switcher, tiers bloqueados). O cliente é o protagonista.
 */
export function PortalSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { isCollapsed, toggle } = useSidebar();
  const { resolvedTheme, toggleTheme } = useUserTheme();

  const isActive = (path: string) =>
    path === '/portal'
      ? location.pathname === '/portal' || location.pathname === '/portal/'
      : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar text-sidebar-ink transition-[width] duration-[220ms]',
        isCollapsed ? 'w-16' : 'w-[244px]',
      )}
    >
      {/* Brand block */}
      <Link
        to="/portal"
        className={cn(
          'flex h-[60px] items-center gap-3 transition-colors duration-150 hover:bg-sidebar-ink/5',
          isCollapsed ? 'justify-center px-0' : 'px-4',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-control border border-sidebar-active bg-sidebar-active-ink">
          <img src={ccaLogo} alt="CCA" className="h-6 w-6 object-contain" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0 leading-tight">
            <div className="font-display text-[15px] font-medium tracking-[-0.005em] text-sidebar-ink">
              {t('portal.brand')}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-ink-mute">
              by CCA
            </div>
          </div>
        )}
      </Link>

      {/* Primary nav */}
      <nav
        className={cn(
          'flex-1 space-y-0.5 overflow-y-auto py-3 scrollbar-hide',
          isCollapsed ? 'px-2' : 'px-2.5',
        )}
      >
        <NavItem
          to="/portal"
          icon={Home}
          label={t('portal.nav.home')}
          isActive={isActive('/portal')}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/portal/contratos"
          icon={FileText}
          label={t('portal.nav.contracts')}
          isActive={isActive('/portal/contratos')}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/portal/assuntos"
          icon={Briefcase}
          label={t('portal.nav.matters')}
          isActive={isActive('/portal/assuntos')}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/portal/timelines"
          icon={ListChecks}
          label={t('portal.nav.timelines')}
          isActive={isActive('/portal/timelines')}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/portal/documentos"
          icon={FolderOpen}
          label={t('portal.nav.documents')}
          isActive={isActive('/portal/documentos')}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/portal/prazos"
          icon={CalendarClock}
          label={t('portal.nav.deadlines')}
          isActive={isActive('/portal/prazos')}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/portal/politicas"
          icon={ShieldCheck}
          label={t('portal.nav.policies')}
          isActive={isActive('/portal/politicas')}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/portal/financeiro"
          icon={Wallet}
          label={t('portal.nav.financial')}
          isActive={isActive('/portal/financeiro')}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/portal/pedidos"
          icon={MessageSquarePlus}
          label={t('portal.nav.requests')}
          isActive={isActive('/portal/pedidos')}
          isCollapsed={isCollapsed}
        />

        <div className="my-2 border-t border-sidebar-ink/10" />

        <NavItem
          to="/portal/novidades"
          icon={Newspaper}
          label={t('portal.nav.news')}
          isActive={isActive('/portal/novidades')}
          isCollapsed={isCollapsed}
        />
      </nav>

      {/* Secondary block */}
      <div className="space-y-0.5 border-t border-sidebar-ink/10 px-2.5 py-3">
        <NavItem
          icon={resolvedTheme === 'dark' ? Sun : Moon}
          label={resolvedTheme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          isCollapsed={isCollapsed}
          onClick={toggleTheme}
          variant="secondary"
        />
        <NavItem
          to="/portal/perfil"
          icon={Settings}
          label={t('portal.nav.profile')}
          isActive={isActive('/portal/perfil')}
          isCollapsed={isCollapsed}
          variant="secondary"
        />
        <NavItem
          icon={LogOut}
          label={t('common.logout')}
          isCollapsed={isCollapsed}
          onClick={handleSignOut}
          variant="secondary"
        />
        <NavItem
          icon={ChevronsLeft}
          label={isCollapsed ? t('common.expand') : t('common.collapse')}
          isCollapsed={isCollapsed}
          onClick={toggle}
          variant="secondary"
        />
      </div>
    </aside>
  );
}
