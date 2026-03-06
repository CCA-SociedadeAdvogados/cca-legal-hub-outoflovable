import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLegalHubProfile } from './useLegalHubProfile';
import type { Organization } from './useOrganizations';

/**
 * Hook que determina se o utilizador CCA tem acesso irrestrito
 * a todas as organizações e respetivos dados.
 *
 * Utilizadores CCA (auth_method='sso_cca') podem visualizar dados
 * financeiros, SharePoint e todas as funcionalidades de qualquer
 * organização cliente através do seu jvris_id.
 *
 * Utilizadores com departamento atribuído numa organização
 * também têm acesso aos dados dessa organização.
 */
export function useCCAAccess() {
  const { user } = useAuth();
  const { isCCAUser, isAppAdmin, isLoading: profileLoading } = useLegalHubProfile();

  const hasUnrestrictedAccess = isCCAUser || isAppAdmin;

  // Buscar todas as organizações para utilizadores CCA
  const { data: allOrganizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['cca-all-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Organization[];
    },
    enabled: !!user && hasUnrestrictedAccess,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Buscar organizações onde o utilizador tem departamentos atribuídos
  const { data: departmentOrganizations = [], isLoading: deptOrgsLoading } = useQuery({
    queryKey: ['user-department-organizations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Buscar orgs onde o user tem departamentos
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: userDepts, error: deptError } = await (supabase as any)
        .from('user_departments')
        .select('organization_id')
        .eq('user_id', user.id);

      if (deptError) throw deptError;
      if (!userDepts || userDepts.length === 0) return [];

      const orgIds = [...new Set(
        (userDepts as Array<{ organization_id: string }>).map((ud) => ud.organization_id)
      )];

      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .in('client_code', orgIds)
        .order('name');

      if (orgError) throw orgError;
      return orgs as Organization[];
    },
    enabled: !!user && !hasUnrestrictedAccess,
    staleTime: 5 * 60 * 1000,
  });

  return {
    /** Se o utilizador tem acesso irrestrito a todas as orgs (CCA ou admin) */
    hasUnrestrictedAccess,
    /** Todas as organizações (disponível apenas para CCA/admin) */
    allOrganizations,
    /** Organizações onde o utilizador tem departamentos atribuídos */
    departmentOrganizations,
    /** Lista combinada de organizações acessíveis */
    accessibleOrganizations: hasUnrestrictedAccess
      ? allOrganizations
      : departmentOrganizations,
    isLoading: profileLoading || orgsLoading || deptOrgsLoading,
  };
}
