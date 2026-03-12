import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCliente } from '@/contexts/ClienteContext';
import { toast } from 'sonner';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  lawyer_name: string | null;
  lawyer_photo_url: string | null;
  industry_sectors: string[] | null;
  client_code: string | null;
  group: string | null;
  responsible: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  created_at: string;
  profiles?: {
    id: string;
    nome_completo: string | null;
    email: string | null;
    avatar_url: string | null;
    departamento: string | null;
    auth_method: string | null;
    sso_provider: string | null;
    login_attempts: number | null;
    locked_until: string | null;
    last_login_at: string | null;
    two_factor_enabled: boolean | null;
  };
}

export interface UserMembership {
  organization_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  organizations: {
    client_code: string | null;
    name: string;
  };
}

export interface CCAClientOption {
  organization_id: string;
  client_code: string;
  client_name: string;
  group_code: string | null;
  cost_center: string | null;
  responsible: string | null;
  responsible_email: string | null;
  total_documentos: number;
  total_pendente: number;
  total_vencido: number;
  total_a_vencer: number;
  ultima_sincronizacao: string | null;
  client_status: string;
}

export function useOrganizations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { cliente, setCliente, clearCliente } = useCliente();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Organization[];
    },
    enabled: !!user,
  });

  const { data: currentOrganization } = useQuery({
    queryKey: ['current-organization', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.current_organization_id) return null;

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.current_organization_id)
        .maybeSingle();

      if (orgError) throw orgError;

      return (org ?? null) as Organization | null;
    },
    enabled: !!user,
  });

  const { data: isCCAInternalAuthorized = false, isLoading: ccaAuthLoading } = useQuery({
    queryKey: ['cca-internal-authorized', user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase.rpc('fn_is_cca_internal_authorized', {
        p_user_id: user.id,
      });

      if (error) throw error;
      return Boolean(data);
    },
    enabled: !!user,
  });

  const { data: ccaClients = [], isLoading: ccaClientsLoading } = useQuery({
    queryKey: ['cca-clients', user?.id, isCCAInternalAuthorized],
    queryFn: async () => {
      if (!user || !isCCAInternalAuthorized) return [];

      const { data, error } = await supabase
        .from('vw_cca_client_catalog_overview')
        .select(`
          organization_id,
          client_code,
          legacy_client_name,
          group_code,
          cost_center,
          responsible,
          responsible_email,
          total_documentos,
          total_pendente,
          total_vencido,
          total_a_vencer,
          ultima_sincronizacao,
          client_status,
          can_open_in_platform
        `)
        .eq('can_open_in_platform', true)
        .order('legacy_client_name', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        organization_id: row.organization_id,
        client_code: row.client_code,
        client_name: row.legacy_client_name,
        group_code: row.group_code,
        cost_center: row.cost_center,
        responsible: row.responsible,
        responsible_email: row.responsible_email,
        total_documentos: Number(row.total_documentos ?? 0),
        total_pendente: Number(row.total_pendente ?? 0),
        total_vencido: Number(row.total_vencido ?? 0),
        total_a_vencer: Number(row.total_a_vencer ?? 0),
        ultima_sincronizacao: row.ultima_sincronizacao,
        client_status: row.client_status,
      })) as CCAClientOption[];
    },
    enabled: !!user,
  });

  const { data: userMemberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ['user-memberships', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_organization_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.current_organization_id) {
          await supabase
            .from('organization_members')
            .insert({
              organization_id: profile.current_organization_id,
              user_id: user.id,
              role: 'editor',
            });

          const { data: newData } = await supabase
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', user.id);

          if (newData && newData.length > 0) {
            return buildMemberships(newData);
          }
        }

        return [];
      }

      return buildMemberships(membersData);
    },
    enabled: !!user,
  });

  async function buildMemberships(
    members: { organization_id: string; role: string }[],
  ): Promise<UserMembership[]> {
    const orgIds = members.map((m) => m.organization_id);

    const orgsMap: Record<string, { client_code: string | null; name: string }> = {};

    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, client_code, name')
      .in('id', orgIds);

    if (orgs && orgs.length > 0) {
      orgs.forEach((o) => {
        orgsMap[o.id] = { client_code: o.client_code, name: o.name };
      });
    }

    return members.map((m) => ({
      organization_id: m.organization_id,
      role: m.role as UserMembership['role'],
      organizations: orgsMap[m.organization_id] || {
        client_code: null,
        name: 'Organização',
      },
    }));
  }

  const createOrganization = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const { data: org, error } = await supabase.rpc('create_organization', {
        p_name: name,
        p_slug: slug,
      });

      if (error) throw error;
      return org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['current-organization'] });
      queryClient.invalidateQueries({ queryKey: ['user-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['cca-clients'] });
      toast.success('Organização criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Erro ao criar organização');
    },
  });

  /**
   * Mantém compatibilidade com o comportamento antigo.
   * Para utilizadores CCA autorizados, a navegação entre clientes NÃO altera
   * profiles.current_organization_id; apenas actualiza o cliente em visualização.
   * Para utilizadores externos, mantém o comportamento anterior.
   */
  const switchOrganization = useMutation({
    mutationFn: async (organizationId: string) => {
      if (!user) throw new Error('Utilizador não autenticado');

      if (isCCAInternalAuthorized) {
        const selected = ccaClients.find((c) => c.organization_id === organizationId);

        if (!selected) {
          throw new Error('Cliente não encontrado para visualização');
        }

        setCliente({
          organizationId: selected.organization_id,
          nome: selected.client_name,
          jvrisId: selected.client_code,
        });

        return organizationId;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ current_organization_id: organizationId })
        .eq('id', user.id);

      if (error) throw error;

      return organizationId;
    },
    onSuccess: async (organizationId) => {
      if (isCCAInternalAuthorized) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['cca-clients'] }),
          queryClient.invalidateQueries({ queryKey: ['organization-financial-info'] }),
          queryClient.invalidateQueries({ queryKey: ['financeiro-nav-cache'] }),
          queryClient.invalidateQueries({ queryKey: ['financeiro-nav-items'] }),
          queryClient.invalidateQueries({ queryKey: ['available-jvris-ids'] }),
          queryClient.invalidateQueries({ queryKey: ['client-home'] }),
          queryClient.invalidateQueries({ queryKey: ['financial-summary'] }),
          queryClient.invalidateQueries({ queryKey: ['financial-items'] }),
          queryClient.invalidateQueries({ queryKey: ['financial-by-entity'] }),
        ]);

        toast.success('Cliente em visualização alterado');
        return;
      }

      queryClient.setQueryData(['current-organization', user?.id], () => {
        return organizations?.find((o) => o.id === organizationId) ?? null;
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['current-organization', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['organizations', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['user-memberships', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['sharepoint-config'] }),
        queryClient.invalidateQueries({ queryKey: ['sharepoint-documents'] }),
        queryClient.invalidateQueries({ queryKey: ['sharepoint-sync-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['client-folders'] }),
        queryClient.invalidateQueries({ queryKey: ['organization-financial-info'] }),
        queryClient.invalidateQueries({ queryKey: ['financeiro-nav-cache'] }),
        queryClient.invalidateQueries({ queryKey: ['financeiro-nav-items'] }),
        queryClient.invalidateQueries({ queryKey: ['available-jvris-ids'] }),
      ]);

      toast.success('Organização alterada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao mudar organização');
    },
  });

  const selectViewingClient = (client: CCAClientOption) => {
    setCliente({
      organizationId: client.organization_id,
      nome: client.client_name,
      jvrisId: client.client_code,
    });
  };

  const viewingOrganizationId = cliente?.organizationId ?? null;

  return {
    organizations,
    currentOrganization,
    userMemberships,
    ccaClients,
    isCCAInternalAuthorized,
    viewingOrganizationId,
    selectViewingClient,
    isLoading: isLoading || ccaAuthLoading || ccaClientsLoading,
    membershipsLoading,
    createOrganization,
    switchOrganization,
    clearViewingClient: clearCliente,
  };
}

export function useOrganizationMembers(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at');

      if (membersError) throw membersError;

      const userIds = membersData.map((m) => m.user_id);

      type ProfileSafe = {
        id: string;
        nome_completo: string | null;
        email: string | null;
        avatar_url: string | null;
        departamento: string | null;
        auth_method: string | null;
        sso_provider: string | null;
        login_attempts: number | null;
        locked_until: string | null;
        last_login_at: string | null;
        two_factor_enabled: boolean | null;
      };

      const { data: profilesData } = (await supabase
        .from('profiles_safe' as any)
        .select(
          'id, nome_completo, email, avatar_url, departamento, auth_method, sso_provider, login_attempts, locked_until, last_login_at, two_factor_enabled',
        )
        .in('id', userIds)) as { data: ProfileSafe[] | null };

      const membersWithProfiles = membersData.map((member) => ({
        ...member,
        profiles: profilesData?.find((p) => p.id === member.user_id) || null,
      }));

      return membersWithProfiles as OrganizationMember[];
    },
    enabled: !!organizationId,
  });

  const inviteMember = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'editor' | 'viewer' }) => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, current_organization_id')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        throw new Error('Este utilizador não pertence à sua organização ou não tem conta registada.');
      }

      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: profile.id,
          role,
        });

      if (error) throw error;

      if (!profile.current_organization_id) {
        await supabase
          .from('profiles')
          .update({ current_organization_id: organizationId })
          .eq('id', profile.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] });
      toast.success('Membro adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar membro');
    },
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: 'admin' | 'editor' | 'viewer' }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] });
      toast.success('Permissão actualizada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao actualizar permissão');
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] });
      toast.success('Membro removido');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover membro');
    },
  });

  return {
    members,
    isLoading,
    inviteMember,
    updateMemberRole,
    removeMember,
  };
}
