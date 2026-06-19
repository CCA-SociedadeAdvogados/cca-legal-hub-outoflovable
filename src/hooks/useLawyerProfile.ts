import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LawyerProfile {
  id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url: string | null;
}

/**
 * Obtém o perfil do advogado associado a uma organização via lawyer_user_id.
 */
export function useLawyerProfile(organizationId: string | null) {
  return useQuery<LawyerProfile | null>({
    queryKey: ['lawyer-profile', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      // Buscar lawyer_user_id da organização
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('lawyer_user_id')
        .eq('id', organizationId)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!org?.lawyer_user_id) return null;

      // Buscar perfil real do advogado (profiles_safe não está nos types gerados)
      const { data: profile, error: profileError } = (await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('profiles_safe' as any)
        .select('id, nome_completo, email, avatar_url')
        .eq('id', org.lawyer_user_id)
        .maybeSingle()) as { data: LawyerProfile | null; error: { message: string } | null };

      if (profileError) throw profileError;
      return profile ?? null;
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });
}
