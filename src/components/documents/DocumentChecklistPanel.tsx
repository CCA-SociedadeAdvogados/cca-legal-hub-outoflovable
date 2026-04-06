import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';

import { useDocumentChecklist, ChecklistItemWithType } from '@/hooks/useDocumentChecklist';
import { useUploadToSharePoint } from '@/hooks/useSharePoint';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  Upload,
  CalendarClock,
  Loader2,
  Sparkles,
  FileText,
  AlertCircle,
} from 'lucide-react';
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
    case 'uploaded':
      return t('docChecklist.uploaded', 'Carregado');
    case 'expired':
      return t('docChecklist.expired', 'Expirado');
    case 'expiring_soon':
      return t('docChecklist.expiringSoon', 'Expira em breve');
    default:
      return t('docChecklist.missing', 'Em falta');
  }
}

function statusBadgeVariant(status: string): 'active' | 'destructive' | 'default' | 'secondary' {
  switch (status) {
    case 'uploaded':
      return 'active';
    case 'expired':
      return 'destructive';
    case 'expiring_soon':
      return 'default';
    default:
      return 'secondary';
  }
}

// Rule-based validity suggestion (mirrors edge function logic, runs client-side)
const VALIDITY_RULES: Record<string, number> = {
  'certidão permanente': 12,
  'certidao permanente': 12,
  rcbe: 12,
  'registo central do beneficiário efetivo': 12,
  'documentos de identificação': 60,
  'documentos de identificacao': 60,
  'comprovativo de morada': 3,
  'certidão de não dívida at': 3,
  'certidao de nao divida at': 3,
  'certidão de não dívida ss': 3,
  'certidao de nao divida ss': 3,
};

function suggestValidityMonths(docName: string): number {
  const n = docName.toLowerCase().trim();
  for (const [key, months] of Object.entries(VALIDITY_RULES)) {
    if (n.includes(key)) return months;
  }
  return 12; // default
}

interface DocumentChecklistPanelProps {
  uploadFolderPath?: string;
  uploadOrgId?: string;
  /** Human-readable SharePoint path to display (e.g. root_folder_path from config) */
  sharePointDisplayPath?: string;
}

export function DocumentChecklistPanel({
  uploadFolderPath,
  uploadOrgId,
  sharePointDisplayPath,
}: DocumentChecklistPanelProps) {
  const { t } = useTranslation();
  const { items, isLoading, upsertEntry, isTableAvailable, organizationId } =
    useDocumentChecklist();
  const uploadToSharePoint = useUploadToSharePoint(uploadOrgId);
  const [editItem, setEditItem] = useState<ChecklistItemWithType | null>(null);
  const [validityDate, setValidityDate] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSuggestingDate, setIsSuggestingDate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            {t(
              'docChecklist.notAvailable',
              'A checklist de documentos estará disponível em breve. A migração de base de dados está pendente.',
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!organizationId) {
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
            {t(
              'docChecklist.noClient',
              'Selecione um cliente para gerir a checklist de documentos.',
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  const uploaded = items.filter((i) => i.entry?.status === 'uploaded').length;
  const total = items.length;
  const percentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;

  const handleOpenEdit = (item: ChecklistItemWithType) => {
    setEditItem(item);
    setValidityDate(item.entry?.validity_date ?? item.entry?.ai_suggested_date ?? '');
    setConfirmed(item.entry?.confirmed_by_user ?? false);
    setSelectedFile(null);
  };

  const handleCloseEdit = () => {
    setEditItem(null);
    setSelectedFile(null);
  };

  const handleSave = async () => {
    if (!editItem) return;

    let status = 'uploaded';
    if (validityDate) {
      const daysUntil = differenceInDays(new Date(validityDate), new Date());
      if (daysUntil < 0) status = 'expired';
      else if (daysUntil <= 45) status = 'expiring_soon';
    }

    let fileReference: string | null = editItem.entry?.file_reference ?? null;

    // Upload file to SharePoint first if one was selected
    if (selectedFile && uploadFolderPath) {
      try {
        await uploadToSharePoint.mutateAsync({ file: selectedFile, folderPath: uploadFolderPath });
        fileReference = selectedFile.name;
      } catch {
        // Upload error already toasted by the hook — abort save
        return;
      }
    }

    upsertEntry.mutate({
      checklist_type_id: editItem.id,
      status,
      validity_date: validityDate || null,
      confirmed_by_user: confirmed,
      file_reference: fileReference,
    });
    handleCloseEdit();
  };

  const handleSuggestDate = async () => {
    if (!editItem) return;
    setIsSuggestingDate(true);
    try {
      const validityMonths = suggestValidityMonths(editItem.name);

      if (selectedFile) {
        // Limit: 5 MB — larger files cause edge function timeouts
        if (selectedFile.size > 5 * 1024 * 1024) {
          toast({
            title: t('docChecklist.fileTooLarge', 'Ficheiro demasiado grande para análise IA'),
            description: t(
              'docChecklist.fileTooLargeDesc',
              'Limite 5 MB. A usar data de hoje como base.',
            ),
          });
        } else {
          // Use FileReader — avoids btoa stack-overflow on large binary files
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1] ?? '');
            };
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(selectedFile);
          });

          const { data: scanData, error: scanError } = await supabase.functions.invoke(
            'scan-document-date',
            {
              body: {
                file_base64: base64,
                file_name: selectedFile.name,
                mime_type: selectedFile.type || 'application/pdf',
              },
            },
          );

          if (scanError) {
            console.error('[scan-document-date] invoke error:', scanError);
            toast({
              title: t('docChecklist.aiDateError', 'IA não conseguiu ler a data'),
              description: scanError.message ?? String(scanError),
              variant: 'destructive',
            });
          } else if (scanData?.validity_date) {
            // Edge function returned an explicit validity/expiry date from the document
            const validityDateParsed = new Date(scanData.validity_date + 'T12:00:00');
            if (!isNaN(validityDateParsed.getTime())) {
              setValidityDate(validityDateParsed.toISOString().split('T')[0]);
              toast({
                title: t('docChecklist.aiSuggestedApplied', 'Data sugerida pela IA aplicada'),
              });
              return;
            }
          } else if (scanData?.emission_date) {
            // Edge function found emission date but no explicit validity — calculate from rules
            const emissionDate = new Date(scanData.emission_date + 'T12:00:00');
            if (!isNaN(emissionDate.getTime())) {
              emissionDate.setMonth(emissionDate.getMonth() + validityMonths);
              setValidityDate(emissionDate.toISOString().split('T')[0]);
              toast({
                title: t('docChecklist.aiSuggestedApplied', 'Data sugerida pela IA aplicada'),
              });
              return;
            }
          } else {
            // Function returned but no date found — inform user, do NOT fall through to today-based fallback
            console.warn('[scan-document-date] response:', JSON.stringify(scanData));
            const reason = scanData?.reason ?? scanData?.confidence ?? 'unknown';
            toast({
              title: t('docChecklist.aiDateNotFound', 'Data não detectada no documento'),
              description: `reason: ${reason} — ${t('docChecklist.aiDateNotFoundDesc', 'Ajuste manualmente se necessário.')}`,
            });
            setIsSuggestingDate(false);
            return;
          }
        }
      }

      // Fallback: no file or AI couldn't extract date — use today as base
      const suggested = new Date();
      suggested.setMonth(suggested.getMonth() + validityMonths);
      setValidityDate(suggested.toISOString().split('T')[0]);
      toast({ title: t('docChecklist.aiSuggestedApplied', 'Data sugerida aplicada') });
    } catch {
      // Non-fatal: fall back to today + validity period
      const validityMonths = suggestValidityMonths(editItem.name);
      const suggested = new Date();
      suggested.setMonth(suggested.getMonth() + validityMonths);
      setValidityDate(suggested.toISOString().split('T')[0]);
      toast({ title: t('docChecklist.aiSuggestedApplied', 'Data sugerida aplicada') });
    } finally {
      setIsSuggestingDate(false);
    }
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
              <p className="text-xs text-muted-foreground">
                {uploaded}/{total} {t('docChecklist.complete', 'completos')}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                percentage === 100
                  ? 'bg-emerald-500'
                  : percentage >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500',
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
                        {t('docChecklist.validUntil', 'Válido até')}{' '}
                        {format(new Date(validDate), 'dd/MM/yyyy', { locale: pt })}
                      </span>
                    )}
                    {item.is_required && (
                      <Badge variant="outline" className="text-xs">
                        {t('docChecklist.required', 'Obrigatório')}
                      </Badge>
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
                      : t('docChecklist.update', 'Atualizar')}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem?.name}</DialogTitle>
            <DialogDescription>
              {t(
                'docChecklist.editDescription',
                'Carregue o ficheiro e confirme a data de validade do documento.',
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File upload zone — always show when org is available */}
            {uploadOrgId && (
              <div>
                <Label className="mb-1 block">{t('docChecklist.uploadFile', 'Ficheiro')}</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedFile(file);
                  }}
                />
                <div
                  className="cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors hover:border-primary/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {editItem?.entry?.file_reference
                          ? t('docChecklist.replaceFile', 'Clique para substituir: {{name}}', {
                              name: editItem.entry.file_reference,
                            })
                          : t('docChecklist.selectFile', 'Clique para selecionar o ficheiro')}
                      </p>
                      {(sharePointDisplayPath || uploadFolderPath) && (
                        <p className="text-xs text-muted-foreground/70">
                          SharePoint:{' '}
                          <span className="font-mono">
                            {sharePointDisplayPath || uploadFolderPath}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {selectedFile && selectedFile.size > 4 * 1024 * 1024 && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {t('sharepoint.upload.tooLarge', 'Ficheiro demasiado grande. Limite: 4MB')}
                  </p>
                )}
              </div>
            )}

            {editItem?.entry?.ai_suggested_date && !editItem.entry.confirmed_by_user && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-3">
                <CalendarClock className="h-4 w-4 text-blue-500 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">{t('docChecklist.aiSuggestion', 'Sugestão IA')}</p>
                  <p className="text-muted-foreground">
                    {format(new Date(editItem.entry.ai_suggested_date), 'dd/MM/yyyy', {
                      locale: pt,
                    })}
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
              <div className="flex items-center justify-between mb-1">
                <Label>{t('docChecklist.validityDate', 'Data de Validade')}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700"
                  onClick={handleSuggestDate}
                  disabled={isSuggestingDate}
                >
                  {isSuggestingDate ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {t('docChecklist.suggestDate', 'Sugerir data')}
                </Button>
              </div>
              <Input
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
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
            <Button variant="outline" onClick={handleCloseEdit}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !confirmed ||
                upsertEntry.isPending ||
                uploadToSharePoint.isPending ||
                (!!selectedFile && selectedFile.size > 4 * 1024 * 1024)
              }
            >
              {upsertEntry.isPending || uploadToSharePoint.isPending ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  {uploadToSharePoint.isPending
                    ? t('docChecklist.uploading', 'A carregar...')
                    : t('common.saving', 'A guardar...')}
                </>
              ) : (
                t('common.save', 'Guardar')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
