import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useCliente } from '@/contexts/ClienteContext';
import { useOrganizations, searchCCAClients } from '@/hooks/useOrganizations';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Building2, Hash, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ClienteSelectorJvris() {
  const { t } = useTranslation();
  const { cliente, setCliente, clearCliente } = useCliente();
  const { isCCAInternalAuthorized } = useOrganizations();

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce: dispara a query 300ms após o utilizador parar de escrever.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(inputValue), 300);
    return () => clearTimeout(id);
  }, [inputValue]);

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ['cca-client-search', debouncedSearch],
    queryFn: () => searchCCAClients(debouncedSearch),
    enabled: isCCAInternalAuthorized && !!debouncedSearch.trim(),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });

  const handleSelect = useCallback(
    (item: (typeof resultados)[number]) => {
      setCliente({
        organizationId: item.organization_id,
        nome: item.client_name,
        jvrisId: item.client_code,
        groupCode: item.group_code,
      });
      setOpen(false);
      setInputValue('');
    },
    [setCliente],
  );

  const handleClear = useCallback(() => {
    clearCliente();
    setInputValue('');
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
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
              />
              {isFetching ? (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
              ) : inputValue ? (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  onClick={() => setInputValue('')}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto overscroll-contain">
            {!debouncedSearch.trim() ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Escreva para pesquisar clientes
              </div>
            ) : isFetching && resultados.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                A pesquisar...
              </div>
            ) : resultados.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('financial.noMatchingClients')}
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
