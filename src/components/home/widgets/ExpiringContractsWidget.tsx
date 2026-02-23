import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { useContratos } from '@/hooks/useContratos';
import { Link } from 'react-router-dom';
import { differenceInDays, format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';

interface ExpiringContractsWidgetProps {
  title: string;
  config: Record<string, unknown>;
  organizationId: string | null;
}

const ExpiringContractsWidget = forwardRef<HTMLDivElement, ExpiringContractsWidgetProps>(
  function ExpiringContractsWidget({ title, config }, ref) {
    const { t, i18n } = useTranslation();
    const { contratos, isLoading } = useContratos();
    
    const daysAhead = (config.daysAhead as number) || 30;
    const dateLocale = i18n.language === 'pt' ? pt : enUS;

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Filter contracts expiring within the specified days
    const expiringContracts = contratos
      ?.filter((c) => {
        if (!c.data_termo || c.estado_contrato !== 'activo') return false;
        const expiryDate = new Date(c.data_termo);
        return expiryDate >= today && expiryDate <= futureDate;
      })
      .sort((a, b) => new Date(a.data_termo!).getTime() - new Date(b.data_termo!).getTime())
      .slice(0, 5);

    if (isLoading) {
      return (
        <Card ref={ref}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
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

    if (!expiringContracts?.length) {
      return (
        <Card ref={ref}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('home.noExpiringContracts', { days: daysAhead })}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {title}
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {expiringContracts.length}
            </Badge>
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
            {expiringContracts.map((contract) => {
              const daysUntilExpiry = differenceInDays(new Date(contract.data_termo!), today);
              const isUrgent = daysUntilExpiry <= 7;

              return (
                <Link
                  key={contract.id}
                  to={`/contratos/${contract.id}`}
                  className="flex justify-between items-center py-1.5 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-sm font-medium truncate">{contract.titulo_contrato}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(contract.data_termo!), "d 'de' MMMM", { locale: dateLocale })}
                    </p>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={isUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}
                  >
                    {isUrgent && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {daysUntilExpiry} {t('home.days')}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }
);

export default ExpiringContractsWidget;
