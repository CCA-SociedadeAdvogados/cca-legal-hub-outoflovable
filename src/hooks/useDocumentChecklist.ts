import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCliente } from '@/contexts/ClienteContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import { toast } from '@/hooks/use-toast';

export interface ChecklistType {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  is_required: boolean;
  sort_order: number;
}

export interface ChecklistEntry {
  id: string;
  organization_id: string;
  checklist_type_id: string;
  status: 'missing' | 'uploaded' | 'expired' | 'expiring_soon';
  validity_date: string | null;
  confirmed_by_user: boolean;
  ai_suggested_date: string | null;
  file_reference: string | null;
  notes: string | null;
  updated_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItemWithType extends ChecklistType {
  entry: ChecklistEntry | null;
}

export function useDocumentChecklist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { viewingOrganizationId } = useCliente();
  const { currentOrganization, isCCAInternalAuthorized } = useOrganizations();
  const organizationId = viewingOrganizationId || (isCCAInternalAuthorized ? null : currentOrganization?.id) || null;

  // Fetch document types
  const { data: types, isLoading: isLoadingTypes } = useQuery({
    queryKey: ['document-checklist-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_checklist_types' as any)
        .select('*')
        .order('sort_order');
      if (error) {
        // Table doesn't exist yet — graceful fallback
        console.warn('[DocumentChecklist] Types table not available:', error.message);
        return [] as ChecklistType[];
      }
      return (data ?? []) as unknown as ChecklistType[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch org entries
  const { data: entries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ['document-checklist-entries', organizationId],
    queryFn: async () => {
      if (!organizationId) return [] as ChecklistEntry[];
      const { data, error } = await supabase
        .from('organization_document_checklist' as any)
        .select('*')
        .eq('organization_id', organizationId);
      if (error) {
        console.warn('[DocumentChecklist] Entries table not available:', error.message);
        return [] as ChecklistEntry[];
      }
      return (data ?? []) as unknown as ChecklistEntry[];
    },
    enabled: !!user && !!organizationId,
    staleTime: 30 * 1000,
  });

  // Combine types with entries
  const items: ChecklistItemWithType[] = (types ?? []).map(type => ({
    ...type,
    entry: (entries ?? []).find(e => e.checklist_type_id === type.id) ?? null,
  }));

  // Upsert entry
  const upsertEntry = useMutation({
    mutationFn: async (payload: {
      checklist_type_id: string;
      status: string;
      validity_date?: string | null;
      confirmed_by_user?: boolean;
      ai_suggested_date?: string | null;
      file_reference?: string | null;
      notes?: string | null;
    }) => {
      if (!organizationId || !user) throw new Error('Sem organização');

      const { data, error } = await supabase
        .from('organization_document_checklist' as any)
        .upsert({
          organization_id: organizationId,
          checklist_type_id: payload.checklist_type_id,
          status: payload.status,
          validity_date: payload.validity_date ?? null,
          confirmed_by_user: payload.confirmed_by_user ?? false,
          ai_suggested_date: payload.ai_suggested_date ?? null,
          file_reference: payload.file_reference ?? null,
          notes: payload.notes ?? null,
          updated_by_id: user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id,checklist_type_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-checklist-entries', organizationId] });
      toast({ title: 'Documento atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar documento', description: error.message, variant: 'destructive' });
    },
  });

  return {
    items,
    isLoading: isLoadingTypes || isLoadingEntries,
    upsertEntry,
    organizationId,
    isTableAvailable: (types ?? []).length > 0,
  };
}
