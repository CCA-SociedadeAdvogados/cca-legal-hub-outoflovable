import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  FileText,
  Scale,
  AlertTriangle,
  FileCheck,
  ClipboardList,
  FileCode,
  File,
  Search,
  Download,
  Eye,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useAuditLogs,
  translateAction,
  translateTableName,
  type AuditLog,
} from '@/hooks/useAuditLogs';
import { Skeleton } from '@/components/ui/skeleton';
import { Eyebrow } from '@/components/cca';
import { cn } from '@/lib/utils';

const TABLE_ICONS: Record<string, React.ReactNode> = {
  contratos: <FileText className="h-4 w-4" />,
  eventos_legislativos: <Scale className="h-4 w-4" />,
  impactos: <AlertTriangle className="h-4 w-4" />,
  politicas: <FileCheck className="h-4 w-4" />,
  requisitos: <ClipboardList className="h-4 w-4" />,
  templates: <FileCode className="h-4 w-4" />,
  documentos_gerados: <File className="h-4 w-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'border-positive/40 bg-positive/10 text-positive',
  UPDATE: 'border-brand/30 bg-brand/[0.08] text-brand',
  DELETE: 'border-danger/40 bg-danger/10 text-danger',
  VIEW: 'border-line bg-bg-alt text-ink-soft',
  EXPORT: 'border-brand/30 bg-brand/[0.08] text-brand',
};

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-mute">
        {label}
      </span>
      <div className="mt-1 text-[13.5px] text-ink">{children}</div>
    </div>
  );
}

function AuditLogDetail({ log }: { log: AuditLog }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Utilizador">{log.user_email || 'Sistema'}</DetailField>
        <DetailField label="Data/Hora">
          <span className="font-mono text-[13px] [font-variant-numeric:tabular-nums]">
            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: pt })}
          </span>
        </DetailField>
        <DetailField label="Tabela">{translateTableName(log.table_name)}</DetailField>
        <DetailField label="Ação">
          <Badge variant="outline" className={cn('text-xs', ACTION_COLORS[log.action])}>
            {translateAction(log.action)}
          </Badge>
        </DetailField>
        {log.record_id && (
          <div className="col-span-2">
            <span className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-mute">
              ID do Registo
            </span>
            <p className="mt-1 font-mono text-xs text-ink-soft">{log.record_id}</p>
          </div>
        )}
      </div>

      {log.action === 'UPDATE' && log.old_data && log.new_data && (
        <div className="space-y-2">
          <h4 className="font-display text-[14px] font-medium text-ink">Alterações</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-mute">
                Antes
              </span>
              <ScrollArea className="mt-1 h-40 rounded-control border border-line bg-bg-alt p-2">
                <pre className="text-xs text-ink-soft">{JSON.stringify(log.old_data, null, 2)}</pre>
              </ScrollArea>
            </div>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-mute">
                Depois
              </span>
              <ScrollArea className="mt-1 h-40 rounded-control border border-line bg-bg-alt p-2">
                <pre className="text-xs text-ink-soft">{JSON.stringify(log.new_data, null, 2)}</pre>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {log.action === 'CREATE' && log.new_data && (
        <div className="space-y-2">
          <h4 className="font-display text-[14px] font-medium text-ink">Dados Criados</h4>
          <ScrollArea className="h-40 rounded-control border border-line bg-bg-alt p-2">
            <pre className="text-xs text-ink-soft">{JSON.stringify(log.new_data, null, 2)}</pre>
          </ScrollArea>
        </div>
      )}

      {log.action === 'DELETE' && log.old_data && (
        <div className="space-y-2">
          <h4 className="font-display text-[14px] font-medium text-ink">Dados Eliminados</h4>
          <ScrollArea className="h-40 rounded-control border border-line bg-bg-alt p-2">
            <pre className="text-xs text-ink-soft">{JSON.stringify(log.old_data, null, 2)}</pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export default function Auditoria() {
  const { t: _t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { logs, isLoading } = useAuditLogs({
    tableName: tableFilter !== 'all' ? tableFilter : undefined,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    limit: 200,
  });

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(search) ||
      log.table_name.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      log.record_id?.toLowerCase().includes(search)
    );
  });

  const exportLogs = () => {
    const csvContent = [
      ['Data', 'Utilizador', 'Ação', 'Tabela', 'ID Registo'].join(','),
      ...filteredLogs.map((log) =>
        [
          format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
          log.user_email || 'Sistema',
          translateAction(log.action),
          translateTableName(log.table_name),
          log.record_id || '',
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-7">
        <header className="space-y-3">
          <Eyebrow>Compliance</Eyebrow>
          <h1 className="font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink">
            Registos de <span className="italic text-brand">auditoria</span>
          </h1>
          <p className="max-w-2xl font-serif text-[17px] italic leading-[1.55] text-ink-soft">
            Histórico completo de todas as ações realizadas no sistema para fins de compliance e
            rastreabilidade.
          </p>
        </header>

        {/* Filtros */}
        <section className="rounded-card border border-line bg-surface">
          <div className="border-b border-line px-5 py-4">
            <Eyebrow>Filtros</Eyebrow>
            <p className="mt-1.5 text-[13px] text-ink-mute">
              Filtre os registos por tabela, ação ou pesquise por termos específicos.
            </p>
          </div>
          <div className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
                <Input
                  placeholder="Pesquisar por email, tabela, ação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tabela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tabelas</SelectItem>
                  <SelectItem value="contratos">Contratos</SelectItem>
                  <SelectItem value="eventos_legislativos">Eventos Legislativos</SelectItem>
                  <SelectItem value="impactos">Impactos</SelectItem>
                  <SelectItem value="politicas">Políticas</SelectItem>
                  <SelectItem value="requisitos">Requisitos</SelectItem>
                  <SelectItem value="templates">Templates</SelectItem>
                  <SelectItem value="documentos_gerados">Documentos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="CREATE">Criação</SelectItem>
                  <SelectItem value="UPDATE">Atualização</SelectItem>
                  <SelectItem value="DELETE">Eliminação</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportLogs}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </section>

        {/* Histórico */}
        <section className="rounded-card border border-line bg-surface">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <h2 className="font-display text-[19px] font-medium leading-tight tracking-[-0.005em] text-ink">
              Histórico de Ações
            </h2>
            <span className="font-display text-[15px] font-semibold tracking-[-0.03em] text-ink-mute [font-variant-numeric:tabular-nums]">
              {filteredLogs.length}
            </span>
          </div>
          <div className="p-5">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-control" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-control border border-dashed border-line bg-bg-alt/50 py-16 text-center">
                <ClipboardList className="mb-3 h-10 w-10 text-ink-mute" strokeWidth={1.5} />
                <p className="text-[13px] text-ink-mute">Nenhum registo de auditoria encontrado.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-control border border-line">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Utilizador</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>ID Registo</TableHead>
                      <TableHead className="text-right">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm text-ink-soft [font-variant-numeric:tabular-nums]">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: pt })}
                        </TableCell>
                        <TableCell className="text-ink">{log.user_email || 'Sistema'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('text-xs', ACTION_COLORS[log.action])}
                          >
                            {translateAction(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-ink">
                            <span className="text-ink-mute">
                              {TABLE_ICONS[log.table_name] || <File className="h-4 w-4" />}
                            </span>
                            {translateTableName(log.table_name)}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-ink-mute">
                          {log.record_id ? log.record_id.slice(0, 8) + '...' : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Registo de Auditoria</DialogTitle>
                                <DialogDescription>
                                  Informação completa sobre a ação realizada.
                                </DialogDescription>
                              </DialogHeader>
                              <AuditLogDetail log={log} />
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
