import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveOrganization } from './useEffectiveOrganization';

/**
 * Hook to get industry sectors for the effective organization
 * (respects impersonation context)
 */
export function useEffectiveIndustrySectors() {
  const { effectiveOrganizationId, isImpersonating, realOrganizationId } = useEffectiveOrganization();

  const { data: sectors, isLoading } = useQuery({
    queryKey: ['effective-industry-sectors', effectiveOrganizationId],
    queryFn: async () => {
      if (!effectiveOrganizationId) return [];

      const { data, error } = await supabase
        .from('organizations')
        .select('industry_sectors')
        .eq('id', effectiveOrganizationId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching industry sectors:', error);
        return [];
      }

      return (data?.industry_sectors as string[]) || [];
    },
    enabled: !!effectiveOrganizationId,
  });

  return {
    sectors: sectors || [],
    isLoading,
    isImpersonating,
    effectiveOrganizationId,
    realOrganizationId,
    hasSector: (sector: string) => sectors?.includes(sector) ?? false,
    primarySector: sectors?.[0] ?? null,
  };
}
