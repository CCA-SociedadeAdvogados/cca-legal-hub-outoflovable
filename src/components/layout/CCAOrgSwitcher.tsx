import React, { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useOrganizations, searchCCAClients } from '@/hooks/useOrganizations';
import { useCliente } from '@/contexts/ClienteContext';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

export default function CCAOrgSwitcher({ className }: Props) {
  const { isCCAInternalAuthorized, selectViewingClient } = useOrganizations();
  const { cliente } = useCliente();

  const [inputValue, setInputValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [open, setOpen] = useState(false);

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

  if (!isCCAInternalAuthorized) return null;

  return (
    <div className={cn('relative w-full min-w-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left shadow-sm"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gray-900">
            {cliente?.nome ?? 'Seleccionar cliente'}
          </div>
          <div className="truncate text-xs text-gray-500">
            {cliente
              ? `${cliente.jvrisId}${cliente.groupCode ? ` · ${cliente.groupCode}` : ''}`
              : 'Sem cliente seleccionado'}
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-500" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full min-w-0 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-2">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Pesquisar cliente, código, grupo ou responsável"
                className="w-full min-w-0 border-0 bg-transparent text-sm outline-none"
              />
              {isFetching && (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gray-400" />
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto overflow-x-hidden p-1">
            {!debouncedSearch.trim() ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">
                Escreva para pesquisar clientes
              </div>
            ) : isFetching && resultados.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">
                A pesquisar...
              </div>
            ) : resultados.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">Sem resultados.</div>
            ) : (
              resultados.map((client) => {
                const active = client.organization_id === cliente?.organizationId;

                return (
                  <button
                    key={client.organization_id}
                    type="button"
                    onClick={() => {
                      selectViewingClient(client);
                      setOpen(false);
                      setInputValue('');
                    }}
                    className={cn(
                      'flex w-full min-w-0 items-start gap-2 rounded-md px-3 py-2 text-left hover:bg-gray-50',
                      active && 'bg-gray-50',
                    )}
                  >
                    <Check
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        active ? 'opacity-100 text-gray-900' : 'opacity-0',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {client.client_name}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {client.client_code}
                        {client.group_code ? ` · Grupo ${client.group_code}` : ''}
                        {client.responsible ? ` · Resp. ${client.responsible}` : ''}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
