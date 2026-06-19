import { useLegalHubProfile } from '@/hooks/useLegalHubProfile';

/**
 * Audiência da aplicação — define qual experiência o utilizador autenticado vê.
 *
 *   - `cca`    → utilizadores internos CCA (SSO): app_admin, cca_manager, cca_user → Cockpit
 *   - `client` → clientes (login local email+password): org_user, org_manager → Portal do Cliente
 *
 * A costura assenta no perfil já derivado em `useLegalHubProfile`, que por sua vez
 * distingue SSO (`auth_method === 'sso_cca'`) de login local. Não há nova lógica de auth.
 */
export type Audience = 'cca' | 'client';

export function useAudience(): { audience: Audience | null; isLoading: boolean } {
  const { legalHubProfile, isLoading } = useLegalHubProfile();

  if (isLoading || !legalHubProfile) {
    return { audience: null, isLoading: true };
  }

  const audience: Audience =
    legalHubProfile === 'org_user' || legalHubProfile === 'org_manager' ? 'client' : 'cca';

  return { audience, isLoading: false };
}
