import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import {
  TipoContrato,
  EstadoContrato,
  Departamento,
} from '@/types/contracts';

export interface ContractFiltersState {
  searchQuery: string;
  tipoContrato: TipoContrato | 'todos';
  estadoContrato: EstadoContrato | 'todos';
  departamento: Departamento | 'todos';
  valorMinimo: string;
  valorMaximo: string;
}

interface ContractFiltersProps {
  filters: ContractFiltersState;
  onFiltersChange: (filters: ContractFiltersState) => void;
  onClearFilters: () => void;
  totalResults: number;
}

export function ContractFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  totalResults,
}: ContractFiltersProps) {
  const { t } = useTranslation();

  const hasActiveFilters =
    filters.searchQuery ||
    filters.tipoContrato !== 'todos' ||
    filters.estadoContrato !== 'todos' ||
    filters.departamento !== 'todos' ||
    filters.valorMinimo ||
    filters.valorMaximo;

  // Contract type labels using i18n
  const contractTypeLabels: Record<TipoContrato, string> = {
    nda: t('contractTypes.nda'),
    prestacao_servicos: t('contractTypes.services'),
    fornecimento: t('contractTypes.supply'),
    saas: t('contractTypes.saas'),
    arrendamento: t('contractTypes.lease'),
    trabalho: t('contractTypes.employment'),
    licenciamento: t('contractTypes.licensing'),
    parceria: t('contractTypes.partnership'),
    consultoria: t('contractTypes.consulting'),
    outro: t('contractTypes.other'),
  };

  // Contract status labels using i18n
  const contractStatusLabels: Record<EstadoContrato, string> = {
    rascunho: t('status.draft'),
    em_revisao: t('status.inReview'),
    em_aprovacao: t('status.inApproval'),
    enviado_para_assinatura: t('status.sentForSignature'),
    activo: t('status.active'),
    expirado: t('status.expired'),
    denunciado: t('status.denounced'),
    rescindido: t('status.rescinded'),
  };

  // Department labels using i18n
  const departmentLabels: Record<Departamento, string> = {
    comercial: t('departments.commercial'),
    operacoes: t('departments.operations'),
    it: t('departments.it'),
    rh: t('departments.hr'),
    financeiro: t('departments.financial'),
    juridico: t('departments.legal'),
    marketing: t('departments.marketing'),
    outro: t('departments.other'),
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('contracts.searchPlaceholder')}
                className="pl-10"
                value={filters.searchQuery}
                onChange={(e) =>
                  onFiltersChange({ ...filters, searchQuery: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              <span>{t('contracts.contractCount', { count: totalResults })}</span>
            </div>
          </div>

          {/* Filter Row */}
          <div className="grid gap-4 md:grid-cols-5">
            <Select
              value={filters.tipoContrato}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  tipoContrato: value as TipoContrato | 'todos',
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('contracts.contractType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{t('contracts.allTypes')}</SelectItem>
                {Object.entries(contractTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.estadoContrato}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  estadoContrato: value as EstadoContrato | 'todos',
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('contracts.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{t('contracts.allStates')}</SelectItem>
                {Object.entries(contractStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.departamento}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  departamento: value as Departamento | 'todos',
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('contracts.department')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">{t('contracts.allDepartments')}</SelectItem>
                {Object.entries(departmentLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder={t('contracts.minValue')}
              type="number"
              value={filters.valorMinimo}
              onChange={(e) =>
                onFiltersChange({ ...filters, valorMinimo: e.target.value })
              }
            />

            <Input
              placeholder={t('contracts.maxValue')}
              type="number"
              value={filters.valorMaximo}
              onChange={(e) =>
                onFiltersChange({ ...filters, valorMaximo: e.target.value })
              }
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-muted-foreground"
              >
                <X className="mr-2 h-4 w-4" />
                {t('contracts.clearFilters')}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
