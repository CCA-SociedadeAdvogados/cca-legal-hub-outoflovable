import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ExternalLink, Loader2 } from 'lucide-react';

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
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-serif flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            {t('legalbi.title', 'LegalBI')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('legalbi.subtitle', 'Business Intelligence jurídico — visão integrada da carteira')}
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="h-16 w-16 text-primary mb-6" />
            <Button
              size="lg"
              onClick={() =>
                window.open(
                  'https://bi.cca.law/Identity/Account/Login',
                  '_blank',
                  'noopener,noreferrer',
                )
              }
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-5 w-5" />
              {t('legalbi.loginButton', 'Entrar no LegalBI')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
