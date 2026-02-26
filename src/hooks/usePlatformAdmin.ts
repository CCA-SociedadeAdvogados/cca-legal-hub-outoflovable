import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type Departamento = Database["public"]["Enums"]["departamento"];

export interface CreateUserPayload {
  email: string;
  nome_completo: string;
  organizationId: string;
  role: AppRole;
  departamento?: Departamento;
  password?: string;
}

export interface CreateUserResponse {
  success: boolean;
  existingUser?: boolean;
  user: {
    id: string;
    email: string;
    nome_completo: string;
  };
  credentials?: {
    email: string;
    password: string;
  };
  message: string;
}
interface PlatformAdmin {
  id: string;
  user_id: string;
  created_at: string;
  created_by: string | null;
  notes: string | null;
  profile?: {
    email: string | null;
    nome_completo: string | null;
  };
}

interface GlobalStats {
  totalOrganizations: number;
  totalContracts: number;
  totalUsers: number;
  contractsByStatus: Record<string, number>;
}

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: AppRole;
  created_at: string;
  profiles?: {
    id: string | null;
    email: string | null;
    nome_completo: string | null;
    avatar_url: string | null;
    auth_method: string | null;
    last_login_at: string | null;
    locked_until: string | null;
    login_attempts: number | null;
  };
}

export function usePlatformAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isPlatformAdmin, isLoading: isCheckingAdmin } = useQuery({
    queryKey: ["isPlatformAdmin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc("is_platform_admin", {
        _user_id: user.id,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: platformAdmins, isLoading: isLoadingAdmins } = useQuery({
    queryKey: ["platformAdmins"],
    queryFn: async () => {
      // Get platform admins
      const { data: admins, error } = await supabase
        .from("platform_admins")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get profiles for each admin (using profiles_safe for platform admin access)
      const adminIds = admins.map((a) => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles_safe")
        .select("id, email, nome_completo")
        .in("id", adminIds);

      // Merge profiles with admins
      return admins.map((admin) => ({
        ...admin,
        profile: profiles?.find((p) => p.id === admin.user_id) || undefined,
      })) as PlatformAdmin[];
    },
    enabled: !!isPlatformAdmin,
  });

  const { data: globalStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["globalStats"],
    queryFn: async (): Promise<GlobalStats> => {
      const [orgsResult, contractsResult, profilesResult] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("contratos_safe" as "contratos").select("id, estado_contrato"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      const contractsByStatus: Record<string, number> = {};
      if (contractsResult.data) {
        contractsResult.data.forEach((c) => {
          const status = c.estado_contrato || "unknown";
          contractsByStatus[status] = (contractsByStatus[status] || 0) + 1;
        });
      }

      return {
        totalOrganizations: orgsResult.count || 0,
        totalContracts: contractsResult.data?.length || 0,
        totalUsers: profilesResult.count || 0,
        contractsByStatus,
      };
    },
    enabled: !!isPlatformAdmin,
  });

  const { data: allOrganizations, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ["allOrganizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!isPlatformAdmin,
  });

  const { data: allContracts, isLoading: isLoadingContracts } = useQuery({
    queryKey: ["allContracts"],
    queryFn: async () => {
      // Platform admins use contratos_safe view which still shows all fields for admins
      const { data, error } = await supabase
        .from("contratos_safe" as "contratos")
        .select(`
          *,
          organization:organizations(name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!isPlatformAdmin,
  });

  const addPlatformAdmin = useMutation({
    mutationFn: async ({ userId, notes }: { userId: string; notes?: string }) => {
      const { error } = await supabase.from("platform_admins").insert({
        user_id: userId,
        notes,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platformAdmins"] });
    },
  });

  const removePlatformAdmin = useMutation({
    mutationFn: async (adminId: string) => {
      const { error } = await supabase
        .from("platform_admins")
        .delete()
        .eq("id", adminId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platformAdmins"] });
    },
  });

  const createOrganization = useMutation({
    mutationFn: async ({ name, slug, industrySectors, legalbiUrl }: { name: string; slug: string; industrySectors?: string[]; legalbiUrl?: string }) => {
      const { data, error } = await supabase
        .from("organizations")
        .insert({ name, slug, industry_sectors: industrySectors || [], legalbi_url: legalbiUrl || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrganizations"] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });

  const updateOrganization = useMutation({
    mutationFn: async ({ id, name, slug, industrySectors }: { id: string; name: string; slug: string; industrySectors?: string[] }) => {
      const updateData: { name: string; slug: string; industry_sectors?: string[] } = { name, slug };
      if (industrySectors !== undefined) {
        updateData.industry_sectors = industrySectors;
      }
      const { data, error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrganizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization-sectors"] });
    },
  });

  const deleteOrganization = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrganizations"] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });

  // Hook para obter membros de uma organização específica
  const useOrganizationMembers = (orgId: string | null) => {
    return useQuery({
      queryKey: ["orgMembers", orgId],
      queryFn: async (): Promise<OrganizationMember[]> => {
        if (!orgId) return [];
        
        // Primeiro obtém os membros
        const { data: members, error } = await supabase
          .from("organization_members")
          .select("*")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        if (!members || members.length === 0) return [];
        
        // Depois obtém os perfis para cada membro (usando profiles_safe para platform admin access)
        const userIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles_safe")
          .select("id, email, nome_completo, avatar_url, auth_method, last_login_at, locked_until, login_attempts")
          .in("id", userIds);
        
        // Merge os dados
        return members.map(member => ({
          ...member,
          profiles: profiles?.find(p => p.id === member.user_id) || undefined,
        })) as OrganizationMember[];
      },
      enabled: !!orgId && !!isPlatformAdmin,
    });
  };

  // Mutation para atualizar o role de um membro
  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ role })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgMembers"] });
    },
  });

  // Mutation para remover um membro de uma organização
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgMembers"] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });

  // Mutation para adicionar um membro a uma organização
  const addMemberToOrg = useMutation({
    mutationFn: async ({ orgId, email, role, forceMove = false }: { 
      orgId: string; 
      email: string; 
      role: AppRole;
      forceMove?: boolean;
    }) => {
      // Primeiro encontrar o user pelo email (usando profiles_safe para platform admin access)
      const { data: profile, error: profileError } = await supabase
        .from("profiles_safe")
        .select("id")
        .eq("email", email.trim())
        .single();
      
      if (profileError || !profile) {
        throw new Error("Utilizador não encontrado com este email");
      }

      // Verificar se já é membro desta organização
      const { data: existingInOrg } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", orgId)
        .eq("user_id", profile.id)
        .maybeSingle();
      
      if (existingInOrg) {
        throw new Error("Utilizador já é membro desta organização");
      }

      // Verificar se pertence a outra organização
      const { data: otherOrg } = await supabase
        .from("organization_members")
        .select("id, organization:organizations(name)")
        .eq("user_id", profile.id)
        .neq("organization_id", orgId)
        .maybeSingle();
      
      if (otherOrg && !forceMove) {
        const orgName = (otherOrg.organization as { name: string } | null)?.name || 'outra organização';
        throw new Error(`USER_IN_OTHER_ORG:${orgName}`);
      }

      // Se forceMove, remover das outras organizações primeiro
      if (forceMove && otherOrg) {
        await supabase
          .from("organization_members")
          .delete()
          .eq("user_id", profile.id);
      }

      // Adicionar como membro
      const { error } = await supabase
        .from("organization_members")
        .insert({
          organization_id: orgId,
          user_id: profile.id,
          role,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgMembers"] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });

  // Mutation para criar um novo utilizador e adicioná-lo à organização
  const createUser = useMutation({
    mutationFn: async (payload: CreateUserPayload): Promise<CreateUserResponse> => {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: payload
      });

      if (error) {
        throw new Error(error.message || 'Erro ao criar utilizador');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as CreateUserResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgMembers"] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });

  return {
    isPlatformAdmin: !!isPlatformAdmin,
    isCheckingAdmin,
    platformAdmins,
    isLoadingAdmins,
    globalStats,
    isLoadingStats,
    allOrganizations,
    isLoadingOrgs,
    allContracts,
    isLoadingContracts,
    addPlatformAdmin,
    removePlatformAdmin,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    // Novas funcionalidades para gestão de membros por organização
    useOrganizationMembers,
    updateMemberRole,
    removeMember,
    addMemberToOrg,
    createUser,
  };
}
