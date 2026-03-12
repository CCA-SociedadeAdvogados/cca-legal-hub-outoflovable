import { Bell, Search, User, LogOut, Check, Newspaper, FileText, ExternalLink } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import CCAOrgSwitcher from '@/components/CCAOrgSwitcher';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfile } from '@/hooks/useProfile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';

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
    return <FileText className="h-4 w-4 text-orange-500" />;
  }

  switch (type) {
    case 'news_published':
      return <Newspaper className="h-4 w-4 text-primary" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

export function Header() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { isCCAInternalAuthorized, ccaClients, viewingOrganizationId } = useOrganizations();
  const { cliente } = useCliente();

  const selectedClient =
    ccaClients.find((clientOption) => clientOption.organization_id === viewingOrganizationId) ?? null;

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

  return (
    <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex min-w-0 flex-1 items-center gap-4 max-w-md">
        <div className="relative w-full min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('common.search')}
            className="w-full min-w-0 border-0 bg-muted/50 pl-9 focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
        {isCCAInternalAuthorized && (
          <div className="hidden min-w-0 max-w-[380px] items-center md:flex">
            <div className="mr-2 min-w-0 text-right">
              <div className="truncate text-sm font-medium text-foreground">
                {cliente?.nome || selectedClient?.client_name || 'Cliente'}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {cliente?.jvrisId || selectedClient?.client_code || '—'}
                {selectedClient?.group_code ? ` · ${selectedClient.group_code}` : ''}
              </div>
            </div>
          </div>
        )}

        <div className="shrink-0">
          <CCAOrgSwitcher />
        </div>

        <div className="shrink-0">
          <LanguageSelector />
        </div>

        <div className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative shrink-0">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)] bg-popover">
              <div className="flex items-center justify-between px-2">
                <DropdownMenuLabel>{t('common.notifications')}</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => markAllAsRead.mutate()}
                  >
                    <Check className="mr-1 h-3 w-3" />
                    {t('common.markAllRead')}
                  </Button>
                )}
              </div>

              <DropdownMenuSeparator />

              {notifications.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {t('common.noNotifications')}
                </div>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 p-3',
                        !notification.read && 'bg-muted/50',
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="mt-0.5 shrink-0">{getNotificationIcon(notification.type)}</div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className={cn('text-sm leading-tight', !notification.read && 'font-medium')}>
                          {notification.title}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(notification.created_at, t)}
                        </p>
                      </div>

                      {!notification.read && (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
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
        </div>

        <div className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex shrink-0 items-center gap-3 px-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>

                <div className="hidden min-w-0 flex-col items-start md:flex">
                  <span className="truncate text-sm font-medium">{userName}</span>
                  <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 bg-popover">
              <DropdownMenuLabel>{t('common.myAccount')}</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate('/perfil')}>
                <User className="mr-2 h-4 w-4" />
                {t('common.profile')}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t('common.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
