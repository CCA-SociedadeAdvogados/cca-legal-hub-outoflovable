import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut } from 'lucide-react';
import { Eyebrow } from '@/components/cca';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useProfile } from '@/hooks/useProfile';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useEffectiveIndustrySectors } from '@/hooks/useEffectiveIndustrySectors';
import { useUserTheme } from '@/hooks/useUserTheme';
import { useAuth } from '@/contexts/AuthContext';
import { getSectorLabel } from '@/lib/industrySectors';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[12.5px] font-medium text-ink-mute">{label}</span>
      <div className="text-[13.5px] text-ink">{children}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface">
      <div className="border-b border-line px-5 py-3.5">
        <h2 className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-mute">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-line px-5">{children}</div>
    </section>
  );
}

export default function PortalPerfil() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile, isLoading: isLoadingProfile } = useProfile();
  const { currentOrganization } = useOrganizations();
  const { sectors, isLoading: isLoadingSectors } = useEffectiveIndustrySectors();
  const { resolvedTheme, toggleTheme } = useUserTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <Eyebrow>{t('portal.pages.profile.eyebrow')}</Eyebrow>
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
          {t('portal.pages.profile.title')}
        </h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">
          {t('portal.pages.profile.description')}
        </p>
      </header>

      {/* Conta */}
      <Card title={t('portal.profile.account')}>
        {isLoadingProfile ? (
          <div className="py-4">
            <Skeleton className="h-5 w-48" />
          </div>
        ) : (
          <>
            <Row label={t('portal.profile.name')}>{profile?.nome_completo || '—'}</Row>
            <Row label={t('portal.profile.email')}>{profile?.email || '—'}</Row>
          </>
        )}
      </Card>

      {/* Organização e setor */}
      <Card title={t('portal.profile.organization')}>
        <Row label={t('portal.profile.organizationName')}>{currentOrganization?.name || '—'}</Row>
        <Row label={t('portal.profile.sectors')}>
          {isLoadingSectors ? (
            <Skeleton className="h-5 w-32" />
          ) : sectors.length === 0 ? (
            <span className="text-ink-mute">{t('portal.profile.noSectors')}</span>
          ) : (
            <div className="flex flex-wrap justify-end gap-1.5">
              {sectors.map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="border-brand/30 bg-brand/[0.06] text-brand"
                >
                  {getSectorLabel(s)}
                </Badge>
              ))}
            </div>
          )}
        </Row>
        <div className="py-3">
          <p className="text-[11.5px] leading-relaxed text-ink-mute">
            {t('portal.profile.sectorHint')}
          </p>
        </div>
      </Card>

      {/* Preferências */}
      <Card title={t('portal.profile.preferences')}>
        <Row label={t('portal.profile.language')}>
          <LanguageSelector />
        </Row>
        <Row label={t('portal.profile.theme')}>
          <Button variant="outline" size="sm" className="gap-2" onClick={toggleTheme}>
            {resolvedTheme === 'dark' ? (
              <>
                <Sun className="h-4 w-4" />
                {t('common.lightMode')}
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                {t('common.darkMode')}
              </>
            )}
          </Button>
        </Row>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" className="gap-2 text-danger" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          {t('common.logout')}
        </Button>
      </div>
    </div>
  );
}
