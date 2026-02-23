import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useProfile } from './useProfile';

export function useEffectiveOrganization() {
  const { impersonatedOrgId, isImpersonating } = useImpersonation();
  const { profile } = useProfile();

  return {
    effectiveOrganizationId: isImpersonating 
      ? impersonatedOrgId 
      : profile?.current_organization_id ?? null,
    isImpersonating,
    realOrganizationId: profile?.current_organization_id ?? null,
  };
}
