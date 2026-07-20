import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
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
  SlidersHorizontal,
  LogOut,
  ListChecks,
  CalendarClock,
  Crown,
} from 'lucide-react';

interface SidebarProps {
  clientName?: string;
}

interface RailIconProps {
  to?: string;
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  badge?: number;
  onClick?: () => void;
}

/**
 * RailIcon — botão único do rail de navegação (só ícone), com tooltip à direita.
 * Estado activo: fundo preenchido + "espinha" de acento à esquerda.
 */
function RailIcon({ to, icon: Icon, label, isActive, badge, onClick }: RailIconProps) {
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
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold leading-none text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
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

function RailDivider() {
  return <div className="my-2 h-px w-6 self-center bg-sidebar-ink/12" />;
}

/**
 * Sidebar — rail de navegação vertical (68px), só ícones com tooltips.
 * Substitui a sidebar de texto: os nomes vivem nos tooltips e no command
 * palette (⌘K). Estrutura: marca no topo, destinos principais, bloco
 * secundário (tema, gestão, definições, sair) e avatar/marca no fundo.
 */
export function Sidebar({ clientName }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useUserTheme();
  const badges = useSidebarBadges();
  const { can, isAppAdmin, isCCAManager, isCCAUser, isOrgManager, isOrgUser } = usePermissions();

  const at = (p: string) => location.pathname === p;
  const startsWith = (p: string) => location.pathname.startsWith(p);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[68px] flex-col items-center gap-1 bg-sidebar py-3 text-sidebar-ink">
      {/* Marca */}
      <Link
        to="/"
        aria-label="Legal Hub"
        className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-[13px] border border-sidebar-active/40 bg-sidebar-active-ink transition-transform hover:scale-105"
      >
        <img src={ccaLogo} alt="CCA" className="h-6 w-6 object-contain" />
      </Link>

      {/* Destinos principais */}
      <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto scrollbar-hide">
        <RailIcon to="/" icon={Home} label={t('nav.home')} isActive={at('/') || at('/home')} />
        <RailIcon
          to="/contratos"
          icon={FileText}
          label={t('nav.contracts')}
          isActive={startsWith('/contratos')}
          badge={badges.contracts}
        />
        <RailIcon
          to="/assuntos"
          icon={Briefcase}
          label={t('nav.matters')}
          isActive={at('/assuntos')}
        />
        <RailIcon
          to="/timelines"
          icon={ListChecks}
          label={t('nav.timelines')}
          isActive={at('/timelines')}
        />
        <RailIcon
          to="/prazos"
          icon={CalendarClock}
          label={t('nav.deadlines', 'Prazos')}
          isActive={at('/prazos')}
        />
        <RailIcon
          to="/documentos"
          icon={FolderOpen}
          label={t('nav.documents')}
          isActive={startsWith('/documentos')}
        />

        <RailDivider />

        <RailIcon
          to="/financeiro"
          icon={Wallet}
          label={t('nav.financial')}
          isActive={at('/financeiro')}
        />
        <RailIcon
          to="/pedidos"
          icon={MessageSquarePlus}
          label={t('nav.requests')}
          isActive={at('/pedidos')}
          badge={badges.pedidos}
        />
        <RailIcon
          to="/legalbi"
          icon={BarChart3}
          label={t('nav.legalbi')}
          isActive={at('/legalbi')}
        />
        <RailIcon
          to="/novidades-cca"
          icon={Newspaper}
          label={t('nav.ccaNews')}
          isActive={at('/novidades-cca')}
          badge={badges.news}
        />
        <RailIcon
          to="/politicas"
          icon={Shield}
          label={t('nav.policies')}
          isActive={at('/politicas')}
        />
        <RailIcon
          to="/notificacoes"
          icon={Bell}
          label={t('common.notifications')}
          isActive={at('/notificacoes')}
          badge={badges.notifications}
        />

        {can('users:view_own_org') && (
          <RailIcon
            to="/utilizadores-org"
            icon={Users}
            label={t('nav.users', 'Utilizadores')}
            isActive={at('/utilizadores-org')}
          />
        )}
        {(isCCAUser || isOrgManager || isOrgUser) && (
          <RailIcon
            to="/organizacao"
            icon={Building2}
            label={t('nav.organization')}
            isActive={at('/organizacao')}
          />
        )}
      </nav>

      {/* Bloco secundário */}
      <div className="flex flex-col items-center gap-1">
        <RailDivider />
        <RailIcon
          icon={resolvedTheme === 'dark' ? Sun : Moon}
          label={resolvedTheme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          onClick={toggleTheme}
        />
        {(isAppAdmin || isCCAManager) && (
          <RailIcon
            to="/consola"
            icon={SlidersHorizontal}
            label={t('nav.consola')}
            isActive={at('/consola')}
          />
        )}
        {isAppAdmin && (
          <RailIcon to="/admin" icon={Crown} label={t('nav.admin')} isActive={at('/admin')} />
        )}
        <RailIcon
          to="/definicoes"
          icon={Settings}
          label={t('nav.settings')}
          isActive={at('/definicoes')}
        />
        <RailIcon icon={LogOut} label={t('common.logout')} onClick={handleSignOut} />
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              to="/perfil"
              aria-label={t('nav.profile')}
              className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-ink/[0.12] text-[11px] font-semibold text-sidebar-ink transition-colors hover:bg-sidebar-ink/20"
            >
              {(clientName ?? 'CCA').slice(0, 2).toUpperCase()}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            {clientName ?? 'CCA · Sociedade de Advogados'}
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
