import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ImpersonationState {
  isImpersonating: boolean;
  // Org impersonation
  impersonatedOrgId: string | null;
  impersonatedOrgName: string | null;
  // User impersonation
  impersonatedUserId: string | null;
  impersonatedUserName: string | null;
  impersonationType: 'org' | 'user' | null;
  reason: string | null;
  sessionId: string | null;
}

interface ImpersonationContextType extends ImpersonationState {
  startImpersonation: (orgId: string, orgName: string, reason: string) => Promise<boolean>;
  startUserImpersonation: (userId: string, userName: string, reason: string) => Promise<boolean>;
  stopImpersonation: () => Promise<void>;
  getEffectiveOrganizationId: () => string | null;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const STORAGE_KEY = 'impersonation_session';

interface StoredSession {
  impersonatedOrgId: string | null;
  impersonatedOrgName: string | null;
  impersonatedUserId: string | null;
  impersonatedUserName: string | null;
  impersonationType: 'org' | 'user';
  reason: string;
  sessionId: string;
}

const INITIAL_STATE: ImpersonationState = {
  isImpersonating: false,
  impersonatedOrgId: null,
  impersonatedOrgName: null,
  impersonatedUserId: null,
  impersonatedUserName: null,
  impersonationType: null,
  reason: null,
  sessionId: null,
};

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [state, setState] = useState<ImpersonationState>(INITIAL_STATE);

  const invalidateCaches = useCallback(() => {
    queryClient.cancelQueries({ queryKey: ['contentBlocks'] });
    queryClient.removeQueries({ queryKey: ['contentBlocks'] });
    queryClient.invalidateQueries({ queryKey: ['contentBlocks'] });
    queryClient.invalidateQueries({ queryKey: ['effective-industry-sectors'] });
    queryClient.invalidateQueries({ queryKey: ['organization-sectors'] });
    queryClient.invalidateQueries({ queryKey: ['homeConfig'] });
  }, [queryClient]);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    if (!user) {
      setState(INITIAL_STATE);
      return;
    }

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const session: StoredSession = JSON.parse(stored);
        verifySession(session.sessionId).then((isValid) => {
          if (isValid) {
            setState({
              isImpersonating: true,
              impersonatedOrgId: session.impersonatedOrgId,
              impersonatedOrgName: session.impersonatedOrgName,
              impersonatedUserId: session.impersonatedUserId,
              impersonatedUserName: session.impersonatedUserName,
              impersonationType: session.impersonationType,
              reason: session.reason,
              sessionId: session.sessionId,
            });
          } else {
            sessionStorage.removeItem(STORAGE_KEY);
          }
        });
      } catch (e) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [user]);

  const verifySession = async (sessionId: string): Promise<boolean> => {
    await supabase.rpc('expire_stale_impersonation_sessions');
    const { data, error } = await supabase
      .from('impersonation_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .eq('status', 'active')
      .maybeSingle();
    return !error && !!data;
  };

  const checkPlatformAdmin = async (): Promise<boolean> => {
    if (!user) return false;
    const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin', { _user_id: user.id });
    if (!isPlatformAdmin) {
      toast.error('Apenas administradores da plataforma podem usar esta funcionalidade');
      return false;
    }
    return true;
  };

  const startImpersonation = useCallback(async (
    orgId: string,
    orgName: string,
    reason: string
  ): Promise<boolean> => {
    if (!user) { toast.error('Sessão não autenticada'); return false; }
    if (reason.length < 5) { toast.error('O motivo deve ter pelo menos 5 caracteres'); return false; }
    if (!await checkPlatformAdmin()) return false;

    try {
      const { data: session, error } = await supabase
        .from('impersonation_sessions')
        .insert({
          real_user_id: user.id,
          impersonated_organization_id: orgId,
          reason,
          user_agent: navigator.userAgent,
        })
        .select()
        .single();

      if (error) { toast.error('Erro ao iniciar impersonation'); return false; }

      const stored: StoredSession = {
        impersonatedOrgId: orgId,
        impersonatedOrgName: orgName,
        impersonatedUserId: null,
        impersonatedUserName: null,
        impersonationType: 'org',
        reason,
        sessionId: session.id,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

      setState({
        isImpersonating: true,
        impersonatedOrgId: orgId,
        impersonatedOrgName: orgName,
        impersonatedUserId: null,
        impersonatedUserName: null,
        impersonationType: 'org',
        reason,
        sessionId: session.id,
      });

      invalidateCaches();
      toast.success(`A atuar no contexto de: ${orgName}`);
      return true;
    } catch (e) {
      toast.error('Erro ao iniciar impersonation');
      return false;
    }
  }, [user, invalidateCaches]);

  const startUserImpersonation = useCallback(async (
    userId: string,
    userName: string,
    reason: string
  ): Promise<boolean> => {
    if (!user) { toast.error('Sessão não autenticada'); return false; }
    if (reason.length < 5) { toast.error('O motivo deve ter pelo menos 5 caracteres'); return false; }
    if (!await checkPlatformAdmin()) return false;

    try {
      const { data: session, error } = await supabase
        .from('impersonation_sessions')
        .insert({
          real_user_id: user.id,
          impersonated_user_id: userId,
          impersonated_user_name: userName,
          reason,
          user_agent: navigator.userAgent,
        } as any)
        .select()
        .single();

      if (error) { console.error(error); toast.error('Erro ao iniciar impersonação de utilizador'); return false; }

      const stored: StoredSession = {
        impersonatedOrgId: null,
        impersonatedOrgName: null,
        impersonatedUserId: userId,
        impersonatedUserName: userName,
        impersonationType: 'user',
        reason,
        sessionId: session.id,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

      setState({
        isImpersonating: true,
        impersonatedOrgId: null,
        impersonatedOrgName: null,
        impersonatedUserId: userId,
        impersonatedUserName: userName,
        impersonationType: 'user',
        reason,
        sessionId: session.id,
      });

      invalidateCaches();
      toast.success(`A impersonar: ${userName}`);
      return true;
    } catch (e) {
      toast.error('Erro ao iniciar impersonação de utilizador');
      return false;
    }
  }, [user, invalidateCaches]);

  const stopImpersonation = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await supabase
        .from('impersonation_sessions')
        .update({ ended_at: new Date().toISOString(), status: 'ended' })
        .eq('id', state.sessionId);

      sessionStorage.removeItem(STORAGE_KEY);
      setState(INITIAL_STATE);
      invalidateCaches();
      toast.success('Saiu do modo de impersonação');
    } catch (e) {
      toast.error('Erro ao terminar impersonation');
    }
  }, [state.sessionId, invalidateCaches]);

  const getEffectiveOrganizationId = useCallback(() => {
    return state.impersonatedOrgId;
  }, [state.impersonatedOrgId]);

  return (
    <ImpersonationContext.Provider
      value={{
        ...state,
        startImpersonation,
        startUserImpersonation,
        stopImpersonation,
        getEffectiveOrganizationId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
