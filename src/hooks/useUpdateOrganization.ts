import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateLawyerData {
  lawyerName?: string;
  lawyerPhotoUrl?: string;
}

interface UpdateOrganizationData {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export function useUpdateOrganization(organizationId: string | null) {
  const queryClient = useQueryClient();

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    if (!organizationId) throw new Error('Organization ID is required');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${organizationId}/${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('org-assets')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('org-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const updateLawyerMutation = useMutation({
    mutationFn: async (data: UpdateLawyerData) => {
      if (!organizationId) throw new Error('Organization ID is required');

      const updateData: Record<string, string | null> = {};
      if (data.lawyerName !== undefined) updateData.lawyer_name = data.lawyerName;
      if (data.lawyerPhotoUrl !== undefined) updateData.lawyer_photo_url = data.lawyerPhotoUrl;

      const { error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Dados do advogado atualizados');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar dados do advogado');
      console.error(error);
    },
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: UpdateOrganizationData) => {
      if (!organizationId) throw new Error('Organization ID is required');

      const updateData: Record<string, string | null> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl;
      if (data.primaryColor !== undefined) updateData.primary_color = data.primaryColor;
      if (data.secondaryColor !== undefined) updateData.secondary_color = data.secondaryColor;

      const { error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Dados da organização atualizados');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar dados da organização');
      console.error(error);
    },
  });

  const uploadLawyerPhoto = async (file: File): Promise<string> => {
    return uploadFile(file, 'lawyer');
  };

  const uploadLogo = async (file: File): Promise<string> => {
    return uploadFile(file, 'logo');
  };

  return {
    updateLawyer: updateLawyerMutation.mutate,
    updateOrganization: updateOrganizationMutation.mutate,
    uploadLawyerPhoto,
    uploadLogo,
    isUpdatingLawyer: updateLawyerMutation.isPending,
    isUpdatingOrganization: updateOrganizationMutation.isPending,
  };
}
