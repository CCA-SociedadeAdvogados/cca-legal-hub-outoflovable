/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Check, FileText, Newspaper, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { Eyebrow, GhostButton } from '@/components/cca';

const ITEMS_PER_PAGE = 10;

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
    return <FileText className="h-5 w-5 text-warn" />;
  }
  switch (type) {
    case 'news_published':
      return <Newspaper className="h-5 w-5 text-brand" />;
    default:
      return <Bell className="h-5 w-5 text-ink-mute" />;
  }
}

export default function Notificacoes() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'contracts' | 'news'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredNotifications = notifications.filter((n) => {
    switch (filter) {
      case 'unread':
        return !n.read;
      case 'contracts':
        return n.type.startsWith('contract_');
      case 'news':
        return n.type === 'news_published';
      default:
        return true;
    }
  });

  const totalPages = Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }

    if (notification.reference_type === 'cca_news') {
      navigate('/novidades-cca');
    } else if (notification.reference_type === 'contratos' && notification.reference_id) {
      navigate(`/contratos/${notification.reference_id}`);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    markAsRead.mutate(id);
  };

  return (
    <AppLayout>
      <div className="space-y-7 animate-fade-in">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <header className="space-y-3">
            <Eyebrow>{t('notifications.title')}</Eyebrow>
            <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
              {t('notifications.title')}
            </h1>
            <p className="font-serif text-[17px] italic leading-[1.55] text-ink-soft">
              {unreadCount > 0
                ? t('notifications.unreadCount', { count: unreadCount })
                : t('notifications.subtitle')}
            </p>
          </header>
          {unreadCount > 0 && (
            <GhostButton onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
              <Check className="h-4 w-4" />
              {t('notifications.markAllRead')}
            </GhostButton>
          )}
        </div>

        <Tabs
          value={filter}
          onValueChange={(v) => {
            setFilter(v as typeof filter);
            setCurrentPage(1);
          }}
        >
          <TabsList className="h-auto flex-wrap gap-1 rounded-control border border-line bg-bg-alt/60 p-1">
            <TabsTrigger
              value="all"
              className="rounded-control text-[12.5px] data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              {t('notifications.all')}
            </TabsTrigger>
            <TabsTrigger
              value="unread"
              className="rounded-control text-[12.5px] data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              {t('notifications.unread')}
              {unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-danger px-1.5 py-0.5 text-[10px] text-white [font-variant-numeric:tabular-nums]">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="contracts"
              className="rounded-control text-[12.5px] data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              {t('notifications.contracts')}
            </TabsTrigger>
            <TabsTrigger
              value="news"
              className="rounded-control text-[12.5px] data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              {t('notifications.news')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="rounded-card border-line bg-surface">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base font-medium text-ink">
              {filter === 'all' && t('notifications.allNotifications')}
              {filter === 'unread' && t('notifications.unreadNotifications')}
              {filter === 'contracts' && t('notifications.contractNotifications')}
              {filter === 'news' && t('notifications.newsNotifications')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
              </div>
            ) : paginatedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <Bell className="mb-4 h-12 w-12 text-ink-mute" strokeWidth={1.5} />
                <p className="text-sm text-ink-soft">{t('notifications.empty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {paginatedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-bg-alt',
                      !notification.read && 'bg-bg-alt/60',
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-sm text-ink', !notification.read && 'font-medium')}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-ink-mute whitespace-nowrap">
                          {formatTimeAgo(notification.created_at, t)}
                        </span>
                      </div>
                      <p className="text-sm text-ink-soft line-clamp-2">{notification.message}</p>
                      {notification.type.startsWith('contract_expiry') &&
                        notification.metadata?.days_to_expiry && (
                          <span className="inline-flex items-center rounded-full bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn">
                            {t('notifications.expiresIn', {
                              days: notification.metadata.days_to_expiry,
                            })}
                          </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleMarkAsRead(e, notification.id)}
                          title={t('notifications.markAsRead')}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-ink-mute hover:text-danger"
                        onClick={(e) => handleDelete(e, notification.id)}
                        title={t('notifications.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-ink-soft [font-variant-numeric:tabular-nums]">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
