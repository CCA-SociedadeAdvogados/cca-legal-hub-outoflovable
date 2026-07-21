import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Registos de trabalho do JVRIS (cache jvris_wip_registos, sincronizado pelo
 * scripts/jvris-wip-agent a partir do CCA_WIP/fact_wip).
 *
 * Dados internos: a RLS só permite leitura a utilizadores CCA — estes hooks
 * são para o cockpit; o portal do cliente nunca lê daqui.
 */
export interface WipRegisto {
  id: string;
  dossier_code: string;
  dossier_des: string | null;
  dossier_dep: string | null;
  colab_nome: string | null;
  valor_reg: number | null;
  horas_reg: number | null;
  dia: string;
  is_wip: boolean;
}

/** Registos dos últimos `months` meses da organização (mais recentes primeiro). */
export function useJvrisWip(organizationId: string | null, months = 12) {
  return useQuery({
    queryKey: queryKeys.jvrisWip.byOrg(organizationId ?? 'none', months),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<WipRegisto[]> => {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      const { data, error } = await supabase
        .from('jvris_wip_registos')
        .select(
          'id, dossier_code, dossier_des, dossier_dep, colab_nome, valor_reg, horas_reg, dia, is_wip',
        )
        .eq('organization_id', organizationId!)
        .gte('dia', cutoff.toISOString().slice(0, 10))
        .order('dia', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });
}
