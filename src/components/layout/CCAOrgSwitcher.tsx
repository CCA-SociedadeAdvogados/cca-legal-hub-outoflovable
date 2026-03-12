import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

export default function CCAOrgSwitcher({ className }: Props) {
  const {
    isLoading,
    isCCAInternalAuthorized,
    ccaClients,
    viewingOrganizationId,
    selectViewingClient,
  } = useOrganizations();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ccaClients;

    return ccaClients.filter((client) => {
      const haystack = [
        client.client_name,
        client.client_code,
        client.group_code ?? '',
        client.responsible ?? '',
        client.responsible_email ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [ccaClients, query]);

  const selected = useMemo(
    () => ccaClients.find((client) => client.organization_id === viewingOrganizationId) ?? null,
    [ccaClients, viewingOrganizationId],
  );

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
            {selected?.client_name ?? 'Seleccionar cliente'}
          </div>
          <div className="truncate text-xs text-gray-500">
            {selected
              ? `${selected.client_code} · ${selected.group_code ?? 'NAO'}`
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar cliente, código, grupo ou responsável"
                className="w-full min-w-0 border-0 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto overflow-x-hidden p-1">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500">A carregar...</div>
            ) : filteredClients.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">Sem resultados.</div>
            ) : (
              filteredClients.map((client) => {
                const active = client.organization_id === viewingOrganizationId;

                return (
                  <button
                    key={client.organization_id}
                    type="button"
                    onClick={() => {
                      selectViewingClient(client);
                      setOpen(false);
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
