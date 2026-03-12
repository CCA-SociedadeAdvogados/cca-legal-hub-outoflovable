import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';

import { useOrganizations } from '@/hooks/useOrganizations';
import { useCCAAccess } from '@/hooks/useCCAAccess';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export function CCAOrgSwitcher() {
  const { t } = useTranslation();
  const { currentOrganization, switchOrganization } = useOrganizations();
  const { hasUnrestrictedAccess, accessibleOrganizations, isLoading } = useCCAAccess();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

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
      await switchOrganization.mutateAsync(orgId);
      setOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Erro ao mudar organização:', error);
    }
  };

  if (isLoading) return null;
  if (!hasUnrestrictedAccess && accessibleOrganizations.length <= 1) return null;

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) setSearch('');
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="max-w-[220px] shrink-0 justify-between gap-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate text-xs">
              {currentOrganization?.name || t('cca.selectOrg')}
            </span>
          </div>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[320px] max-w-[calc(100vw-2rem)] p-0"
      >
        <Command shouldFilter={false}>
          {accessibleOrganizations.length > 5 && (
            <CommandInput
              placeholder={
                hasUnrestrictedAccess
                  ? t('cca.searchOrg')
                  : t('cca.searchOrg')
              }
              value={search}
              onValueChange={setSearch}
            />
          )}

          <CommandList className="max-h-[280px]">
            <CommandEmpty>{t('cca.noOrgsFound')}</CommandEmpty>

            <CommandGroup
              heading={
                hasUnrestrictedAccess
                  ? t('cca.allOrganizations')
                  : t('cca.myOrganizations')
              }
            >
              {filteredOrgs.map((org) => (
                <CommandItem
                  key={org.id}
                  value={`${org.name} ${org.slug}`}
                  onSelect={() => handleSwitch(org.id)}
                  className="flex cursor-pointer items-center gap-2"
                >
                  {org.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt=""
                      className="h-5 w-5 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}

                  <span className="flex-1 truncate text-sm">{org.name}</span>

                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0 text-primary',
                      org.id === currentOrganization?.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
