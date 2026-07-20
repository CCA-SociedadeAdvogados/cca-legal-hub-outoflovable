import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
import { useUserTheme } from '@/hooks/useUserTheme';
import { usePermissions } from '@/hooks/usePermissions';
import ccaLogo from '@/assets/cca-logo.png';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Home,
  Bell,
  Wallet,
  MessageSquarePlus,
  Briefcase,
  BarChart3,
  FileText,
  FolderOpen,
  Newspaper,
  Shield,
  Users,
  Building2,
  Moon,
  Sun,
  Settings,
  LogOut,
  Crown,
  ChevronsLeft,
  ChevronDown,
  ChevronRight,
  Lock,
  List,
  ListChecks,
  Upload,
  CalendarClock,
} from 'lucide-react';

interface SidebarProps {
  clientName?: string;
}

interface NavItemProps {
  to?: string;
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  isCollapsed: boolean;
  badge?: number;
  isSubmenu?: boolean;
  locked?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

/** Single sidebar nav row — handles primary, submenu and secondary variants. */
function NavItem({
  to,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  badge,
  isSubmenu = false,
  locked = false,
  onClick,
  trailing,
  variant = 'primary',
}: NavItemProps) {
  const sizeClass = isSubmenu ? 'h-8 text-[12.5px]' : 'h-[34px] text-[13px]';
  const padClass = isCollapsed ? 'justify-center px-0' : isSubmenu ? 'pl-3 pr-3' : 'pl-3.5 pr-3.5';

  const stateClass = isActive
    ? 'bg-sidebar-active text-sidebar-active-ink font-medium'
    : locked
      ? 'text-sidebar-ink/40 cursor-not-allowed'
      : variant === 'secondary'
        ? 'text-sidebar-ink/70 hover:bg-sidebar-ink/10 hover:text-sidebar-ink'
        : 'text-sidebar-ink/85 hover:bg-sidebar-ink/[0.08] hover:text-sidebar-ink';

  const iconSize = isSubmenu ? 'h-3.5 w-3.5' : 'h-[15px] w-[15px]';

  const inner = (
    <>
      <div className="relative shrink-0">
        <Icon className={iconSize} strokeWidth={1.5} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold leading-none text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      {!isCollapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {locked && <Lock className="h-3 w-3 shrink-0 opacity-60" strokeWidth={1.5} />}
          {trailing}
        </>
      )}
    </>
  );

  const className = cn(
    'flex w-full min-w-0 items-center gap-3 rounded-control transition-colors duration-150',
    sizeClass,
    padClass,
    stateClass,
  );

  const content =
    locked || !to ? (
      <button
        type="button"
        disabled={locked}
        onClick={onClick}
        aria-disabled={locked || undefined}
        className={className}
      >
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
        <TooltipContent side="right" className="flex items-center gap-2">
          <span>{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-white">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }
  return content;
}

export function Sidebar({ clientName }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { isCollapsed, toggle } = useSidebar();
  const { resolvedTheme, toggleTheme } = useUserTheme();
  const badges = useSidebarBadges();
  const { can, isAppAdmin, isCCAUser, isOrgManager, isOrgUser } = usePermissions();

  const isContractsRoute = location.pathname.startsWith('/contratos');
  const [contractsExpanded, setContractsExpanded] = useState(isContractsRoute);

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
        to="/"
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
              Legal Hub
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-ink-mute">
              by CCA
            </div>
          </div>
        )}
      </Link>

      {/* Reserved area block */}
      {!isCollapsed && (
        <div className="border-y border-sidebar-ink/10 px-4 py-3">
          <div className="text-[9.5px] font-medium uppercase tracking-[0.22em] text-sidebar-ink-mute">
            {t('common.reservedArea')}
          </div>
          <div className="mt-1 truncate text-[12px] text-sidebar-ink">
            {clientName ?? 'CCA · Sociedade de Advogados'}
          </div>
        </div>
      )}

      {/* Primary nav */}
      <nav
        className={cn(
          'flex-1 space-y-0.5 overflow-y-auto py-3 scrollbar-hide',
          isCollapsed ? 'px-2' : 'px-2.5',
        )}
      >
        <NavItem
          to="/"
          icon={Home}
          label={t('nav.home')}
          isActive={location.pathname === '/' || location.pathname === '/home'}
          isCollapsed={isCollapsed}
        />

        {/* Contratos — submenu when expanded */}
        {isCollapsed ? (
          <NavItem
            to="/contratos"
            icon={FileText}
            label={t('nav.contracts')}
            isActive={isContractsRoute}
            isCollapsed
            badge={badges.contracts}
          />
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setContractsExpanded((v) => !v)}
              className={cn(
                'flex h-[34px] w-full min-w-0 items-center gap-3 rounded-control pl-3.5 pr-3.5 text-[13px] transition-colors duration-150',
                isContractsRoute
                  ? 'bg-sidebar-active text-sidebar-active-ink font-medium'
                  : 'text-sidebar-ink/85 hover:bg-sidebar-ink/[0.08] hover:text-sidebar-ink',
              )}
            >
              <div className="relative shrink-0">
                <FileText className="h-[15px] w-[15px]" strokeWidth={1.5} />
                {badges.contracts > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold leading-none text-white">
                    {badges.contracts > 9 ? '9+' : badges.contracts}
                  </span>
                )}
              </div>
              <span className="min-w-0 flex-1 truncate text-left">{t('nav.contracts')}</span>
              {contractsExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.5} />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.5} />
              )}
            </button>
            {contractsExpanded && (
              <div className="ml-3.5 mt-0.5 space-y-0.5 border-l border-sidebar-ink/10 pl-2">
                <NavItem
                  to="/contratos"
                  icon={List}
                  label={t('nav.contractsList')}
                  isActive={location.pathname === '/contratos'}
                  isCollapsed={false}
                  isSubmenu
                />
                {can('contracts:bulk_upload') && (
                  <NavItem
                    to="/contratos/upload-massa"
                    icon={Upload}
                    label={t('nav.contractsUpload')}
                    isActive={location.pathname === '/contratos/upload-massa'}
                    isCollapsed={false}
                    isSubmenu
                  />
                )}
              </div>
            )}
          </div>
        )}

        <NavItem
          to="/prazos"
          icon={CalendarClock}
          label={t('nav.deadlines', 'Prazos')}
          isActive={location.pathname === '/prazos'}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/documentos"
          icon={FolderOpen}
          label={t('nav.documents')}
          isActive={
            location.pathname === '/documentos' || location.pathname.startsWith('/documentos/')
          }
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/notificacoes"
          icon={Bell}
          label={t('common.notifications')}
          isActive={location.pathname === '/notificacoes'}
          isCollapsed={isCollapsed}
          badge={badges.notifications}
        />

        {/* Núcleo CLM acima; módulos secundários abaixo */}
        <div className="my-2 border-t border-sidebar-ink/10" />

        <NavItem
          to="/financeiro"
          icon={Wallet}
          label={t('nav.financial')}
          isActive={location.pathname === '/financeiro'}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/pedidos"
          icon={MessageSquarePlus}
          label={t('nav.requests')}
          isActive={location.pathname === '/pedidos'}
          isCollapsed={isCollapsed}
          badge={badges.pedidos}
        />
        <NavItem
          to="/assuntos"
          icon={Briefcase}
          label={t('nav.matters')}
          isActive={location.pathname === '/assuntos'}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/timelines"
          icon={ListChecks}
          label={t('nav.timelines')}
          isActive={location.pathname === '/timelines'}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/legalbi"
          icon={BarChart3}
          label={t('nav.legalbi')}
          isActive={location.pathname === '/legalbi'}
          isCollapsed={isCollapsed}
        />
        <NavItem
          to="/novidades-cca"
          icon={Newspaper}
          label={t('nav.ccaNews')}
          isActive={location.pathname === '/novidades-cca'}
          isCollapsed={isCollapsed}
          badge={badges.news}
        />
        <NavItem
          to="/politicas"
          icon={Shield}
          label={t('nav.policies')}
          isActive={location.pathname === '/politicas'}
          isCollapsed={isCollapsed}
        />

        {/* Org-scoped items */}
        {can('users:view_own_org') && (
          <NavItem
            to="/utilizadores-org"
            icon={Users}
            label="Utilizadores"
            isActive={location.pathname === '/utilizadores-org'}
            isCollapsed={isCollapsed}
          />
        )}
        {(isCCAUser || isOrgManager || isOrgUser) && (
          <NavItem
            to="/organizacao"
            icon={Building2}
            label={t('nav.organization')}
            isActive={location.pathname === '/organizacao'}
            isCollapsed={isCollapsed}
          />
        )}
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
        {isAppAdmin && (
          <NavItem
            to="/admin"
            icon={Crown}
            label={t('nav.admin')}
            isActive={location.pathname === '/admin'}
            isCollapsed={isCollapsed}
            variant="secondary"
          />
        )}
        <NavItem
          to="/definicoes"
          icon={Settings}
          label={t('nav.settings')}
          isActive={location.pathname === '/definicoes'}
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
