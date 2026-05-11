import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { BarChart3, ExternalLink, Loader2 } from 'lucide-react';
import { Eyebrow, GoldButton } from '@/components/cca';

export default function LegalBi() {
  const { t } = useTranslation();
  const { currentOrganization, isCCAInternalAuthorized, viewingOrganizationId } =
    useOrganizations();
  const { cliente } = useCliente();

  const effectiveOrgId = isCCAInternalAuthorized
    ? (viewingOrganizationId ?? cliente?.organizationId ?? null)
    : (currentOrganization?.id ?? null);

  const { data: viewingOrg, isLoading } = useQuery({
    queryKey: ['legalbi-org-url', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return null;
      const { data } = await supabase
        .from('organizations')
        .select('legalbi_url')
        .eq('id', effectiveOrgId)
        .maybeSingle();
      return data as { legalbi_url?: string | null } | null;
    },
    enabled: !!effectiveOrgId,
    staleTime: 2 * 60 * 1000,
  });

  const _legalbiUrl = isCCAInternalAuthorized
    ? (viewingOrg?.legalbi_url ?? null)
    : ((currentOrganization as Record<string, unknown>)?.legalbi_url as string | null | undefined);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      </AppLayout>
    );
  }

  const title = t('legalbi.title', 'LegalBI');

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-7">
        <header className="space-y-3">
          <Eyebrow>{title}</Eyebrow>
          <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
            Indicadores <span className="italic text-brand">jurídicos</span>
          </h1>
          <p className="font-serif text-[17px] italic leading-[1.55] text-ink-soft">
            {t('legalbi.subtitle', 'Business Intelligence jurídico — visão integrada da carteira')}
          </p>
        </header>

        <Card className="relative overflow-hidden bg-gradient-hero">
          <div className="flex flex-col items-center justify-center gap-6 px-8 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-card border border-line bg-surface">
              <BarChart3 className="h-7 w-7 text-brand" strokeWidth={1.4} />
            </div>
            <div className="max-w-prose space-y-2">
              <h2 className="font-display text-[24px] font-medium tracking-[-0.005em] text-ink">
                Aceda ao seu dashboard BI
              </h2>
              <p className="text-[13px] leading-[1.6] text-ink-soft">
                {t(
                  'legalbi.description',
                  'Visualize indicadores de carteira, valor contratual, distribuição por área e renovações no painel completo do LegalBI.',
                )}
              </p>
            </div>
            <GoldButton
              onClick={() =>
                window.open(
                  'https://bi.cca.law/Identity/Account/Login',
                  '_blank',
                  'noopener,noreferrer',
                )
              }
              className="h-10 px-5"
            >
              <ExternalLink className="h-4 w-4" />
              {t('legalbi.loginButton', 'Entrar no LegalBI')}
            </GoldButton>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
