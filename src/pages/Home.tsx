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

export default function Home() {
  const { t } = useTranslation();
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [localLayout, setLocalLayout] = useState<HomeLayout | null>(null);

  const firstName = (profile?.nome_completo ?? '').trim().split(' ')[0] || '';

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

        {/* Page header — eyebrow + display H1 italic accent + serif italic subtitle */}
        <header className="space-y-3">
          <Eyebrow>{t('home.title')}</Eyebrow>
          <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
            {firstName ? (
              <>
                Bem-vindo, <span className="italic text-brand">{firstName}</span>.
              </>
            ) : (
              t('home.title')
            )}
          </h1>
          <p className="font-serif text-[17px] italic leading-[1.55] text-ink-soft">
            {t('home.subtitle')}
          </p>
        </header>

        {/* Widgets grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
