import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveOrganization } from '@/hooks/useEffectiveOrganization';

interface IndustrySectorContextType {
  activeOrganizationSectors: string[];
  hasSector: (sector: string) => boolean;
  getPrimarySector: () => string | null;
  isLoading: boolean;
}

const IndustrySectorContext = createContext<IndustrySectorContextType | undefined>(undefined);

export function IndustrySectorProvider({ children }: { children: React.ReactNode }) {
  const { effectiveOrganizationId } = useEffectiveOrganization();

  const { data: organizationSectors, isLoading } = useQuery({
    queryKey: ['organization-sectors', effectiveOrganizationId],
    queryFn: async () => {
      if (!effectiveOrganizationId) return [];

      const { data, error } = await supabase
        .from('organizations')
        .select('industry_sectors')
        .eq('id', effectiveOrganizationId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching organization sectors:', error);
        return [];
      }

      return (data?.industry_sectors as string[]) || [];
    },
    enabled: !!effectiveOrganizationId,
  });

  const value = useMemo<IndustrySectorContextType>(() => ({
    activeOrganizationSectors: organizationSectors || [],
    hasSector: (sector: string) => organizationSectors?.includes(sector) ?? false,
    getPrimarySector: () => organizationSectors?.[0] ?? null,
    isLoading,
  }), [organizationSectors, isLoading]);

  return (
    <IndustrySectorContext.Provider value={value}>
      {children}
    </IndustrySectorContext.Provider>
  );
}

export function useIndustrySector() {
  const context = useContext(IndustrySectorContext);
  if (context === undefined) {
    throw new Error('useIndustrySector must be used within an IndustrySectorProvider');
  }
  return context;
}
