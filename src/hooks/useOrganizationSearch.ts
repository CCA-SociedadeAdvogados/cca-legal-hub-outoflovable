import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useOrganizationSearch = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: organizations, isLoading, error } = useQuery({
    queryKey: ['organization-search', debouncedSearch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('client_code, name, group, responsible, responsible_email')
        .or(`client_code.ilike.%${debouncedSearch}%,name.ilike.%${debouncedSearch}%`)
        .order('client_code')
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!debouncedSearch && debouncedSearch.length >= 2,
  });

  return {
    search,
    setSearch,
    organizations: organizations ?? [],
    isLoading,
    error,
    hasSearched: debouncedSearch.length >= 2,
  };
};
