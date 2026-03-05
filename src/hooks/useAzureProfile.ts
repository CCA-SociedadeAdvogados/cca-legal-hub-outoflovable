import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

/**
 * Hook para obter dados do perfil Azure AD do utilizador autenticado via SSO.
 *
 * - Nome e email vêm de user.user_metadata (populados pelo SSO edge function)
 * - Foto: tenta obter via edge function fetch-azure-photo (client credentials + Graph API)
 * - Se falhar, usa avatar com iniciais
 *
 * Dados são cacheados e a foto é guardada no profile.avatar_url após primeira obtenção.
 */
export function useAzureProfile() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const isSSO = profile?.auth_method === 'sso_cca';
  const ssoExternalId = (profile as Record<string, unknown>)?.sso_external_id as string | null;

  // Dados básicos do utilizador (disponíveis imediatamente)
  const nomeCompleto = profile?.nome_completo || user?.user_metadata?.nome_completo || user?.email || '';
  const email = profile?.email || user?.email || '';
  const avatarUrl = profile?.avatar_url || null;

  // Gerar iniciais para fallback
  const iniciais = nomeCompleto
    .split(' ')
    .filter((p: string) => p.length > 0)
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  // Obter foto do Azure AD via edge function (apenas se SSO e sem avatar)
  const { data: azurePhotoUrl, isLoading: isLoadingPhoto } = useQuery({
    queryKey: ['azure-profile-photo', user?.id],
    queryFn: async (): Promise<string | null> => {
      if (!ssoExternalId) return null;

      try {
        const { data, error } = await supabase.functions.invoke('fetch-azure-photo', {
          body: { sso_external_id: ssoExternalId },
        });

        if (error) {
          console.warn('[useAzureProfile] Erro ao obter foto Azure:', error.message);
          return null;
        }

        if (data?.photo_url) {
          // Guardar no perfil para cache persistente
          await supabase
            .from('profiles')
            .update({ avatar_url: data.photo_url })
            .eq('id', user!.id);

          queryClient.invalidateQueries({ queryKey: ['profile', user!.id] });
          return data.photo_url as string;
        }

        return null;
      } catch (err) {
        console.warn('[useAzureProfile] Falha ao obter foto:', err);
        return null;
      }
    },
    enabled: !!user && isSSO && !!ssoExternalId && !avatarUrl,
    staleTime: 24 * 60 * 60 * 1000, // 24h — foto raramente muda
    retry: 1,
  });

  // Mutation para forçar refresh da foto
  const refreshPhoto = useMutation({
    mutationFn: async () => {
      if (!ssoExternalId) throw new Error('Utilizador não autenticado via SSO');

      const { data, error } = await supabase.functions.invoke('fetch-azure-photo', {
        body: { sso_external_id: ssoExternalId, force: true },
      });

      if (error) throw error;
      if (!data?.photo_url) throw new Error('Foto não disponível');

      await supabase
        .from('profiles')
        .update({ avatar_url: data.photo_url })
        .eq('id', user!.id);

      return data.photo_url as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['azure-profile-photo', user?.id] });
    },
  });

  return {
    /** Nome completo do utilizador */
    nomeCompleto,
    /** Email do utilizador */
    email,
    /** URL do avatar (Azure photo > profile avatar_url > null) */
    photoUrl: avatarUrl || azurePhotoUrl || null,
    /** Iniciais para fallback do avatar */
    iniciais,
    /** Se o utilizador autenticou via SSO CCA */
    isSSO,
    /** Se está a carregar a foto */
    isLoadingPhoto,
    /** Forçar refresh da foto do Azure */
    refreshPhoto,
  };
}
