import { useProfile } from './useProfile';
import { usePlatformAdmin } from './usePlatformAdmin';
import { useOrganizations } from './useOrganizations';
import { useAuth } from '@/contexts/AuthContext';

export type LegalHubProfile =
  | 'app_admin'    // SSO + platform_admin
  | 'cca_manager'  // SSO + role=admin (LegalHub_Manager)
  | 'cca_user'     // SSO + qualquer outro role
  | 'org_user'     // local + role=viewer
  | 'org_manager'; // local + role=owner/admin/editor

function deriveLegalHubProfile(
  authMethod: string | null | undefined,
  isPlatformAdmin: boolean,
  role: string | null | undefined
): LegalHubProfile {
  if (isPlatformAdmin) return 'app_admin';
  if (authMethod === 'sso_cca') {
    if (role === 'admin') return 'cca_manager';
    return 'cca_user';
  }
  // local auth
  if (role === 'viewer') return 'org_user';
  return 'org_manager'; // owner, admin, editor
}

export function useLegalHubProfile() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { isPlatformAdmin, isCheckingAdmin } = usePlatformAdmin();

  const authMethod = (profile as any)?.auth_method ?? null;
  // SSO users são identificados assim que o profile carrega.
  // Não disparar queries de org para eles — apenas precisamos saber que são CCA/SSO.
  const isSSOUser = !profileLoading && authMethod === 'sso_cca';

  // Org queries só para utilizadores locais, e apenas após o profile carregar
  // (evita disparar queries desnecessárias que depois se cancelam para SSO users)
  const { userMemberships, currentOrganization, membershipsLoading } = useOrganizations({
    enabled: !profileLoading && !isSSOUser,
  });

  const currentMembership = userMemberships?.find(
    (m) => m.organization_id === currentOrganization?.id
  );
  const role = currentMembership?.role ?? null;

  // SSO/CCA: spinner resolve logo que o profile carrega — admin check e memberships correm em background.
  // Local: aguardar admin check + memberships para derivar role correto.
  const isLoading = profileLoading || (!isSSOUser && (isCheckingAdmin || membershipsLoading));

  const legalHubProfile: LegalHubProfile | null = isLoading
    ? null
    : deriveLegalHubProfile(authMethod, isPlatformAdmin, role);

  return {
    legalHubProfile,
    isLoading,
    // Convenience booleans
    isAppAdmin: legalHubProfile === 'app_admin',
    isCCAManager: legalHubProfile === 'cca_manager',
    isCCAUser: legalHubProfile === 'cca_user' || legalHubProfile === 'cca_manager',
    isOrgManager: legalHubProfile === 'org_manager',
    isOrgUser: legalHubProfile === 'org_user',
    isSSO: authMethod === 'sso_cca',
    isLocal: authMethod !== 'sso_cca',
    role,
    authMethod,
  };
}
