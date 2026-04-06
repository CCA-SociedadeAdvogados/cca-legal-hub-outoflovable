import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CCALawyer {
  id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url: string | null;
}

/**
 * Lista os advogados CCA disponíveis para associar a clientes.
 * Filtra apenas utilizadores SSO reais (exclui contas de serviço/admin).
 */
export function useCCALawyers() {
  return useQuery<CCALawyer[]>({
    queryKey: ['cca-lawyers-list'],
    queryFn: async () => {
      // Buscar a organização CCA (client_code = 'C.0000')
      const { data: ccaOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('client_code', 'C.0000')
        .maybeSingle();

      if (!ccaOrg) return [];

      // Buscar membros da organização CCA
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', ccaOrg.id);

      if (!members || members.length === 0) return [];

      const userIds = members.map((m) => m.user_id);

      // Buscar perfis filtrando apenas utilizadores SSO (exclui contas de serviço)
      const { data: profiles } = (await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('profiles_safe' as any)
        .select('id, nome_completo, email, avatar_url, auth_method')
        .in('id', userIds)
        .eq('auth_method', 'sso_cca')
        .order('nome_completo')) as { data: (CCALawyer & { auth_method: string })[] | null };

      return (profiles ?? [])
        .filter((p) => p.nome_completo)
        .map(({ auth_method: _, ...rest }) => rest);
    },
    staleTime: 5 * 60 * 1000,
  });
}
