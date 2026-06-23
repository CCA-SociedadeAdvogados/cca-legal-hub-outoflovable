import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { useEffectiveOrganization } from '@/hooks/useEffectiveOrganization';
import { useEffectiveIndustrySectors } from '@/hooks/useEffectiveIndustrySectors';
import { useHomeConfig } from '@/hooks/useHomeConfig';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { useProfile } from '@/hooks/useProfile';
import { WidgetRenderer } from '@/components/home/WidgetRenderer';
import { HomeEditorToolbar } from '@/components/home/HomeEditorToolbar';
import { HomeEditor } from '@/components/home/HomeEditor';
import { DEFAULT_HOME_LAYOUT, HomeLayout } from '@/lib/defaultHomeLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Eyebrow } from '@/components/cca';
import { Button } from '@/components/ui/button';
import { useContratos } from '@/hooks/useContratos';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function Home() {
  const { t, i18n } = useTranslation();

  // Saudação consciente da hora + data por extenso (locale-aware).
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 13) return t('home.greetingMorning');
    if (h < 20) return t('home.greetingAfternoon');
    return t('home.greetingEvening');
  };
  const dateLong = () => {
    const s = new Date().toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const { effectiveOrganizationId, isImpersonating } = useEffectiveOrganization();
  const { primarySector } = useEffectiveIndustrySectors();
  const {
    homeConfig,
    isLoading,
    getDisplayLayout,
    hasDraftChanges,
    saveDraft,
    publish,
    revertDraft,
    isSavingDraft,
    isPublishing,
  } = useHomeConfig(effectiveOrganizationId, primarySector);
  const { isPlatformAdmin } = usePlatformAdmin();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { contratos } = useContratos();
  const [editorOpen, setEditorOpen] = useState(false);
  const [localLayout, setLocalLayout] = useState<HomeLayout | null>(null);

  const firstName = (profile?.nome_completo ?? '').trim().split(' ')[0] || '';

  // Resumo do dia: contratos a expirar nos próximos 90 dias (dados reais).
  const expiringSoon = (contratos ?? []).filter((c) => {
    if (!c.data_termo) return false;
    const termo = new Date(c.data_termo).getTime();
    const now = Date.now();
    return termo >= now && termo <= now + 90 * 24 * 60 * 60 * 1000;
  }).length;

  // Chip de sessão — quando esta sessão foi iniciada (last_sign_in_at real).
  const sessionStarted = user?.last_sign_in_at
    ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true, locale: pt })
    : null;

  // Show editor mode for platform admins when impersonating
  const showEditor = isPlatformAdmin && isImpersonating;

  // Get the appropriate layout
  const baseLayout = showEditor
    ? homeConfig?.layout_draft || DEFAULT_HOME_LAYOUT
    : getDisplayLayout(false);

  const layout = localLayout || baseLayout;

  // Sync local layout when base layout changes
  if (showEditor && !localLayout && homeConfig?.layout_draft) {
    setLocalLayout(homeConfig.layout_draft);
  }

  const handleLayoutChange = (newLayout: HomeLayout) => {
    setLocalLayout(newLayout);
  };

  const handleSaveDraft = () => {
    if (localLayout) {
      saveDraft(localLayout);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-7">
          <div className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 rounded-card" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-7">
        {showEditor && (
          <>
            <HomeEditorToolbar
              hasDraftChanges={
                hasDraftChanges ||
                (localLayout !== null && JSON.stringify(localLayout) !== JSON.stringify(baseLayout))
              }
              onSaveDraft={handleSaveDraft}
              onPublish={publish}
              onRevert={() => {
                revertDraft();
                setLocalLayout(null);
              }}
              onOpenEditor={() => setEditorOpen(true)}
              isSaving={isSavingDraft}
              isPublishing={isPublishing}
            />
            <HomeEditor
              open={editorOpen}
              onOpenChange={setEditorOpen}
              layout={layout}
              onLayoutChange={handleLayoutChange}
              organizationId={effectiveOrganizationId}
            />
          </>
        )}

        {/* Page header — eyebrow (data por extenso) + saudação + chip de sessão */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Eyebrow>{dateLong()}</Eyebrow>
            <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
              {firstName ? (
                <>
                  {greeting()}, <span className="italic text-brand">{firstName}</span>.
                </>
              ) : (
                greeting()
              )}
            </h1>
            <p className="font-serif text-[17px] italic leading-[1.55] text-ink-soft">
              {t('home.subtitle')}
            </p>
          </div>
          {sessionStarted && (
            <div className="flex items-center gap-2.5 rounded-card border border-line bg-surface px-4 py-2.5 shadow-card">
              <span className="h-[7px] w-[7px] rounded-full bg-positive" />
              <span className="text-[12px] text-ink-soft">
                {t('home.summary.sessionStarted')}{' '}
                <span className="font-medium text-ink">{sessionStarted}</span>
              </span>
            </div>
          )}
        </header>

        {/* Resumo do dia — banner com números reais (contratos a expirar) */}
        <section className="relative overflow-hidden rounded-card border border-line bg-gradient-to-r from-secondary to-card p-8 shadow-card lg:p-9">
          <svg
            aria-hidden="true"
            viewBox="0 0 200 200"
            className="pointer-events-none absolute -right-8 top-1/2 h-64 w-64 -translate-y-1/2 text-ink opacity-[0.08]"
          >
            {[88, 66, 44, 22].map((r) => (
              <circle
                key={r}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            ))}
          </svg>
          <div className="relative z-10 max-w-2xl">
            <div className="eyebrow mb-3" style={{ color: 'hsl(var(--accent-brand))' }}>
              ✦ {t('home.summary.eyebrow')}
            </div>
            {expiringSoon > 0 ? (
              <>
                <h2 className="font-serif text-[26px] font-normal leading-tight tracking-tight text-ink">
                  <span style={{ color: 'hsl(var(--accent-brand))' }}>{expiringSoon}</span>{' '}
                  {t('home.summary.expiring', { count: expiringSoon })}
                </h2>
                <p className="mt-1 text-[13.5px] text-ink-soft">{t('home.summary.window')}</p>
              </>
            ) : (
              <>
                <h2 className="font-serif text-[26px] font-normal leading-tight tracking-tight text-ink">
                  {t('home.summary.allClear')}
                </h2>
                <p className="mt-1 text-[13.5px] text-ink-soft">{t('home.summary.allClearSub')}</p>
              </>
            )}
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button asChild>
                <Link to="/contratos">{t('home.summary.reviewContracts')}</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/prazos">
                  <CalendarClock className="mr-2 h-4 w-4" />
                  {t('home.summary.viewDeadlines')}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Widgets grid */}
        <div className="dash-enter grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {layout.widgets
            .filter((w) => w.visible)
            .sort((a, b) => a.order - b.order)
            .map((widget) => (
              <WidgetRenderer
                key={widget.id}
                widget={widget}
                organizationId={effectiveOrganizationId}
              />
            ))}
        </div>
      </div>
    </AppLayout>
  );
}
