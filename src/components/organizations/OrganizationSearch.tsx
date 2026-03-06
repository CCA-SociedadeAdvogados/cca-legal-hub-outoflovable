import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Building2 } from 'lucide-react';
import { useOrganizationSearch } from '@/hooks/useOrganizationSearch';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const OrganizationSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { search, setSearch, organizations, isLoading, error, hasSearched } = useOrganizationSearch();

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('organizations.searchPlaceholder')}
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

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-8 text-destructive">
          <p>{t('organizations.error')}</p>
        </div>
      )}

      {/* Empty state — no search yet */}
      {!hasSearched && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>{t('organizations.emptyState')}</p>
        </div>
      )}

      {/* No results */}
      {hasSearched && !isLoading && !error && organizations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>{t('organizations.noResults')}</p>
        </div>
      )}

      {/* Results table */}
      {organizations.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[15%]">{t('organizations.idJvris')}</TableHead>
              <TableHead className="w-[40%]">{t('organizations.name')}</TableHead>
              <TableHead className="w-[25%]">{t('organizations.group')}</TableHead>
              <TableHead className="w-[20%]">{t('organizations.responsible')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => (
              <TableRow
                key={org.client_code}
                className="hover:bg-muted/30 cursor-pointer"
                onClick={() => navigate(`/organizations/${encodeURIComponent(org.client_code ?? '')}`)}
              >
                <TableCell className="font-mono text-sm">{org.client_code}</TableCell>
                <TableCell className="py-3">{org.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{org.group ?? '—'}</TableCell>
                <TableCell className="text-sm">{org.responsible ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default OrganizationSearch;
