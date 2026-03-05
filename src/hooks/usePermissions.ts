import { useMemo } from 'react';
import { useLegalHubProfile } from './useLegalHubProfile';
import type { LegalHubProfile } from './useLegalHubProfile';

/**
 * Matriz de permissões centralizada.
 * Cada ação mapeia para os perfis que a podem executar.
 *
 * Hierarquia:
 *   app_admin > cca_manager / org_manager > cca_user / org_user
 */

type PermissionAction =
  // Organizações
  | 'org:create'
  | 'org:edit'
  | 'org:edit_own'
  | 'org:delete'
  | 'org:view_own'
  // Utilizadores
  | 'users:create'
  | 'users:edit_all'
  | 'users:edit_own_org'
  | 'users:delete'
  | 'users:view_all'
  | 'users:view_own_org'
  | 'users:view_own_dept'
  // Dashboards
  | 'dashboards:configure'
  // Documentos
  | 'docs:view_all_orgs'
  // Conteúdo
  | 'content:all_orgs'
  | 'content:all_depts_own_org'
  | 'content:own_dept'
  // Impersonação
  | 'impersonate'
  // Contratos
  | 'contracts:create'
  | 'contracts:edit'
  | 'contracts:bulk_upload'
  | 'contracts:triage';

const PERMISSION_MATRIX: Record<PermissionAction, readonly LegalHubProfile[]> = {
  // Organizações
  'org:create':       ['app_admin'],
  'org:edit':         ['app_admin'],
  'org:edit_own':     ['app_admin', 'org_manager'],
  'org:delete':       ['app_admin'],
  'org:view_own':     ['app_admin', 'org_manager', 'org_user'],

  // Utilizadores
  'users:create':       ['app_admin'],
  'users:edit_all':     ['app_admin'],
  'users:edit_own_org': ['app_admin', 'org_manager'],
  'users:delete':       ['app_admin'],
  'users:view_all':     ['app_admin'],
  'users:view_own_org': ['app_admin', 'org_manager'],
  'users:view_own_dept': ['app_admin', 'org_manager', 'org_user'],

  // Dashboards
  'dashboards:configure': ['app_admin'],

  // Documentos — ver docs de todas as orgs
  'docs:view_all_orgs': ['app_admin', 'cca_user', 'cca_manager'],

  // Conteúdo
  'content:all_orgs':          ['app_admin'],
  'content:all_depts_own_org': ['app_admin', 'org_manager'],
  'content:own_dept':          ['app_admin', 'cca_manager', 'cca_user', 'org_manager', 'org_user'],

  // Impersonação
  'impersonate': ['app_admin'],

  // Contratos — ações de escrita
  'contracts:create':      ['app_admin', 'cca_manager', 'cca_user', 'org_manager'],
  'contracts:edit':        ['app_admin', 'cca_manager', 'cca_user', 'org_manager'],
  'contracts:bulk_upload': ['app_admin', 'cca_manager', 'org_manager'],
  'contracts:triage':      ['app_admin', 'cca_manager', 'cca_user', 'org_manager'],
};

export function usePermissions() {
  const {
    legalHubProfile,
    isLoading,
    isAppAdmin,
    isCCAManager,
    isCCAUser,
    isOrgManager,
    isOrgUser,
    isSSO,
    isLocal,
    role,
    authMethod,
  } = useLegalHubProfile();

  const can = useMemo(() => {
    if (!legalHubProfile) {
      // Still loading — deny everything
      return (_action: PermissionAction) => false;
    }
    return (action: PermissionAction) => {
      const allowed = PERMISSION_MATRIX[action];
      return allowed?.includes(legalHubProfile) ?? false;
    };
  }, [legalHubProfile]);

  return {
    can,
    legalHubProfile,
    isLoading,
    // Re-export convenience booleans
    isAppAdmin,
    isCCAManager,
    isCCAUser,
    isOrgManager,
    isOrgUser,
    isSSO,
    isLocal,
    role,
    authMethod,
  };
}
