import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, Download, Sparkles, Table as TableIcon, Upload, Archive, ArchiveRestore, Cloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useContratos } from '@/hooks/useContratos';
import { ContractFilters, ContractFiltersState } from '@/components/contracts/ContractFilters';
import { ContractsTable } from '@/components/contracts/ContractsTable';
import { ContractAIParser } from '@/components/contracts/ContractAIParser';
import { exportContratosToCSV } from '@/lib/exportUtils';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SharePointDocumentsBrowser } from '@/components/sharepoint/SharePointDocumentsBrowser';

const initialFilters: ContractFiltersState = {
  searchQuery: '',
  tipoContrato: 'todos',
  estadoContrato: 'todos',
  departamento: 'todos',
  valorMinimo: '',
  valorMaximo: '',
};

export default function Contratos() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<ContractFiltersState>(initialFilters);
  const [activeTab, setActiveTab] = useState<'contratos' | 'arquivo'>('contratos');
  const [showArchived, setShowArchived] = useState(false);
  const { contratos, isLoading, archiveContrato, restoreContrato, deleteContrato } = useContratos();

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
          contract.titulo_contrato.toLowerCase().includes(query) ||
          contract.id_interno.toLowerCase().includes(query) ||
          contract.parte_b_nome_legal.toLowerCase().includes(query) ||
          contract.objeto_resumido?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (filters.tipoContrato !== 'todos' && contract.tipo_contrato !== filters.tipoContrato) {
        return false;
      }

      if (filters.estadoContrato !== 'todos' && contract.estado_contrato !== filters.estadoContrato) {
        return false;
      }

      if (filters.departamento !== 'todos' && contract.departamento_responsavel !== filters.departamento) {
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

  const archivedCount = useMemo(() => {
    return contratos?.filter(c => c.arquivado).length || 0;
  }, [contratos]);

  const handleArchive = (id: string) => {
    archiveContrato.mutate(id);
  };

  const handleRestore = (id: string) => {
    restoreContrato.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteContrato.mutate(id);
  };

  const isArquivoTab = activeTab === 'arquivo';

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif">{t('contracts.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('contracts.subtitle')}</p>
          </div>
          {!isArquivoTab && (
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('contracts.analyzeWithAI')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('contracts.aiAnalysis')}</DialogTitle>
                  </DialogHeader>
                  <ContractAIParser />
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                onClick={() => {
                  if (filteredContracts.length === 0) {
                    toast({ title: t('common.noResults'), variant: 'destructive' });
                    return;
                  }
                  exportContratosToCSV(filteredContracts);
                  toast({ title: `${filteredContracts.length} ${t('nav.contracts').toLowerCase()}` });
                }}
                disabled={isLoading}
              >
                <Download className="mr-2 h-4 w-4" />
                {t('contracts.exportCSV')}
              </Button>
              <Button asChild variant="outline">
                <Link to="/contratos/upload-massa">
                  <Upload className="mr-2 h-4 w-4" />
                  {t('contracts.bulkUpload')}
                </Link>
              </Button>
              <Button asChild>
                <Link to="/contratos/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('contracts.newContract')}
                </Link>
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'contratos' | 'arquivo')}>
          <TabsList>
            <TabsTrigger value="contratos" className="gap-2">
              <TableIcon className="h-4 w-4" />
              {t('contracts.contractsTab')}
            </TabsTrigger>
            <TabsTrigger value="arquivo" className="gap-2">
              <Cloud className="h-4 w-4" />
              {t('contracts.archiveTab', 'Arquivo')}
            </TabsTrigger>
          </TabsList>

        <TabsContent value="contratos" className="space-y-4">
            {/* Archived Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={showArchived ? "default" : "outline"}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className="gap-2"
              >
                {showArchived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4" />
                    Ver contratos activos
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    Ver arquivados ({archivedCount})
                  </>
                )}
              </Button>
              {showArchived && (
                <span className="text-sm text-muted-foreground">
                  A mostrar contratos arquivados
                </span>
              )}
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

          <TabsContent value="arquivo" className="mt-6">
            <SharePointDocumentsBrowser />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
