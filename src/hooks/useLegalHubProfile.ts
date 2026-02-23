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
  const { userMemberships, currentOrganization, membershipsLoading } = useOrganizations();

  const currentMembership = userMemberships?.find(
    (m) => m.organization_id === currentOrganization?.id
  );
  const role = currentMembership?.role ?? null;
  const authMethod = (profile as any)?.auth_method ?? null;

  const isLoading = profileLoading || isCheckingAdmin || membershipsLoading;

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
