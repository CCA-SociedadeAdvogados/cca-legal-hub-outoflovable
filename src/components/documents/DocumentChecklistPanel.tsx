import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';

import { useDocumentChecklist, ChecklistItemWithType } from '@/hooks/useDocumentChecklist';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, AlertTriangle, FileCheck, Upload, CalendarClock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function statusIcon(status: string) {
  switch (status) {
    case 'uploaded':
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case 'expired':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'expiring_soon':
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    default:
      return <XCircle className="h-5 w-5 text-muted-foreground" />;
  }
}

function statusLabel(status: string, t: (k: string, f?: string) => string) {
  switch (status) {
    case 'uploaded': return t('docChecklist.uploaded', 'Carregado');
    case 'expired': return t('docChecklist.expired', 'Expirado');
    case 'expiring_soon': return t('docChecklist.expiringSoon', 'Expira em breve');
    default: return t('docChecklist.missing', 'Em falta');
  }
}

function statusBadgeVariant(status: string): 'active' | 'destructive' | 'default' | 'secondary' {
  switch (status) {
    case 'uploaded': return 'active';
    case 'expired': return 'destructive';
    case 'expiring_soon': return 'default';
    default: return 'secondary';
  }
}

export function DocumentChecklistPanel() {
  const { t } = useTranslation();
  const { items, isLoading, upsertEntry, isTableAvailable } = useDocumentChecklist();
  const [editItem, setEditItem] = useState<ChecklistItemWithType | null>(null);
  const [validityDate, setValidityDate] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isTableAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            {t('docChecklist.title', 'Checklist de Documentos')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('docChecklist.notAvailable', 'A checklist de documentos estará disponível em breve. A migração de base de dados está pendente.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const uploaded = items.filter(i => i.entry?.status === 'uploaded').length;
  const total = items.length;
  const percentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;

  const handleOpenEdit = (item: ChecklistItemWithType) => {
    setEditItem(item);
    setValidityDate(item.entry?.validity_date ?? item.entry?.ai_suggested_date ?? '');
    setConfirmed(item.entry?.confirmed_by_user ?? false);
  };

  const handleSave = () => {
    if (!editItem) return;

    let status = 'uploaded';
    if (!validityDate) {
      status = 'uploaded';
    } else {
      const daysUntil = differenceInDays(new Date(validityDate), new Date());
      if (daysUntil < 0) status = 'expired';
      else if (daysUntil <= 45) status = 'expiring_soon';
      else status = 'uploaded';
    }

    upsertEntry.mutate({
      checklist_type_id: editItem.id,
      status,
      validity_date: validityDate || null,
      confirmed_by_user: confirmed,
    });
    setEditItem(null);
  };

  const handleMarkMissing = (item: ChecklistItemWithType) => {
    upsertEntry.mutate({
      checklist_type_id: item.id,
      status: 'missing',
      validity_date: null,
      confirmed_by_user: false,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                {t('docChecklist.title', 'Checklist de Documentos')}
              </CardTitle>
              <CardDescription>
                {t('docChecklist.subtitle', 'Documentos obrigatórios e a sua validade')}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{percentage}%</p>
              <p className="text-xs text-muted-foreground">{uploaded}/{total} {t('docChecklist.complete', 'completos')}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                percentage === 100 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => {
            const status = item.entry?.status ?? 'missing';
            const validDate = item.entry?.validity_date;

            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                {statusIcon(status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={statusBadgeVariant(status)} className="text-xs">
                      {statusLabel(status, t)}
                    </Badge>
                    {validDate && (
                      <span className="text-xs text-muted-foreground">
                        {t('docChecklist.validUntil', 'Válido até')} {format(new Date(validDate), 'dd/MM/yyyy', { locale: pt })}
                      </span>
                    )}
                    {item.is_required && (
                      <Badge variant="outline" className="text-xs">{t('docChecklist.required', 'Obrigatório')}</Badge>
                    )}
                    {item.entry?.confirmed_by_user && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {status !== 'missing' ? (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkMissing(item)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(item)}>
                    <Upload className="h-4 w-4 mr-1" />
                    {status === 'missing'
                      ? t('docChecklist.upload', 'Registar')
                      : t('docChecklist.update', 'Atualizar')
                    }
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem?.name}</DialogTitle>
            <DialogDescription>
              {t('docChecklist.editDescription', 'Confirme a data de validade do documento. A data poderá ser sugerida por IA, mas deve ser sempre confirmada pelo utilizador.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editItem?.entry?.ai_suggested_date && !editItem.entry.confirmed_by_user && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-3">
                <CalendarClock className="h-4 w-4 text-blue-500 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">{t('docChecklist.aiSuggestion', 'Sugestão IA')}</p>
                  <p className="text-muted-foreground">
                    {format(new Date(editItem.entry.ai_suggested_date), 'dd/MM/yyyy', { locale: pt })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setValidityDate(editItem.entry!.ai_suggested_date!)}
                >
                  {t('docChecklist.useSuggestion', 'Usar')}
                </Button>
              </div>
            )}

            <div>
              <Label>{t('docChecklist.validityDate', 'Data de Validade')}</Label>
              <Input
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confirm-date"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="confirm-date" className="text-sm">
                {t('docChecklist.confirmDate', 'Confirmo que a data de validade está correcta')}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button onClick={handleSave} disabled={!confirmed || upsertEntry.isPending}>
              {upsertEntry.isPending ? t('common.saving', 'A guardar...') : t('common.save', 'Guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
