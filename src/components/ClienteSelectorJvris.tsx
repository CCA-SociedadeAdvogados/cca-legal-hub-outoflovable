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
  id?: string;
  client_code: string | null;
  name: string;
  jvris_id: string | null;
  logo_url?: string | null;
}

/**
 * Componente de pesquisa de cliente por ID Jvris.
 *
 * Permite aos utilizadores CCA pesquisar organizações pelo seu ID Jvris
 * (número de cliente no sistema Jvris da CCA). Ao selecionar um cliente,
 * o contexto ClienteContext é atualizado e os dados financeiros e
 * documentos SharePoint são carregados para esse cliente.
 *
 * Pesquisa com debounce de 300ms.
 */
export function ClienteSelectorJvris() {
  const { t } = useTranslation();
  const { cliente, setCliente, clearCliente } = useCliente();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce da pesquisa (300ms)
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Query para pesquisar organizações com jvris_id
  const { data: resultados = [], isLoading } = useQuery({
    queryKey: ['cliente-selector-jvris', debouncedSearch],
    queryFn: async (): Promise<OrganizationWithJvris[]> => {
      // Buscar organizações que têm jvris_id
      let query = supabase
        .from('organizations')
        .select('client_code, name, jvris_id')
        .not('jvris_id', 'is', null)
        .order('name');

      if (debouncedSearch.trim()) {
        // Pesquisar por jvris_id ou nome
        const term = `%${debouncedSearch.trim()}%`;
        query = query.or(`jvris_id.ilike.${term},name.ilike.${term}`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;

      return (data || []) as OrganizationWithJvris[];
    },
    enabled: open,
    staleTime: 30 * 1000,
  });

  const handleSelect = useCallback((org: OrganizationWithJvris) => {
    if (!org.jvris_id) return;
    setCliente({
      organizationId: org.client_code || org.id || '',
      nome: org.name,
      jvrisId: org.jvris_id,
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
      {/* Mostrar cliente selecionado */}
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

      {/* Botão de pesquisa */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {t('financial.searchByJvrisId')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          {/* Barra de pesquisa */}
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

          {/* Lista de resultados */}
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
              resultados.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleSelect(org)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0",
                    cliente?.organizationId === org.id && "bg-primary/5"
                  )}
                >
                  {org.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt=""
                      className="h-8 w-8 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {t('financial.jvrisId')}: {org.jvris_id}
                    </p>
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
