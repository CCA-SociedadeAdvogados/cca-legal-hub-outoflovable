import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { useEffectiveOrganization } from '@/hooks/useEffectiveOrganization';
import { useEffectiveIndustrySectors } from '@/hooks/useEffectiveIndustrySectors';
import { useHomeConfig } from '@/hooks/useHomeConfig';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { WidgetRenderer } from '@/components/home/WidgetRenderer';
import { HomeEditorToolbar } from '@/components/home/HomeEditorToolbar';
import { HomeEditor } from '@/components/home/HomeEditor';
import { DEFAULT_HOME_LAYOUT, HomeLayout } from '@/lib/defaultHomeLayout';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { t } = useTranslation();
  const { effectiveOrganizationId, isImpersonating } = useEffectiveOrganization();
  const { primarySector } = useEffectiveIndustrySectors();
  const { homeConfig, isLoading, getDisplayLayout, hasDraftChanges, saveDraft, publish, revertDraft, isSavingDraft, isPublishing } = useHomeConfig(effectiveOrganizationId, primarySector);
  const { isPlatformAdmin } = usePlatformAdmin();
  const [editorOpen, setEditorOpen] = useState(false);
  const [localLayout, setLocalLayout] = useState<HomeLayout | null>(null);

  // Show editor mode for platform admins when impersonating
  const showEditor = isPlatformAdmin && isImpersonating;

  // Get the appropriate layout
  const baseLayout = showEditor 
    ? (homeConfig?.layout_draft || DEFAULT_HOME_LAYOUT)
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
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {showEditor && (
          <>
            <HomeEditorToolbar
              hasDraftChanges={hasDraftChanges || (localLayout !== null && JSON.stringify(localLayout) !== JSON.stringify(baseLayout))}
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

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold font-serif">{t('home.title')}</h1>
          <p className="text-muted-foreground">
            {t('home.subtitle')}
          </p>
        </div>

        {/* Widgets Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
