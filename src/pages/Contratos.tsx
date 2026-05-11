import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Plus,
  Download,
  Sparkles,
  Table as TableIcon,
  Upload,
  Archive,
  ArchiveRestore,
  Cloud,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useContratos } from '@/hooks/useContratos';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import { ContractFiltersState } from '@/components/contracts/ContractFilters';
import { ContractsTable } from '@/components/contracts/ContractsTable';
import { ContractAIParser } from '@/components/contracts/ContractAIParser';
import { GenerateContractDialog } from '@/components/contracts/GenerateContractDialog';
import { MultiContractAnalysis } from '@/components/contracts/MultiContractAnalysis';
import { exportContratosToCSV } from '@/lib/exportUtils';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SharePointDocumentsBrowser } from '@/components/sharepoint/SharePointDocumentsBrowser';
import { cn } from '@/lib/utils';
import { Eyebrow, GoldButton, GhostButton } from '@/components/cca';

const initialFilters: ContractFiltersState = {
  searchQuery: '',
  tipoContrato: 'todos',
  estadoContrato: 'todos',
  departamento: 'todos',
  valorMinimo: '',
  valorMaximo: '',
};

const eurFormatter = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export default function Contratos() {
  const { t } = useTranslation();
  const [filters, _setFilters] = useState<ContractFiltersState>(initialFilters);
  const [activeTab, setActiveTab] = useState<'contratos' | 'ia' | 'arquivo'>('contratos');
  const [showArchived, setShowArchived] = useState(false);
  const { contratos, isLoading, archiveContrato, restoreContrato, deleteContrato } = useContratos();
  const { currentOrganization, isCCAInternalAuthorized, viewingOrganizationId } =
    useOrganizations();
  const { cliente } = useCliente();

  const effectiveOrgId = isCCAInternalAuthorized
    ? (viewingOrganizationId ?? cliente?.organizationId ?? null)
    : (currentOrganization?.id ?? null);

  const filteredContracts = useMemo(() => {
    if (!contratos) return [];

    return contratos.filter((contract) => {
      if (showArchived) {
        if (!contract.arquivado) return false;
      } else {
        if (contract.arquivado) return false;
      }

      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch =
          contract.titulo_contrato?.toLowerCase().includes(query) ||
          contract.id_interno?.toLowerCase().includes(query) ||
          contract.parte_b_nome_legal?.toLowerCase().includes(query) ||
          contract.objeto_resumido?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (filters.tipoContrato !== 'todos' && contract.tipo_contrato !== filters.tipoContrato) {
        return false;
      }

      if (
        filters.estadoContrato !== 'todos' &&
        contract.estado_contrato !== filters.estadoContrato
      ) {
        return false;
      }

      if (
        filters.departamento !== 'todos' &&
        contract.departamento_responsavel !== filters.departamento
      ) {
        return false;
      }

      if (filters.valorMinimo && contract.valor_total_estimado !== null) {
        if (Number(contract.valor_total_estimado) < parseFloat(filters.valorMinimo)) return false;
      }
      if (filters.valorMaximo && contract.valor_total_estimado !== null) {
        if (Number(contract.valor_total_estimado) > parseFloat(filters.valorMaximo)) return false;
      }

      return true;
    });
  }, [filters, contratos, showArchived]);

  const archivedCount = useMemo(
    () => contratos?.filter((c) => c.arquivado).length || 0,
    [contratos],
  );

  /** Summary line: "N contratos · € X em valor activo" (only when on the contratos tab). */
  const summary = useMemo(() => {
    const list = (contratos ?? []).filter((c) => !c.arquivado);
    const activeValue = list
      .filter((c) => c.estado_contrato === 'activo')
      .reduce((sum, c) => sum + Number(c.valor_total_estimado ?? 0), 0);
    return {
      total: list.length,
      activeValueFormatted: eurFormatter.format(activeValue),
    };
  }, [contratos]);

  const handleArchive = (id: string) => archiveContrato.mutate(id);
  const handleRestore = (id: string) => restoreContrato.mutate(id);
  const handleDelete = (id: string) => deleteContrato.mutate(id);

  const isArquivoTab = activeTab === 'arquivo';
  const isIaTab = activeTab === 'ia';

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-7">
        {/* Page header */}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <header className="space-y-3">
            <Eyebrow>{t('nav.contracts')}</Eyebrow>
            <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
              {t('contracts.title').split(' ')[0]}{' '}
              <span className="italic text-brand">
                {t('contracts.title').split(' ').slice(1).join(' ') || ''}
              </span>
            </h1>
            <p className="font-serif text-[17px] italic leading-[1.55] text-ink-soft">
              {t('contracts.subtitle')}
            </p>
          </header>

          {!isArquivoTab && !isIaTab && (
            <div className="flex flex-wrap items-center gap-2">
              <GenerateContractDialog />
              <Dialog>
                <DialogTrigger asChild>
                  <GhostButton>
                    <Sparkles className="h-4 w-4" />
                    {t('contracts.analyzeWithAI')}
                  </GhostButton>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('contracts.aiAnalysis')}</DialogTitle>
                  </DialogHeader>
                  <ContractAIParser />
                </DialogContent>
              </Dialog>
              <GhostButton
                onClick={() => {
                  if (filteredContracts.length === 0) {
                    toast({ title: t('common.noResults'), variant: 'destructive' });
                    return;
                  }
                  exportContratosToCSV(filteredContracts);
                  toast({
                    title: `${filteredContracts.length} ${t('nav.contracts').toLowerCase()}`,
                  });
                }}
                disabled={isLoading}
              >
                <Download className="h-4 w-4" />
                {t('contracts.exportCSV')}
              </GhostButton>
              <GhostButton asChild>
                <Link to="/contratos/upload-massa">
                  <Upload className="h-4 w-4" />
                  {t('contracts.bulkUpload')}
                </Link>
              </GhostButton>
              <GoldButton asChild>
                <Link to="/contratos/novo">
                  <Plus className="h-4 w-4" />
                  {t('contracts.newContract')}
                </Link>
              </GoldButton>
            </div>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'contratos' | 'ia' | 'arquivo')}
        >
          <TabsList className="h-auto gap-1 rounded-control border border-line bg-bg-alt/60 p-1">
            <TabsTrigger
              value="contratos"
              className="gap-2 rounded-control text-[12.5px] data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              <TableIcon className="h-3.5 w-3.5" strokeWidth={1.6} />
              {t('contracts.contractsTab')}
            </TabsTrigger>
            <TabsTrigger
              value="ia"
              className="gap-2 rounded-control text-[12.5px] data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.6} />
              Análise IA
            </TabsTrigger>
            <TabsTrigger
              value="arquivo"
              className="gap-2 rounded-control text-[12.5px] data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-none"
            >
              <Cloud className="h-3.5 w-3.5" strokeWidth={1.6} />
              {t('contracts.archiveTab', 'Arquivo')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contratos" className="mt-5 space-y-4">
            {/* Archive toggle + summary counter */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className={cn(
                  'inline-flex h-8 items-center gap-2 rounded-control border px-3 text-[12px] font-medium transition-colors',
                  showArchived
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-surface text-ink-soft hover:border-ink hover:bg-bg-alt',
                )}
              >
                {showArchived ? (
                  <>
                    <ArchiveRestore className="h-3.5 w-3.5" strokeWidth={1.6} />
                    Ver contratos activos
                  </>
                ) : (
                  <>
                    <Archive className="h-3.5 w-3.5" strokeWidth={1.6} />
                    Ver arquivados ({archivedCount})
                  </>
                )}
              </button>
              <div className="text-[11.5px] text-ink-mute">
                <span className="font-mono">{summary.total}</span> contratos
                <span className="mx-2 text-line">·</span>
                <span className="font-mono text-ink">{summary.activeValueFormatted}</span> em valor
                activo
              </div>
            </div>

            <ContractsTable
              contratos={filteredContracts}
              onArchive={handleArchive}
              onRestore={handleRestore}
              onDelete={handleDelete}
              showArchived={showArchived}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="ia" className="mt-6">
            <MultiContractAnalysis organizationId={effectiveOrgId} />
          </TabsContent>

          <TabsContent value="arquivo" className="mt-6">
            <SharePointDocumentsBrowser />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
