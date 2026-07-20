import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarClock,
  FileText,
  FolderOpen,
  Home,
  ListChecks,
  Moon,
  Newspaper,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Users,
  Wallet,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAudience } from '@/portal/useAudience';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';

interface CommandPaletteContextValue {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

/** Acesso ao command palette a partir de qualquer componente (ex.: o botão de pesquisa do header). */
export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx)
    throw new Error('useCommandPalette tem de ser usado dentro de <CommandPaletteProvider>');
  return ctx;
}

interface NavCommand {
  to: string;
  labelKey: string;
  fallback: string;
  icon: typeof Home;
}

// Navegação do cockpit (audiência cca). Gating fino por papel é aplicado abaixo.
const CCA_NAV: NavCommand[] = [
  { to: '/', labelKey: 'nav.home', fallback: 'Início', icon: Home },
  { to: '/contratos', labelKey: 'nav.contracts', fallback: 'Contratos', icon: FileText },
  { to: '/assuntos', labelKey: 'nav.matters', fallback: 'Assuntos', icon: Briefcase },
  { to: '/timelines', labelKey: 'nav.timelines', fallback: 'Timelines', icon: ListChecks },
  { to: '/prazos', labelKey: 'nav.deadlines', fallback: 'Prazos', icon: CalendarClock },
  { to: '/documentos', labelKey: 'nav.documents', fallback: 'Documentos', icon: FolderOpen },
  { to: '/financeiro', labelKey: 'nav.financial', fallback: 'Financeiro', icon: Wallet },
  { to: '/legalbi', labelKey: 'nav.legalbi', fallback: 'LegalBI', icon: BarChart3 },
  { to: '/novidades-cca', labelKey: 'nav.ccaNews', fallback: 'Novidades CCA', icon: Newspaper },
  { to: '/notificacoes', labelKey: 'common.notifications', fallback: 'Notificações', icon: Bell },
  { to: '/perfil', labelKey: 'nav.profile', fallback: 'Perfil', icon: Settings },
];

// Comandos só para gestão CCA
const CCA_ADMIN_NAV: NavCommand[] = [
  {
    to: '/consola',
    labelKey: 'nav.consola',
    fallback: 'Consola de gestão',
    icon: SlidersHorizontal,
  },
  { to: '/utilizadores', labelKey: 'nav.users', fallback: 'Utilizadores', icon: Users },
];

// Navegação do portal (audiência client)
const CLIENT_NAV: NavCommand[] = [
  { to: '/portal', labelKey: 'portal.nav.home', fallback: 'Início', icon: Home },
  {
    to: '/portal/contratos',
    labelKey: 'portal.nav.contracts',
    fallback: 'Contratos',
    icon: FileText,
  },
  { to: '/portal/assuntos', labelKey: 'portal.nav.matters', fallback: 'Assuntos', icon: Briefcase },
  {
    to: '/portal/timelines',
    labelKey: 'portal.nav.timelines',
    fallback: 'Timelines',
    icon: ListChecks,
  },
  {
    to: '/portal/documentos',
    labelKey: 'portal.nav.documents',
    fallback: 'Documentos',
    icon: FolderOpen,
  },
  {
    to: '/portal/prazos',
    labelKey: 'portal.nav.deadlines',
    fallback: 'Prazos',
    icon: CalendarClock,
  },
  {
    to: '/portal/financeiro',
    labelKey: 'portal.nav.financial',
    fallback: 'Conta corrente',
    icon: Wallet,
  },
  {
    to: '/portal/politicas',
    labelKey: 'portal.nav.policies',
    fallback: 'Políticas',
    icon: ShieldCheck,
  },
  { to: '/portal/novidades', labelKey: 'portal.nav.news', fallback: 'Novidades', icon: Newspaper },
  { to: '/portal/perfil', labelKey: 'portal.nav.profile', fallback: 'Perfil', icon: Settings },
];

/**
 * CommandPalette — navegação por ⌘K/Ctrl+K (peça central da nova navegação).
 * Lista as rotas conforme a audiência (cockpit vs portal) e o papel, mais
 * ações rápidas (alternar tema). Montado uma vez em App, ligado ao atalho
 * global e ao botão de pesquisa do header.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { audience } = useAudience();
  const { isAppAdmin, isCCAManager } = useLegalHubProfile();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo<CommandPaletteContextValue>(
    () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
    }),
    [],
  );

  const isClient = audience === 'client';
  const nav = isClient ? CLIENT_NAV : CCA_NAV;
  const adminNav = !isClient && (isAppAdmin || isCCAManager) ? CCA_ADMIN_NAV : [];

  const go = (to: string) => {
    setIsOpen(false);
    navigate(to);
  };

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <Command loop>
          <CommandInput placeholder={t('command.placeholder', 'Pesquisar ou saltar para…')} />
          <CommandList>
            <CommandEmpty>{t('command.empty', 'Sem resultados.')}</CommandEmpty>
            <CommandGroup heading={t('command.navigate', 'Navegar')}>
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.to}
                    value={t(item.labelKey, item.fallback)}
                    onSelect={() => go(item.to)}
                  >
                    <Icon className="mr-2 h-4 w-4 text-ink-mute" />
                    {t(item.labelKey, item.fallback)}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {adminNav.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={t('command.manage', 'Gestão')}>
                  {adminNav.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        key={item.to}
                        value={t(item.labelKey, item.fallback)}
                        onSelect={() => go(item.to)}
                      >
                        <Icon className="mr-2 h-4 w-4 text-ink-mute" />
                        {t(item.labelKey, item.fallback)}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}

            <CommandSeparator />
            <CommandGroup heading={t('command.actions', 'Ações')}>
              <CommandItem
                value={t('command.toggleTheme', 'Alternar tema claro/escuro')}
                onSelect={() => {
                  setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                  setIsOpen(false);
                }}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="mr-2 h-4 w-4 text-ink-mute" />
                ) : (
                  <Moon className="mr-2 h-4 w-4 text-ink-mute" />
                )}
                {t('command.toggleTheme', 'Alternar tema claro/escuro')}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  );
}
