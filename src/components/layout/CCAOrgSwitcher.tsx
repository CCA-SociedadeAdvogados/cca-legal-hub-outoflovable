import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useOrganizations } from '@/hooks/useOrganizations';
import { useCCAAccess } from '@/hooks/useCCAAccess';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, Check, ChevronDown, Search, X } from 'lucide-react';

/**
 * Componente de seleção de organização para utilizadores CCA.
 * Permite que utilizadores CCA (SSO) mudem para qualquer organização
 * cliente, dando-lhes acesso irrestrito a dados financeiros,
 * SharePoint e outras funcionalidades.
 *
 * Também aparece para utilizadores com departamentos atribuídos
 * em múltiplas organizações.
 */
export function CCAOrgSwitcher() {
  const { t } = useTranslation();
  const { currentOrganization, switchOrganization } = useOrganizations();
  const { hasUnrestrictedAccess, accessibleOrganizations, isLoading } = useCCAAccess();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filteredOrgs = useMemo(() => {
    if (!search.trim()) return accessibleOrganizations;
    const term = search.toLowerCase();
    return accessibleOrganizations.filter(
      (org) =>
        org.name.toLowerCase().includes(term) ||
        org.slug.toLowerCase().includes(term)
    );
  }, [accessibleOrganizations, search]);

  const handleSwitch = async (orgId: string) => {
  if (orgId === currentOrganization?.id) {
    setOpen(false);
    setSearch('');
    return;
  }

  try {
    setOpen(false);
    setSearch('');
    await switchOrganization.mutateAsync(orgId);
  } catch (error) {
    console.error('Erro ao mudar organização:', error);
  }
};

  // Não mostrar se não tem acesso a múltiplas orgs ou está a carregar
  if (isLoading) return null;
  if (!hasUnrestrictedAccess && accessibleOrganizations.length <= 1) return null;

  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 max-w-[220px]"
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate text-xs">
            {currentOrganization?.name || t('cca.selectOrg')}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 bg-popover">
        <DropdownMenuLabel className="text-xs">
          {hasUnrestrictedAccess
            ? t('cca.allOrganizations')
            : t('cca.myOrganizations')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Barra de pesquisa */}
        {accessibleOrganizations.length > 5 && (
          <div className="px-2 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t('cca.searchOrg')}
                className="h-8 pl-8 pr-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
              {search && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  onClick={(e) => { e.stopPropagation(); setSearch(''); }}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[280px]">
          {filteredOrgs.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              {t('cca.noOrgsFound')}
            </div>
          ) : (
            filteredOrgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  org.id === currentOrganization?.id && "bg-muted/50"
                )}
              >
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt=""
                    className="h-5 w-5 rounded object-cover shrink-0"
                  />
                ) : (
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 truncate text-sm">{org.name}</span>
                {org.id === currentOrganization?.id && (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
