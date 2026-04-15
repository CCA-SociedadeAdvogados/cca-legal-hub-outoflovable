import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  is_default: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function useDepartments(organizationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments', organizationId],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Department[]> => {
      if (!organizationId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('departments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data as unknown as Department[]) || [];
    },
    enabled: !!organizationId,
  });

  const createDepartment = useMutation({
    mutationFn: async ({ name, orgId }: { name: string; orgId: string }) => {
      const slug = generateSlug(name);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('departments')
        .insert({ organization_id: orgId, name: name.trim(), slug, created_by_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', organizationId] });
      toast.success('Departamento criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar departamento: ' + error.message);
    },
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('departments')
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', organizationId] });
      toast.success('Departamento atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar departamento: ' + error.message);
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: async (id: string) => {
      // Guard: never delete system departments
      const dept = departments?.find((d) => d.id === id);
      if (dept?.is_system) {
        throw new Error('Não é possível eliminar o departamento de sistema');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('departments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments', organizationId] });
      toast.success('Departamento eliminado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao eliminar departamento: ' + error.message);
    },
  });

  return {
    departments,
    isLoading,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}
