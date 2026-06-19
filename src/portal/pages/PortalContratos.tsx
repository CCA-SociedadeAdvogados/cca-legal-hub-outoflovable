import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, FileText } from 'lucide-react';
import { Eyebrow } from '@/components/cca';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useContratos, type Contrato } from '@/hooks/useContratos';
import { ContratoStatusBadge } from '@/portal/components/ContratoStatusBadge';
import { ContratoDetailDrawer } from '@/portal/components/ContratoDetailDrawer';
import { formatCurrency, formatDate, getNextDeadline, tipoI18nKey } from '@/portal/lib/contrato';

type QuickFilter = 'all' | 'active' | 'expiring' | 'terminated';

const TERMINATED = new Set(['expirado', 'denunciado', 'rescindido']);

export default function PortalContratos() {
  const { t, i18n } = useTranslation();
  const { contratos, isLoading } = useContratos();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<QuickFilter>('all');
  const [selected, setSelected] = useState<Contrato | null>(null);

  const filters: Array<{ key: QuickFilter; label: string }> = [
    { key: 'all', label: t('portal.contracts.filters.all') },
    { key: 'active', label: t('portal.contracts.filters.active') },
    { key: 'expiring', label: t('portal.contracts.filters.expiring') },
    { key: 'terminated', label: t('portal.contracts.filters.terminated') },
  ];

  const filtered = useMemo(() => {
    let list = contratos ?? [];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.titulo_contrato.toLowerCase().includes(q) ||
          c.parte_b_nome_legal.toLowerCase().includes(q) ||
          c.id_interno.toLowerCase().includes(q),
      );
    }

    if (filter !== 'all') {
      list = list.filter((c) => {
        if (filter === 'active') return c.estado_contrato === 'activo';
        if (filter === 'terminated') return TERMINATED.has(c.estado_contrato);
        if (filter === 'expiring') {
          const { days } = getNextDeadline(c);
          return days !== null && days >= 0 && days <= 60;
        }
        return true;
      });
    }

    return [...list].sort((a, b) => {
      const dA = getNextDeadline(a).date?.getTime() ?? Infinity;
      const dB = getNextDeadline(b).date?.getTime() ?? Infinity;
      return dA - dB;
    });
  }, [contratos, search, filter]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <Eyebrow>{t('portal.pages.contracts.eyebrow')}</Eyebrow>
        <h1 className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
          {t('portal.pages.contracts.title')}
        </h1>
      </header>

      {/* Pesquisa */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('portal.contracts.searchPlaceholder')}
          aria-label={t('portal.contracts.searchPlaceholder')}
          className="h-9 w-full rounded-control border border-line bg-surface pl-9 pr-9 text-[12.5px] text-ink placeholder:text-ink-mute focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label={t('common.clear', 'Limpar')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'inline-flex h-7 items-center rounded-control border px-3 text-[11.5px] font-medium transition-colors',
              filter === f.key
                ? 'border-brand bg-brand/[0.08] text-brand'
                : 'border-line bg-surface text-ink-mute hover:border-ink hover:bg-bg-alt hover:text-ink',
            )}
          >
            {f.label}
          </button>
        ))}
        {!isLoading && (
          <span className="ml-auto font-mono text-[11px] text-ink-mute">
            {t('portal.contracts.count', { count: filtered.length })}
          </span>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-lg border border-line">
        <Table>
          <TableHeader>
            <TableRow className="bg-bg-alt/40">
              <TableHead className="w-[45%]">{t('portal.contracts.columns.contract')}</TableHead>
              <TableHead>{t('portal.contracts.columns.status')}</TableHead>
              <TableHead>{t('portal.contracts.columns.nextDeadline')}</TableHead>
              <TableHead className="text-right">{t('portal.contracts.columns.value')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-ink-mute">
                    <FileText className="h-6 w-6" strokeWidth={1.5} />
                    <span className="text-[13px]">{t('portal.contracts.empty')}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const tipoKey = tipoI18nKey(c.tipo_contrato);
                const tipoLabel = tipoKey ? t(tipoKey) : c.tipo_contrato;
                const { kind, date, days } = getNextDeadline(c);
                const deadlineTone =
                  days !== null && days <= 30
                    ? 'text-danger font-medium'
                    : days !== null && days <= 60
                      ? 'text-warn'
                      : 'text-ink-soft';
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer transition-colors hover:bg-bg-alt/40"
                    onClick={() => setSelected(c)}
                  >
                    <TableCell className="py-3">
                      <div className="space-y-0.5">
                        <div className="line-clamp-1 text-sm font-medium leading-snug text-ink">
                          {c.titulo_contrato}
                        </div>
                        <div className="line-clamp-1 text-xs text-ink-mute">
                          {c.parte_b_nome_legal} · {tipoLabel}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <ContratoStatusBadge estado={c.estado_contrato} />
                    </TableCell>
                    <TableCell className="py-3">
                      {kind && date ? (
                        <span className={cn('text-xs', deadlineTone)}>
                          {formatDate(date.toISOString(), i18n.language)}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-mute">
                          {t('portal.contracts.noDeadline')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono text-sm text-ink">
                      {formatCurrency(c.valor_total_estimado, i18n.language, c.moeda)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ContratoDetailDrawer
        contrato={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
