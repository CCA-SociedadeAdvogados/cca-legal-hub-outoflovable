import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ArrowRight } from 'lucide-react';
import { useContratos } from '@/hooks/useContratos';
import { Link } from 'react-router-dom';

interface RecentContractsWidgetProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const RecentContractsWidget = forwardRef<HTMLDivElement, RecentContractsWidgetProps>(
  function RecentContractsWidget({ title, config }, ref) {
    const { t } = useTranslation();
    const { contratos, isLoading } = useContratos();
    
    const limit = (config.limit as number) || 5;
    const showStatus = config.showStatus !== false;

    // Status labels using i18n
    const statusLabels: Record<string, string> = {
      rascunho: t('status.draft'),
      em_revisao: t('status.inReview'),
      em_aprovacao: t('status.inApproval'),
      enviado_para_assinatura: t('status.sentForSignature'),
      activo: t('status.active'),
      expirado: t('status.expired'),
      denunciado: t('status.denounced'),
      rescindido: t('status.rescinded'),
    };

    const statusColors: Record<string, string> = {
      rascunho: 'bg-muted text-muted-foreground',
      em_revisao: 'bg-blue-100 text-blue-700',
      em_aprovacao: 'bg-yellow-100 text-yellow-700',
      enviado_para_assinatura: 'bg-purple-100 text-purple-700',
      activo: 'bg-green-100 text-green-700',
      expirado: 'bg-red-100 text-red-700',
      denunciado: 'bg-orange-100 text-orange-700',
      rescindido: 'bg-red-100 text-red-700',
    };

    // Sort by created_at and limit
    const recentContracts = contratos
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    if (isLoading) {
      return (
        <Card ref={ref}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3].slice(0, limit).map((i) => (
                <div key={i} className="animate-pulse flex justify-between items-center">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-5 bg-muted rounded w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!recentContracts?.length) {
      return (
        <Card ref={ref}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('home.noContracts')}
            </p>
            <Button variant="outline" size="sm" asChild className="mt-2">
              <Link to="/contratos/novo">{t('home.createContract')}</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/contratos" className="gap-1">
              {t('home.viewAll')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentContracts.map((contract) => (
              <Link
                key={contract.id}
                to={`/contratos/${contract.id}`}
                className="flex justify-between items-center py-1.5 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
              >
                <div className="min-w-0 flex-1 mr-2">
                  <p className="text-sm font-medium truncate">{contract.titulo_contrato}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {contract.parte_b_nome_legal}
                  </p>
                </div>
                {showStatus && (
                  <Badge variant="secondary" className={statusColors[contract.estado_contrato] || ''}>
                    {statusLabels[contract.estado_contrato] || contract.estado_contrato}
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
);

export default RecentContractsWidget;
