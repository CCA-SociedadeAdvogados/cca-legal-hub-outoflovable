import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

export function useOrganizations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.current_organization_id) return null;

      // New schema: organizations uses client_code as PK (no id column)
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('client_code', profile.current_organization_id)
        .maybeSingle();

      return (org ?? null) as Organization | null;
    },
    enabled: !!user,
  });

  // Query to fetch all organizations the user is a member of
  const { data: userMemberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ['user-memberships', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch memberships without join (organizations table schema may differ)
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        // Auto-healing: If no memberships but user has current_organization_id, create membership
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

  // Helper: enrich membership records with organization name
  async function buildMemberships(
    members: { organization_id: string; role: string }[]
  ): Promise<UserMembership[]> {
    const orgIds = members.map((m) => m.organization_id);

    // Fetch organizations by client_code (new schema PK)
    const orgsMap: Record<string, { client_code: string | null; name: string }> = {};

    const { data: orgs } = await supabase
      .from('organizations')
      .select('client_code, name')
      .in('client_code', orgIds);

    if (orgs && orgs.length > 0) {
      orgs.forEach((o) => {
        if (o.client_code) orgsMap[o.client_code] = o;
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

      // Use RPC function that bypasses RLS
      const { data: org, error } = await supabase
        .rpc('create_organization', { p_name: name, p_slug: slug });

      if (error) throw error;
      return org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['current-organization'] });
      queryClient.invalidateQueries({ queryKey: ['user-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Organização criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Erro ao criar organização');
    },
  });

  const switchOrganization = useMutation({
    mutationFn: async (organizationId: string) => {
      if (!user) throw new Error('Utilizador não autenticado');

      const { error } = await supabase
        .from('profiles')
        .update({ current_organization_id: organizationId })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-organization'] });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['eventos-legislativos'] });
      queryClient.invalidateQueries({ queryKey: ['impactos'] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-config'] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-documents'] });
      queryClient.invalidateQueries({ queryKey: ['sharepoint-sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['client-folders'] });
      queryClient.invalidateQueries({ queryKey: ['organization-financial-info'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-nav-cache'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-nav-items'] });
      queryClient.invalidateQueries({ queryKey: ['available-jvris-ids'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['user-departments'] });
      queryClient.invalidateQueries({ queryKey: ['contentBlocks'] });
      queryClient.invalidateQueries({ queryKey: ['homeConfig'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Organização alterada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao mudar organização');
    },
  });

  return {
    organizations,
    currentOrganization,
    userMemberships,
    isLoading,
    membershipsLoading,
    createOrganization,
    switchOrganization,
  };
}

export function useOrganizationMembers(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // First get organization members
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at');

      if (membersError) throw membersError;
      
      // Then get profiles for each member using the secure view
      const userIds = membersData.map(m => m.user_id);
      
      // Define the profile type for the secure view
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
      
      const { data: profilesData } = await supabase
        .from('profiles_safe' as any)
        .select('id, nome_completo, email, avatar_url, departamento, auth_method, sso_provider, login_attempts, locked_until, last_login_at, two_factor_enabled')
        .in('id', userIds) as { data: ProfileSafe[] | null };

      // Combine the data
      const membersWithProfiles = membersData.map(member => ({
        ...member,
        profiles: profilesData?.find(p => p.id === member.user_id) || null,
      }));

      return membersWithProfiles as OrganizationMember[];
    },
    enabled: !!organizationId,
  });

  const inviteMember = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'editor' | 'viewer' }) => {
      // For now, we need the user to exist first
      // In a full implementation, you'd send an invitation email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, current_organization_id')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Este utilizador não pertence à sua organização ou não tem conta registada.');

      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: profile.id,
          role,
        });

      if (error) throw error;

      // If the user doesn't have a current_organization_id, set it to this organization
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
      toast.success('Permissão atualizada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar permissão');
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
