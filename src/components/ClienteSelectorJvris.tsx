import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useCliente } from '@/contexts/ClienteContext';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, X, Building2, Hash, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrganizationWithJvris {
  id: string;
  client_code: string | null;
  name: string;
  jvris_id: string | null;
  logo_url?: string | null;
}

interface JvrisSearchResult {
  id: string;
  client_code: string | null;
  name: string;
  jvris_id: string;
  isLinked: boolean;
}

/**
 * Pesquisa por ID Jvris.
 *
 * Mostra primeiro organizações já ligadas a um jvris_id.
 * Se não existirem resultados suficientes, complementa com IDs presentes
 * em financeiro_nav_cache, mesmo que ainda não estejam ligados a uma organização.
 */
export function ClienteSelectorJvris() {
  const { t } = useTranslation();
  const { cliente, setCliente, clearCliente } = useCliente();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const { data: resultados = [], isLoading } = useQuery({
    queryKey: ['cliente-selector-jvris', debouncedSearch],
    queryFn: async (): Promise<JvrisSearchResult[]> => {
      const cleanSearch = debouncedSearch.trim();
      const normalizedSearch = cleanSearch.toLowerCase();

      let orgQuery = supabase
        .from('organizations')
        .select('id, client_code, name, jvris_id')
        .not('jvris_id', 'is', null)
        .order('name');

      if (cleanSearch) {
        const term = `%${cleanSearch}%`;
        orgQuery = orgQuery.or(`jvris_id.ilike.${term},name.ilike.${term}`);
      }

      const { data: orgData, error: orgError } = await orgQuery.limit(20);
      if (orgError) throw orgError;

      const linkedResults: JvrisSearchResult[] = ((orgData || []) as OrganizationWithJvris[])
        .filter((org) => !!org.jvris_id)
        .map((org) => ({
          id: org.id,
          client_code: org.client_code,
          name: org.name,
          jvris_id: org.jvris_id!.trim(),
          isLinked: true,
        }));

      const linkedIds = new Set(linkedResults.map((item) => item.jvris_id));

      let cacheQuery = supabase
        .from('financeiro_nav_cache')
        .select('jvris_id')
        .not('jvris_id', 'is', null);

      if (cleanSearch) {
        cacheQuery = cacheQuery.ilike('jvris_id', `%${cleanSearch}%`);
      }

      const { data: cacheData, error: cacheError } = await cacheQuery.limit(50);
      if (cacheError) throw cacheError;

      const unlinkedResults: JvrisSearchResult[] = Array.from(
        new Set(
          (cacheData || [])
            .map((row: { jvris_id: string | null }) => row.jvris_id?.trim())
            .filter((value): value is string => Boolean(value) && !linkedIds.has(value))
        )
      )
        .filter((jvrisId) => {
          if (!normalizedSearch) return true;
          return jvrisId.toLowerCase().includes(normalizedSearch);
        })
        .sort()
        .slice(0, 20)
        .map((jvrisId) => ({
          id: `nav-${jvrisId}`,
          client_code: null,
          name: 'ID disponível na Base NAV',
          jvris_id: jvrisId,
          isLinked: false,
        }));

      return [...linkedResults, ...unlinkedResults];
    },
    enabled: open,
    staleTime: 30 * 1000,
  });

  const handleSelect = useCallback((item: JvrisSearchResult) => {
    if (!item.jvris_id) return;

    if (!item.isLinked) {
      return;
    }

    setCliente({
      organizationId: item.id,
      nome: item.name,
      jvrisId: item.jvris_id,
    });

    setOpen(false);
    setSearch('');
  }, [setCliente]);

  const handleClear = useCallback(() => {
    clearCliente();
    setSearch('');
  }, [clearCliente]);

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
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {t('financial.searchByJvrisId')}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-3 border-b">
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

          <ScrollArea className="max-h-[260px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : resultados.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {debouncedSearch
                  ? t('financial.noMatchingClients')
                  : t('financial.noClientsWithJvrisId')}
              </div>
            ) : (
              resultados.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  disabled={!item.isLinked}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b last:border-b-0",
                    item.isLinked ? "hover:bg-muted/50" : "opacity-70 cursor-not-allowed bg-muted/20",
                    cliente?.organizationId === item.id && "bg-primary/5"
                  )}
                >
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {t('financial.jvrisId')}: {item.jvris_id}
                    </p>
                    {!item.isLinked && (
                      <p className="text-[11px] text-muted-foreground">
                        ID encontrado na Base NAV, mas ainda não ligado a uma organização.
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
