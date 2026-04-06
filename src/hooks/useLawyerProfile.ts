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
 * Fallback para lawyer_name / lawyer_photo_url se lawyer_user_id não estiver preenchido.
 */
export function useLawyerProfile(organizationId: string | null) {
  return useQuery<LawyerProfile | null>({
    queryKey: ['lawyer-profile', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      // Buscar lawyer_user_id (e campos legacy) da organização
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('lawyer_user_id, lawyer_name, lawyer_photo_url')
        .eq('id', organizationId)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!org) return null;

      const lawyerUserId = (org as Record<string, unknown>).lawyer_user_id as string | null;

      // Se tem lawyer_user_id, buscar perfil real (profiles_safe não está nos types gerados)
      if (lawyerUserId) {
        const { data: profile, error: profileError } = (await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from('profiles_safe' as any)
          .select('id, nome_completo, email, avatar_url')
          .eq('id', lawyerUserId)
          .maybeSingle()) as { data: LawyerProfile | null; error: { message: string } | null };

        if (profileError) throw profileError;
        if (profile) return profile as LawyerProfile;
      }

      // Fallback: campos de texto legacy
      const lawyerName = (org as Record<string, unknown>).lawyer_name as string | null;
      const lawyerPhotoUrl = (org as Record<string, unknown>).lawyer_photo_url as string | null;

      if (lawyerName) {
        return {
          id: '',
          nome_completo: lawyerName,
          email: null,
          avatar_url: lawyerPhotoUrl,
        } as LawyerProfile;
      }

      return null;
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });
}
