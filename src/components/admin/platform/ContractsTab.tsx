import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';

interface ContractRow {
  id: string;
  id_interno: string | null;
  titulo_contrato: string | null;
  estado_contrato: string | null;
  created_at: string;
  organization?: { name: string } | null;
}

interface ContractsTabProps {
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  contracts: ContractRow[] | undefined;
  statusColors: Record<string, string>;
}

export function ContractsTab({
  search,
  onSearchChange,
  isLoading,
  contracts,
  statusColors,
}: ContractsTabProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('admin.allContracts', 'Todos os Contratos')}</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('common.search', 'Pesquisar...')}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>{t('contracts.title', 'Título')}</TableHead>
                <TableHead>{t('admin.organization', 'Organização')}</TableHead>
                <TableHead>{t('contracts.status', 'Estado')}</TableHead>
                <TableHead>{t('common.createdAt', 'Criado em')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts?.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <Badge variant="outline">{contract.id_interno}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{contract.titulo_contrato}</TableCell>
                  <TableCell>{contract.organization?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[contract.estado_contrato ?? ''] || ''}>
                      {t(`status.${contract.estado_contrato}`, contract.estado_contrato ?? '')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(contract.created_at), 'dd MMM yyyy', { locale: pt })}
                  </TableCell>
                </TableRow>
              ))}
              {(!contracts || contracts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum contrato encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
