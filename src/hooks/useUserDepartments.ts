import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserDepartment {
  id: string;
  user_id: string;
  organization_id: string;
  department_id: string;
  created_at: string;
}

export function useUserDepartments(userId: string | null, organizationId: string | null) {
  const queryClient = useQueryClient();

  const { data: userDepartments, isLoading } = useQuery({
    queryKey: ["user-departments", userId, organizationId],
    queryFn: async (): Promise<UserDepartment[]> => {
      if (!userId || !organizationId) return [];
      const { data, error } = await supabase
        .from("user_departments" as any)
        .select("*")
        .eq("user_id", userId)
        .eq("organization_id", organizationId);
      if (error) throw error;
      return (data as unknown as UserDepartment[]) || [];
    },
    enabled: !!userId && !!organizationId,
  });

  const departmentIds = userDepartments?.map((ud) => ud.department_id) || [];

  const addUserToDepartment = useMutation({
    mutationFn: async ({
      userId: uid,
      orgId,
      deptId,
    }: {
      userId: string;
      orgId: string;
      deptId: string;
    }) => {
      const { error } = await supabase
        .from("user_departments" as any)
        .insert({ user_id: uid, organization_id: orgId, department_id: deptId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-departments", userId, organizationId] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar departamento: " + error.message);
    },
  });

  const removeUserFromDepartment = useMutation({
    mutationFn: async ({
      userId: uid,
      orgId,
      deptId,
    }: {
      userId: string;
      orgId: string;
      deptId: string;
    }) => {
      const { error } = await supabase
        .from("user_departments" as any)
        .delete()
        .eq("user_id", uid)
        .eq("organization_id", orgId)
        .eq("department_id", deptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-departments", userId, organizationId] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover departamento: " + error.message);
    },
  });

  // Set complete list of departments for a user (add/remove diff)
  const setUserDepartments = useMutation({
    mutationFn: async ({
      userId: uid,
      orgId,
      deptIds,
      systemDeptId, // always keep this
    }: {
      userId: string;
      orgId: string;
      deptIds: string[];
      systemDeptId?: string;
    }) => {
      // Fetch current assignments
      const { data: current, error: fetchError } = await supabase
        .from("user_departments" as any)
        .select("department_id")
        .eq("user_id", uid)
        .eq("organization_id", orgId);
      if (fetchError) throw fetchError;

      const currentIds = (current || []).map((ud: any) => ud.department_id);

      // Ensure system dept is always included
      const targetIds = systemDeptId
        ? Array.from(new Set([...deptIds, systemDeptId]))
        : deptIds;

      const toAdd = targetIds.filter((id) => !currentIds.includes(id));
      const toRemove = currentIds.filter(
        (id: string) => !targetIds.includes(id) && id !== systemDeptId
      );

      // Insert new
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("user_departments" as any)
          .insert(toAdd.map((deptId) => ({ user_id: uid, organization_id: orgId, department_id: deptId })));
        if (error) throw error;
      }

      // Remove old (never remove system dept)
      for (const deptId of toRemove) {
        const { error } = await supabase
          .from("user_departments" as any)
          .delete()
          .eq("user_id", uid)
          .eq("organization_id", orgId)
          .eq("department_id", deptId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-departments", userId, organizationId] });
      queryClient.invalidateQueries({ queryKey: ["allMembersWithProfiles"] });
      toast.success("Departamentos atualizados com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar departamentos: " + error.message);
    },
  });

  return {
    userDepartments,
    departmentIds,
    isLoading,
    addUserToDepartment,
    removeUserFromDepartment,
    setUserDepartments,
  };
}
