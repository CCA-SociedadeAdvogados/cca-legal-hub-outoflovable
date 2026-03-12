import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCliente } from '@/contexts/ClienteContext';
import { useOrganizations } from '@/hooks/useOrganizations';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Search, X, Building2, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ClienteSelectorJvris() {
  const { t } = useTranslation();
  const { cliente, setCliente, clearCliente } = useCliente();
  const { ccaClients, isCCAInternalAuthorized } = useOrganizations();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const resultados = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    if (!cleanSearch) return ccaClients;

    return ccaClients.filter((item) => {
      const haystack = [
        item.client_code,
        item.client_name,
        item.group_code ?? '',
        item.responsible ?? '',
        item.responsible_email ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(cleanSearch);
    });
  }, [ccaClients, search]);

  const handleSelect = useCallback(
    (item: (typeof ccaClients)[number]) => {
      setCliente({
        organizationId: item.organization_id,
        nome: item.client_name,
        jvrisId: item.client_code,
      });

      setOpen(false);
      setSearch('');
    },
    [setCliente, ccaClients],
  );

  const handleClear = useCallback(() => {
    clearCliente();
    setSearch('');
  }, [clearCliente]);

  if (!isCCAInternalAuthorized) return null;

  return (
    <div className="flex items-center gap-2">
      {cliente && (
        <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5">
          <Hash className="h-3 w-3" />
          <span className="font-mono text-xs">{cliente.jvrisId}</span>
          <span className="text-xs text-muted-foreground">— {cliente.nome}</span>
          <button
            onClick={handleClear}
            className="ml-1 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex shrink-0 items-center gap-2"
          >
            <Search className="h-4 w-4" />
            {t('financial.searchByJvrisId')}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[380px] max-w-[calc(100vw-2rem)] p-0"
          align="end"
          sideOffset={8}
        >
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t('financial.searchClientId')}
                className="h-8 pl-8 pr-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              {search && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto overscroll-contain">
            {resultados.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {search.trim()
                  ? t('financial.noMatchingClients')
                  : t('financial.noClientsWithJvrisId')}
              </div>
            ) : (
              resultados.map((item) => (
                <button
                  key={item.organization_id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b last:border-b-0 hover:bg-muted/50',
                    cliente?.organizationId === item.organization_id && 'bg-primary/5',
                  )}
                >
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{item.client_name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {t('financial.jvrisId')}: {item.client_code}
                    </p>
                    {item.group_code && (
                      <p className="text-[11px] text-muted-foreground">
                        grupo: {item.group_code}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
