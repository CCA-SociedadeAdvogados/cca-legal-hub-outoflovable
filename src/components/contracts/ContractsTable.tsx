import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  FileText,
  ChevronDown,
  Search,
  X,
  ExternalLink,
  RefreshCw,
  GitCompare,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Contrato } from '@/hooks/useContratos';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ValidationBadge, ValidationStatusType } from './ValidationBadge';
import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';
import { cn } from '@/lib/utils';

// ─── Mappings ─────────────────────────────────────────────────────────────────

const FASE_MAP: Record<string, { label: string; className: string }> = {
  rascunho:              { label: 'Em negociação',     className: 'border-muted-foreground/40 text-muted-foreground bg-muted/40' },
  em_revisao:            { label: 'Em validação',      className: 'border-amber-400/60 text-amber-700 bg-amber-50' },
  em_aprovacao:          { label: 'Em validação',      className: 'border-amber-400/60 text-amber-700 bg-amber-50' },
  enviado_para_assinatura: { label: 'Em validação',   className: 'border-amber-400/60 text-amber-700 bg-amber-50' },
  activo:                { label: 'Activo',            className: 'border-green-500/60 text-green-700 bg-green-50' },
  expirado:              { label: 'Terminado',         className: 'border-destructive/40 text-destructive bg-destructive/10' },
  denunciado:            { label: 'Terminado',         className: 'border-destructive/40 text-destructive bg-destructive/10' },
  rescindido:            { label: 'Terminado',         className: 'border-destructive/40 text-destructive bg-destructive/10' },
  arquivado:             { label: 'Arquivado',         className: 'border-muted text-muted-foreground bg-muted/20' },
};

const TIPO_LABELS: Record<string, string> = {
  nda: 'NDA',
  prestacao_servicos: 'Serviços',
  fornecimento: 'Fornecimento',
  saas: 'SaaS',
  arrendamento: 'Arrendamento',
  trabalho: 'Trabalho',
  licenciamento: 'Licenciamento',
  parceria: 'Parceria',
  consultoria: 'Consultoria',
  outro: 'Outro',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = 'next_deadline' | 'updated_at' | 'parte_b_nome_legal';
type QuickFilter = 'all' | 'active' | 'expiring30' | 'expiring60' | 'validating' | 'needs_review';

interface ContractsTableProps {
  contratos: Contrato[];
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
  showArchived?: boolean;
  isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNextDeadline(c: Contrato): { label: string; date: Date | null; days: number | null } {
  const candidates: Array<{ date: Date; label: string }> = [];
  if (c.data_limite_decisao_renovacao) {
    candidates.push({ date: new Date(c.data_limite_decisao_renovacao), label: 'Decisão renovação' });
  }
  if (c.data_termo) {
    candidates.push({ date: new Date(c.data_termo), label: 'Termo' });
  }
  if (candidates.length === 0) return { label: 'Sem prazo identificado', date: null, days: null };

  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  const best = candidates[0];
  const days = differenceInDays(best.date, new Date());
  return {
    label: `${best.label}: ${format(best.date, 'dd/MM/yyyy', { locale: pt })} (em ${days} dias)`,
    date: best.date,
    days,
  };
}

function getNoticeInfo(c: Contrato): {
  noticeDate: Date;
  daysUntilNotice: number;
  status: 'closed' | 'urgent' | 'normal';
  noticeDays: number;
} | null {
  if (!c.data_termo || !c.aviso_previo_nao_renovacao_dias) return null;
  const noticeDays = c.aviso_previo_nao_renovacao_dias;
  if (noticeDays <= 0) return null;
  const termDate = new Date(c.data_termo);
  const noticeDate = new Date(termDate.getTime() - noticeDays * 24 * 60 * 60 * 1000);
  const daysUntilNotice = differenceInDays(noticeDate, new Date());
  const status = daysUntilNotice < 0 ? 'closed' : daysUntilNotice <= 30 ? 'urgent' : 'normal';
  return { noticeDate, daysUntilNotice, status, noticeDays };
}

function DeadlineCell({ c }: { c: Contrato }) {
  const { label, days } = getNextDeadline(c);
  const notice = getNoticeInfo(c);

  if (days === null) return <span className="text-muted-foreground text-xs">{label}</span>;
  const colorClass = days <= 30 ? 'text-destructive font-semibold' : days <= 60 ? 'text-orange-600 font-medium' : 'text-foreground';

  let noticeLine: React.ReactNode = null;
  if (notice) {
    if (notice.status === 'closed') {
      noticeLine = <span className="text-destructive text-[11px]">Janela de aviso encerrada</span>;
    } else if (notice.status === 'urgent') {
      noticeLine = (
        <span className="text-amber-600 text-[11px]">
          Aviso: acção necessária até {format(notice.noticeDate, 'dd/MM/yyyy', { locale: pt })}
        </span>
      );
    } else {
      noticeLine = <span className="text-muted-foreground text-[11px]">Aviso prévio: {notice.noticeDays} dias</span>;
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn('text-xs', colorClass)}>{label}</span>
      {noticeLine}
    </div>
  );
}

function FaseBadge({ estado, validationStatus }: { estado: string; validationStatus: string | null }) {
  if (validationStatus === 'validating') {
    return (
      <Badge variant="outline" className="border-blue-400/60 text-blue-700 bg-blue-50 gap-1.5 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        Em validação CCA
      </Badge>
    );
  }
  const cfg = FASE_MAP[estado] || { label: estado, className: 'border-muted-foreground/40 text-muted-foreground' };
  return (
    <Badge variant="outline" className={cn('text-xs', cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

function formatCurrency(value: number | null) {
  if (value === null) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

// ─── Contract Drawer ──────────────────────────────────────────────────────────

function RgpdIndicator({ value, label }: { value: boolean | null; label: string }) {
  const is = value === true;
  const unknown = value === null;
  return (
    <div className="flex items-center gap-2 text-sm">
      {unknown ? (
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
      ) : is ? (
        <CheckCircle2 className="h-4 w-4 text-destructive" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={cn('text-muted-foreground', is && 'text-foreground font-medium')}>{label}</span>
      <span className="ml-auto text-xs font-medium">{unknown ? '—' : is ? 'Sim' : 'Não'}</span>
    </div>
  );
}

interface ContractDrawerProps {
  contrato: Contrato | null;
  open: boolean;
  onClose: () => void;
  isInternal: boolean;
}

function ContractDrawer({ contrato, open, onClose, isInternal }: ContractDrawerProps) {
  const { label: deadlineLabel, days } = contrato ? getNextDeadline(contrato) : { label: '', days: null };
  const deadlineColor = days !== null && days <= 30 ? 'text-destructive' : days !== null && days <= 60 ? 'text-orange-600' : 'text-foreground';

  if (!contrato) return null;

  const tipoLabel = TIPO_LABELS[contrato.tipo_contrato] || contrato.tipo_contrato;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start gap-2">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <SheetTitle className="text-base font-semibold leading-snug">{contrato.titulo_contrato}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{contrato.parte_b_nome_legal}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Badge variant="outline" className="text-xs">{tipoLabel}</Badge>
            <FaseBadge estado={contrato.estado_contrato} validationStatus={contrato.validation_status} />
          </div>
        </SheetHeader>

        <div className="space-y-5 py-5">
          {/* Object */}
          {contrato.objeto_resumido && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Resumo</p>
              <p className="text-sm">{contrato.objeto_resumido}</p>
            </div>
          )}

          {/* Next deadline */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Próximo prazo</p>
            <p className={cn('text-sm font-medium', deadlineColor)}>{deadlineLabel || 'Sem prazo identificado'}</p>
          </div>

          {/* CCA validation */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Validação CCA</p>
            <ValidationBadge status={(contrato.validation_status as ValidationStatusType) || 'none'} />
          </div>

          {/* RGPD */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              <Shield className="h-3.5 w-3.5 inline mr-1" />RGPD
            </p>
            <div className="space-y-2 rounded-md border p-3 bg-muted/20">
              <RgpdIndicator value={contrato.tratamento_dados_pessoais} label="Dados pessoais detectados" />
              <RgpdIndicator value={contrato.existe_dpa_anexo_rgpd} label="DPA detectado" />
              <RgpdIndicator value={contrato.transferencia_internacional} label="Transferência internacional" />
            </div>
          </div>

          {/* Document link */}
          {contrato.arquivo_storage_path && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Documento</p>
              <Button variant="outline" size="sm" className="gap-2 w-full" asChild>
                <a href={contrato.arquivo_storage_path} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {contrato.arquivo_nome_original || 'Abrir documento'}
                </a>
              </Button>
            </div>
          )}

          {/* Internal-only actions */}
          {isInternal && (
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acções internas</p>
              <Button variant="outline" size="sm" className="gap-2 w-full">
                <RefreshCw className="h-4 w-4" />
                Reprocessar CCA
              </Button>
              <Button variant="outline" size="sm" className="gap-2 w-full">
                <GitCompare className="h-4 w-4" />
                Ver diferenças Draft vs Canónico
              </Button>
            </div>
          )}

          {/* Open detail page */}
          <Button asChild className="w-full mt-2">
            <Link to={`/contratos/${contrato.id}`} onClick={onClose}>
              Abrir ficha completa
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

const QUICK_FILTERS: Array<{ key: QuickFilter; label: string }> = [
  { key: 'all',         label: 'Todos' },
  { key: 'active',      label: 'Activos' },
  { key: 'expiring30',  label: 'A expirar ≤30 dias' },
  { key: 'expiring60',  label: 'A expirar ≤60 dias' },
  { key: 'validating',  label: 'Em validação CCA' },
  { key: 'needs_review',label: 'Needs review' },
];

const SORT_OPTIONS: Array<{ key: SortField; label: string }> = [
  { key: 'next_deadline',      label: 'Próximo prazo' },
  { key: 'updated_at',         label: 'Última actualização' },
  { key: 'parte_b_nome_legal', label: 'Contraparte' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContractsTable({
  contratos,
  onArchive,
  onRestore,
  onDelete,
  showArchived = false,
  isLoading = false,
}: ContractsTableProps) {
  const { isLocal, role } = useLegalHubProfile();
  const isClient = isLocal; // local auth users = clients
  const isViewer = role === 'viewer';
  const isInternal = !isClient;
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sortField, setSortField] = useState<SortField>('next_deadline');
  const [drawerContract, setDrawerContract] = useState<Contrato | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const filtered = useMemo(() => {
    let list = contratos;

    // text search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.titulo_contrato.toLowerCase().includes(q) ||
          c.parte_b_nome_legal.toLowerCase().includes(q) ||
          c.id_interno.toLowerCase().includes(q)
      );
    }

    // quick filter
    if (quickFilter !== 'all') {
      list = list.filter((c) => {
        if (quickFilter === 'active') return c.estado_contrato === 'activo';
        if (quickFilter === 'expiring30') {
          const { days } = getNextDeadline(c);
          return days !== null && days >= 0 && days <= 30;
        }
        if (quickFilter === 'expiring60') {
          const { days } = getNextDeadline(c);
          return days !== null && days >= 0 && days <= 60;
        }
        if (quickFilter === 'validating') return c.validation_status === 'validating';
        if (quickFilter === 'needs_review') return c.validation_status === 'needs_review';
        return true;
      });
    }

    // sort
    list = [...list].sort((a, b) => {
      if (sortField === 'next_deadline') {
        const dA = getNextDeadline(a).date?.getTime() ?? Infinity;
        const dB = getNextDeadline(b).date?.getTime() ?? Infinity;
        return dA - dB;
      }
      if (sortField === 'updated_at') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      if (sortField === 'parte_b_nome_legal') {
        return a.parte_b_nome_legal.localeCompare(b.parte_b_nome_legal);
      }
      return 0;
    });

    return list;
  }, [contratos, debouncedSearch, quickFilter, sortField]);

  const confirmDelete = () => {
    if (contractToDelete && onDelete) onDelete(contractToDelete);
    setDeleteDialogOpen(false);
    setContractToDelete(null);
  };

  const colCount = isViewer ? 5 : 6;

  return (
    <div className="space-y-4">
      {/* ── Top Bar ── */}
      <div className="space-y-3">
        {/* Search + Sort */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Pesquisar título, contraparte, referência..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch('')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                Ordenar: {SORT_OPTIONS.find(o => o.key === sortField)?.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((o) => (
                <DropdownMenuItem key={o.key} onClick={() => setSortField(o.key)}>
                  {sortField === o.key && <span className="mr-2">✓</span>}
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={quickFilter === f.key ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-7 text-xs rounded-full px-3',
                quickFilter !== f.key && 'text-muted-foreground'
              )}
              onClick={() => setQuickFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} contrato{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[35%]">Contrato</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Validação CCA</TableHead>
              <TableHead>Próximo prazo</TableHead>
              {!isViewer && <TableHead className="text-right">Valor</TableHead>}
              <TableHead className="w-[48px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: colCount }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="h-24 text-center text-muted-foreground">
                  Nenhum contrato encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const tipoLabel = TIPO_LABELS[c.tipo_contrato] || c.tipo_contrato;
                const validationStatus = (c.validation_status as ValidationStatusType) || 'none';
                // Hide 'failed' badge from viewers
                const effectiveStatus: ValidationStatusType = isViewer && validationStatus === 'failed' ? 'none' : validationStatus;

                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setDrawerContract(c)}
                  >
                    {/* Col 1 – Contrato */}
                    <TableCell className="py-3">
                      <div className="space-y-0.5">
                        <div className="font-medium text-sm leading-snug line-clamp-1">
                          {c.titulo_contrato}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {c.parte_b_nome_legal}
                        </div>
                        {!isViewer && (
                          <div className="text-[10px] text-muted-foreground/70 font-mono">
                            {c.id_interno}
                          </div>
                        )}
                        <div className="pt-0.5">
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 rounded-sm">
                            {tipoLabel}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>

                    {/* Col 2 – Fase */}
                    <TableCell className="py-3">
                      <FaseBadge estado={c.estado_contrato} validationStatus={c.validation_status} />
                    </TableCell>

                    {/* Col 3 – Validação CCA */}
                    <TableCell className="py-3">
                      <ValidationBadge status={effectiveStatus} compact />
                    </TableCell>

                    {/* Col 4 – Próximo prazo */}
                    <TableCell className="py-3">
                      <DeadlineCell c={c} />
                    </TableCell>

                    {/* Col 5 – Valor (hidden for viewers) */}
                    {!isViewer && (
                      <TableCell className="py-3 text-right font-mono text-sm">
                        {formatCurrency(c.valor_total_estimado)}
                      </TableCell>
                    )}

                    {/* Col 6 – Actions */}
                    <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/contratos/${c.id}`)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Abrir ficha
                          </DropdownMenuItem>
                          {isInternal && (
                            <DropdownMenuItem>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Reprocessar CCA
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {showArchived ? (
                            <DropdownMenuItem onClick={() => onRestore?.(c.id)}>
                              <ArchiveRestore className="mr-2 h-4 w-4" />
                              Restaurar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => onArchive?.(c.id)}
                              className="text-amber-600"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Arquivar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Drawer ── */}
      <ContractDrawer
        contrato={drawerContract}
        open={drawerContract !== null}
        onClose={() => setDrawerContract(null)}
        isInternal={isInternal}
      />

      {/* ── Delete dialog ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O contrato será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
