import {
  Bell,
  Search,
  User,
  LogOut,
  Check,
  Newspaper,
  FileText,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ClienteSelectorCCA } from '@/components/ClienteSelectorCCA';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfile } from '@/hooks/useProfile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCommandPalette } from '@/components/CommandPalette';

function formatTimeAgo(
  dateString: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('common.justNow');
  if (diffMins < 60) return t('common.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('common.hoursAgo', { count: diffHours });
  return t('common.daysAgo', { count: diffDays });
}

function getNotificationIcon(type: string) {
  if (type.startsWith('contract_expiry')) {
    return <FileText className="h-4 w-4 text-warn" />;
  }
  switch (type) {
    case 'news_published':
      return <Newspaper className="h-4 w-4 text-brand" />;
    default:
      return <Bell className="h-4 w-4 text-ink-mute" />;
  }
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'U';
}

/**
 * Topbar — 60px sticky header.
 * Left: search w/ ⌘K. Centre/right: client tab, language, notifications, avatar.
 */
export function Header() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { open: openCommandPalette } = useCommandPalette();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleNotificationClick = (notification: {
    id: string;
    reference_type: string | null;
    reference_id: string | null;
    read: boolean;
  }) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.reference_type === 'cca_news') {
      navigate('/novidades-cca');
    } else if (notification.reference_type === 'contratos' && notification.reference_id) {
      navigate(`/contratos/${notification.reference_id}`);
    }
  };

  const userEmail = profile?.email || user?.email || 'User';
  const userName = profile?.nome_completo || userEmail.split('@')[0];
  const initial = getInitial(userName);

  return (
    <header className="sticky top-0 z-30 flex h-[60px] min-w-0 items-center gap-4 border-b border-line bg-bg/95 px-7 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
      {/* Search → abre o command palette (⌘K) */}
      <div className="flex min-w-0 flex-1 items-center">
        <button
          type="button"
          onClick={openCommandPalette}
          className="group relative flex h-9 w-full max-w-[440px] min-w-0 items-center rounded-control border border-line bg-surface pl-9 pr-2.5 text-left text-[12.5px] text-ink-mute transition-colors hover:border-brand/50"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
          <span className="truncate">{t('command.placeholder', 'Pesquisar ou saltar para…')}</span>
          <kbd className="pointer-events-none ml-auto hidden select-none items-center gap-0.5 rounded-control border border-line bg-bg-alt px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-mute md:inline-flex">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
        <div className="shrink-0">
          <ClienteSelectorCCA />
        </div>

        <div className="shrink-0">
          <LanguageSelector />
        </div>

        {/* AI sparkle button (placeholder shortcut to insights) */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-control text-ink-mute hover:text-brand"
          aria-label="AI"
          onClick={() => navigate('/legalbi')}
        >
          <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative shrink-0 rounded-control text-ink-mute hover:text-ink"
              aria-label={t('common.notifications')}
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.6} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-80 max-w-[calc(100vw-2rem)] border-line bg-popover"
          >
            <div className="flex items-center justify-between px-2">
              <DropdownMenuLabel className="font-display text-[14px] font-medium">
                {t('common.notifications')}
              </DropdownMenuLabel>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-xs text-ink-mute hover:text-ink"
                  onClick={() => markAllAsRead.mutate()}
                >
                  <Check className="mr-1 h-3 w-3" />
                  {t('common.markAllRead')}
                </Button>
              )}
            </div>

            <DropdownMenuSeparator />

            {notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-ink-mute">
                {t('common.noNotifications')}
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 p-3',
                      !notification.read && 'bg-bg-alt/60',
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="mt-0.5 shrink-0">{getNotificationIcon(notification.type)}</div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p
                        className={cn('text-sm leading-tight', !notification.read && 'font-medium')}
                      >
                        {notification.title}
                      </p>
                      <p className="line-clamp-2 text-xs text-ink-mute">{notification.message}</p>
                      <p className="font-mono text-[10px] text-ink-mute">
                        {formatTimeAgo(notification.created_at, t)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    )}
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/notificacoes" className="flex w-full items-center justify-between">
                <span>{t('notifications.viewAll')}</span>
                <ExternalLink className="ml-2 h-3 w-3" />
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Avatar / user menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex shrink-0 items-center gap-3 rounded-control px-2 py-1 hover:bg-bg-alt"
            >
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-brand font-display text-[14px] font-medium leading-none text-white">
                {initial}
              </div>
              <div className="hidden min-w-0 flex-col items-start leading-tight md:flex">
                <span className="truncate text-[12.5px] font-medium text-ink">{userName}</span>
                <span className="truncate text-[10.5px] text-ink-mute">{userEmail}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 border-line bg-popover">
            <DropdownMenuLabel className="font-display text-[14px] font-medium">
              {t('common.myAccount')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/perfil')}>
              <User className="mr-2 h-4 w-4" />
              {t('common.profile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-danger">
              <LogOut className="mr-2 h-4 w-4" />
              {t('common.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
