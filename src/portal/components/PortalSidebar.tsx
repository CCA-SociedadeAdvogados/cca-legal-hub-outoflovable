import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTheme } from '@/hooks/useUserTheme';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useHubPortalConfig, type PortalAba } from '@/hooks/useHub';
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
} from 'lucide-react';

interface RailIconProps {
  to?: string;
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

/** Botão único do rail do portal (só ícone) com tooltip à direita. */
function RailIcon({ to, icon: Icon, label, isActive, onClick }: RailIconProps) {
  const className = cn(
    'group relative flex h-11 w-11 items-center justify-center rounded-[13px] transition-colors duration-150',
    isActive
      ? 'bg-sidebar-ink/[0.14] text-sidebar-ink'
      : 'text-sidebar-ink/60 hover:bg-sidebar-ink/[0.08] hover:text-sidebar-ink',
  );

  const inner = (
    <>
      {isActive && (
        <span className="absolute -left-[13px] top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-sidebar-active" />
      )}
      <Icon className="h-[19px] w-[19px]" strokeWidth={1.6} />
    </>
  );

  const content =
    to && !onClick ? (
      <Link
        to={to}
        className={className}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
      >
        {inner}
      </Link>
    ) : (
      <button type="button" onClick={onClick} className={className} aria-label={label}>
        {inner}
      </button>
    );

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function RailDivider() {
  return <div className="my-2 h-px w-6 self-center bg-sidebar-ink/12" />;
}

/**
 * PortalSidebar — rail de navegação do Portal do Cliente (68px, só ícones).
 * Sem conceitos internos da CCA. As abas visíveis respeitam a configuração da
 * consola (nível 1 do modelo de permissões).
 */
export function PortalSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useUserTheme();
  const { currentOrganization } = useOrganizations();
  const { data: config } = useHubPortalConfig(currentOrganization?.id);
  const aba = (nome: PortalAba) => config?.abas[nome] !== false;

  const isActive = (path: string) =>
    path === '/portal'
      ? location.pathname === '/portal' || location.pathname === '/portal/'
      : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[68px] flex-col items-center gap-1 bg-sidebar py-3 text-sidebar-ink">
      <Link
        to="/portal"
        aria-label={t('portal.brand')}
        className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-[13px] border border-sidebar-active/40 bg-sidebar-active-ink transition-transform hover:scale-105"
      >
        <img src={ccaLogo} alt="CCA" className="h-6 w-6 object-contain" />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto scrollbar-hide">
        <RailIcon
          to="/portal"
          icon={Home}
          label={t('portal.nav.home')}
          isActive={isActive('/portal')}
        />
        {aba('contratos') && (
          <RailIcon
            to="/portal/contratos"
            icon={FileText}
            label={t('portal.nav.contracts')}
            isActive={isActive('/portal/contratos')}
          />
        )}
        {aba('assuntos') && (
          <RailIcon
            to="/portal/assuntos"
            icon={Briefcase}
            label={t('portal.nav.matters')}
            isActive={isActive('/portal/assuntos')}
          />
        )}
        {aba('timelines') && (
          <RailIcon
            to="/portal/timelines"
            icon={ListChecks}
            label={t('portal.nav.timelines')}
            isActive={isActive('/portal/timelines')}
          />
        )}
        {aba('documentos') && (
          <RailIcon
            to="/portal/documentos"
            icon={FolderOpen}
            label={t('portal.nav.documents')}
            isActive={isActive('/portal/documentos')}
          />
        )}
        {aba('prazos') && (
          <RailIcon
            to="/portal/prazos"
            icon={CalendarClock}
            label={t('portal.nav.deadlines')}
            isActive={isActive('/portal/prazos')}
          />
        )}
        {aba('politicas') && (
          <RailIcon
            to="/portal/politicas"
            icon={ShieldCheck}
            label={t('portal.nav.policies')}
            isActive={isActive('/portal/politicas')}
          />
        )}
        {aba('financeiro') && (
          <RailIcon
            to="/portal/financeiro"
            icon={Wallet}
            label={t('portal.nav.financial')}
            isActive={isActive('/portal/financeiro')}
          />
        )}
        {aba('pedidos') && (
          <RailIcon
            to="/portal/pedidos"
            icon={MessageSquarePlus}
            label={t('portal.nav.requests')}
            isActive={isActive('/portal/pedidos')}
          />
        )}

        {aba('novidades') && (
          <>
            <RailDivider />
            <RailIcon
              to="/portal/novidades"
              icon={Newspaper}
              label={t('portal.nav.news')}
              isActive={isActive('/portal/novidades')}
            />
          </>
        )}
      </nav>

      <div className="flex flex-col items-center gap-1">
        <RailDivider />
        <RailIcon
          icon={resolvedTheme === 'dark' ? Sun : Moon}
          label={resolvedTheme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          onClick={toggleTheme}
        />
        <RailIcon
          to="/portal/perfil"
          icon={Settings}
          label={t('portal.nav.profile')}
          isActive={isActive('/portal/perfil')}
        />
        <RailIcon icon={LogOut} label={t('common.logout')} onClick={handleSignOut} />
      </div>
    </aside>
  );
}
