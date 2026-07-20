import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, ChevronRight, ListChecks, Loader2, Plus } from 'lucide-react';
import { Eyebrow, GoldButton, Pill } from '@/components/cca';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import {
  useCreateTlInstance,
  useTlInstances,
  useTlTemplates,
  type TlInstance,
} from '@/hooks/useTimelines';
import { LawyerTimeline } from '@/components/timelines/LawyerTimeline';

/**
 * Timelines de processos — vista do advogado (cockpit CCA).
 * Lista as instâncias do cliente selecionado, permite criar uma nova a partir
 * de um template e gerir as fases (toggles) via LawyerTimeline.
 */
export default function TimelinesProcessos() {
  const { t } = useTranslation();
  const { currentOrganization, isCCAInternalAuthorized } = useOrganizations();
  const { viewingOrganizationId } = useCliente();
  const organizationId =
    viewingOrganizationId || (isCCAInternalAuthorized ? null : currentOrganization?.id) || null;

  const { data: instances = [], isLoading } = useTlInstances(organizationId);
  const { data: templates = [] } = useTlTemplates();
  const createInstance = useCreateTlInstance();

  const [novoOpen, setNovoOpen] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [matterRef, setMatterRef] = useState('');
  const [gatilhoData, setGatilhoData] = useState('');

  const criar = async () => {
    if (!templateId || !organizationId) return;
    await createInstance.mutateAsync({
      template_id: templateId,
      org_id: organizationId,
      matter_ref: matterRef.trim() || null,
      gatilho_data: gatilhoData || null,
    });
    setTemplateId('');
    setMatterRef('');
    setGatilhoData('');
    setNovoOpen(false);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-7 animate-fade-in">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <header className="space-y-3">
            <Eyebrow>{t('nav.timelines')}</Eyebrow>
            <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
              {t('timelines.cca.title')}
            </h1>
            <p className="font-serif text-[17px] italic leading-[1.55] text-ink-soft">
              {t('timelines.cca.description')}
            </p>
          </header>
          {organizationId && (
            <GoldButton onClick={() => setNovoOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('timelines.cca.new')}
            </GoldButton>
          )}
        </div>

        {!organizationId ? (
          <Card className="rounded-card border-line bg-surface">
            <CardContent className="py-10 text-center text-sm text-ink-soft">
              {t('timelines.cca.selectClient')}
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : instances.length === 0 ? (
          <Card className="rounded-card border-line bg-surface">
            <CardContent className="flex flex-col items-center py-14 text-center">
              <ListChecks className="mb-3 h-10 w-10 text-ink-mute" strokeWidth={1.5} />
              <p className="text-sm text-ink-soft">{t('timelines.cca.empty')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {instances.map((instance) => (
              <InstanceCard key={instance.id} instance={instance} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('timelines.cca.newTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('timelines.cca.template')}</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('timelines.cca.templatePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tl-matter-ref">{t('timelines.cca.matterRef')}</Label>
              <Input
                id="tl-matter-ref"
                value={matterRef}
                onChange={(e) => setMatterRef(e.target.value)}
                placeholder={t('timelines.cca.matterRefPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tl-gatilho">{t('timelines.cca.gatilhoData')}</Label>
              <Input
                id="tl-gatilho"
                type="date"
                value={gatilhoData}
                onChange={(e) => setGatilhoData(e.target.value)}
              />
              <p className="text-xs text-ink-mute">{t('timelines.cca.gatilhoHint')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={criar}
              disabled={!templateId || createInstance.isPending}
              className="gap-2"
            >
              {createInstance.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('timelines.cca.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function InstanceCard({ instance }: { instance: TlInstance }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Card className="rounded-card border-line bg-surface transition-colors hover:border-brand/40">
      <CardContent className="p-5">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-mute" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-mute" />
              )}
              <span className="text-sm font-medium text-ink">
                {instance.matter_ref || t('timelines.cca.noRef')}
              </span>
              {instance.urgente && (
                <Pill tone="danger" className="text-[10px]">
                  {t('timelines.urgent')}
                </Pill>
              )}
            </div>
            <p className="ml-6 mt-0.5 text-xs text-ink-soft [font-variant-numeric:tabular-nums]">
              {instance.tl_templates?.title ?? instance.template_id}
              {instance.gatilho_data
                ? ` · ${t('timelines.cca.gatilhoData')}: ${new Date(
                    instance.gatilho_data,
                  ).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'pt-PT')}`
                : ''}
            </p>
          </div>
        </button>

        {open && (
          <div className="ml-6 mt-4 border-t border-line pt-4">
            <LawyerTimeline instanceId={instance.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
