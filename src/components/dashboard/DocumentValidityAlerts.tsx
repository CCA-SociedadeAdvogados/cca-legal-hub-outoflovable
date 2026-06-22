import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Link } from 'react-router-dom';

import { useDocumentChecklist, ChecklistItemWithType } from '@/hooks/useDocumentChecklist';
import {
  classifyDocument,
  evaluateDocumentValidity,
  ValidityResult,
} from '@/lib/documentValidityRules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnrichedItem {
  item: ChecklistItemWithType;
  validity: ValidityResult;
  category: string;
}

export function DocumentValidityAlerts() {
  const { t, i18n } = useTranslation();
  const { items, isLoading, isTableAvailable } = useDocumentChecklist();
  const lang = (i18n.language === 'en' ? 'en' : 'pt') as 'pt' | 'en';

  const enrichedItems = useMemo<EnrichedItem[]>(() => {
    return items.map((item) => {
      const category = classifyDocument(item.name);
      const validityDate = item.entry?.validity_date ? new Date(item.entry.validity_date) : null;
      const validity = evaluateDocumentValidity(category, validityDate, validityDate, lang);
      return { item, validity, category };
    });
  }, [items, lang]);

  const groups = useMemo(() => {
    const expired = enrichedItems.filter(
      (e) => e.validity.status === 'expired' || e.item.entry?.status === 'expired',
    );
    const expiringSoon = enrichedItems.filter(
      (e) => e.validity.status === 'expiring_soon' || e.item.entry?.status === 'expiring_soon',
    );
    const advisory = enrichedItems.filter(
      (e) =>
        e.validity.status === 'advisory' &&
        e.item.entry?.status !== 'expired' &&
        e.item.entry?.status !== 'expiring_soon',
    );
    const valid = enrichedItems.filter(
      (e) => e.validity.status === 'valid' && e.item.entry?.status === 'uploaded',
    );
    const missing = enrichedItems.filter((e) => !e.item.entry || e.item.entry.status === 'missing');

    return { expired, expiringSoon, advisory, valid, missing };
  }, [enrichedItems]);

  if (isLoading || !isTableAvailable || items.length === 0) {
    return null;
  }

  const total = items.length;
  const uploaded = items.filter((i) => i.entry?.status === 'uploaded').length;
  const percent = total > 0 ? Math.round((uploaded / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          {t('docValidity.title', 'Validade Documental')}
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-accent" asChild>
          <Link to="/documentos">
            {t('dashboard.viewAll')}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">
              {t('docChecklist.progress', { count: uploaded, total })}
            </span>
            <span className="font-bold">{percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                percent === 100 ? 'bg-positive' : percent >= 50 ? 'bg-warn' : 'bg-danger',
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Summary counters — só mostra os que têm valor (esconde zeros) */}
        {(() => {
          const counters = [
            {
              key: 'valid',
              icon: <CheckCircle2 className="h-4 w-4 text-positive shrink-0" />,
              label: t('docValidity.valid', 'Válidos'),
              value: groups.valid.length,
            },
            {
              key: 'expiringSoon',
              icon: <AlertTriangle className="h-4 w-4 text-warn shrink-0" />,
              label: t('docValidity.expiringSoon', 'A expirar'),
              value: groups.expiringSoon.length,
            },
            {
              key: 'expired',
              icon: <XCircle className="h-4 w-4 text-danger shrink-0" />,
              label: t('docValidity.expired', 'Expirados'),
              value: groups.expired.length,
            },
            {
              key: 'advisory',
              icon: <Info className="h-4 w-4 text-brand shrink-0" />,
              label: t('docValidity.advisory', 'Recomendação'),
              value: groups.advisory.length,
            },
          ].filter((c) => c.value > 0);

          if (counters.length === 0) return null;

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {counters.map((c) => (
                <div key={c.key} className="flex items-center gap-2 rounded-lg border p-2">
                  {c.icon}
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="font-bold text-sm">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Alert items */}
        <div className="space-y-2">
          {/* Expired */}
          {groups.expired.map((e) => (
            <DocumentAlertRow
              key={e.item.id}
              name={lang === 'en' && e.item.name_en ? e.item.name_en : e.item.name}
              status="expired"
              validity={e.validity}
              lang={lang}
            />
          ))}

          {/* Expiring soon */}
          {groups.expiringSoon.map((e) => (
            <DocumentAlertRow
              key={e.item.id}
              name={lang === 'en' && e.item.name_en ? e.item.name_en : e.item.name}
              status="expiring_soon"
              validity={e.validity}
              lang={lang}
            />
          ))}

          {/* Advisory */}
          {groups.advisory.map((e) => (
            <DocumentAlertRow
              key={e.item.id}
              name={lang === 'en' && e.item.name_en ? e.item.name_en : e.item.name}
              status="advisory"
              validity={e.validity}
              lang={lang}
            />
          ))}

          {/* Valid (collapsed) */}
          {groups.valid.map((e) => (
            <DocumentAlertRow
              key={e.item.id}
              name={lang === 'en' && e.item.name_en ? e.item.name_en : e.item.name}
              status="valid"
              validity={e.validity}
              lang={lang}
            />
          ))}

          {/* Missing */}
          {groups.missing.map((e) => (
            <DocumentAlertRow
              key={e.item.id}
              name={lang === 'en' && e.item.name_en ? e.item.name_en : e.item.name}
              status="missing"
              validity={e.validity}
              lang={lang}
              isRequired={e.item.is_required}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentAlertRow({
  name,
  status,
  validity,
  isRequired,
}: {
  name: string;
  status: 'expired' | 'expiring_soon' | 'advisory' | 'valid' | 'missing';
  validity: ValidityResult;
  lang?: string;
  isRequired?: boolean;
}) {
  const { t } = useTranslation();

  const iconMap = {
    expired: <XCircle className="h-4 w-4 text-danger shrink-0" />,
    expiring_soon: <AlertTriangle className="h-4 w-4 text-warn shrink-0" />,
    advisory: <Info className="h-4 w-4 text-brand shrink-0" />,
    valid: <CheckCircle2 className="h-4 w-4 text-positive shrink-0" />,
    missing: <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />,
  };

  const badgeVariantMap: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
    expired: 'destructive',
    expiring_soon: 'default',
    advisory: 'outline',
    valid: 'secondary',
    missing: 'secondary',
  };

  const statusLabel = {
    expired: t('docChecklist.expired'),
    expiring_soon: t('docChecklist.expiringSoon'),
    advisory: t('docValidity.advisoryLabel', 'Recomendação'),
    valid: t('docChecklist.uploaded'),
    missing: t('docChecklist.missing'),
  };

  return (
    <div className="flex items-start gap-2 text-sm">
      {iconMap[status]}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{name}</span>
          <Badge variant={badgeVariantMap[status]} className="text-[10px]">
            {statusLabel[status]}
          </Badge>
          {isRequired && status === 'missing' && (
            <Badge variant="destructive" className="text-[10px]">
              {t('docChecklist.missing')}
            </Badge>
          )}
        </div>
        {validity.expiryDate && (
          <p className="text-xs text-muted-foreground">
            {t('docChecklist.validUntil')}{' '}
            {format(validity.expiryDate, 'dd/MM/yyyy', { locale: pt })}
            {validity.daysRemaining !== null && validity.daysRemaining > 0 && (
              <> ({validity.daysRemaining}d)</>
            )}
          </p>
        )}
        {validity.advisory && <p className="text-xs text-brand mt-0.5">{validity.advisory}</p>}
      </div>
    </div>
  );
}
