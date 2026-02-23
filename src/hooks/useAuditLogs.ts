import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

export interface AuditLog {
  id: string;
  organization_id: string | null;
  user_id: string;
  user_email: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface UseAuditLogsOptions {
  tableName?: string;
  action?: string;
  userId?: string;
  recordId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const { profile } = useProfile();
  const { tableName, action, userId, recordId, startDate, endDate, limit = 100 } = options;

  const { data: logs = [], isLoading, error, refetch } = useQuery({
    queryKey: ["audit_logs", profile?.current_organization_id, tableName, action, userId, recordId, startDate, endDate, limit],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tableName) {
        query = query.eq("table_name", tableName);
      }
      if (action) {
        query = query.eq("action", action);
      }
      if (userId) {
        query = query.eq("user_id", userId);
      }
      if (recordId) {
        query = query.eq("record_id", recordId);
      }
      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
      if (endDate) {
        query = query.lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!profile?.current_organization_id,
  });

  return {
    logs,
    isLoading,
    error,
    refetch,
  };
}

// Hook para obter logs de um registo específico
export function useRecordAuditLogs(tableName: string, recordId: string) {
  return useAuditLogs({ tableName, recordId, limit: 50 });
}

// Função auxiliar para traduzir ações
export function translateAction(action: string): string {
  const translations: Record<string, string> = {
    CREATE: "Criação",
    UPDATE: "Atualização",
    DELETE: "Eliminação",
    VIEW: "Visualização",
    EXPORT: "Exportação",
    LOGIN: "Login",
    LOGOUT: "Logout",
  };
  return translations[action] || action;
}

// Função auxiliar para traduzir nomes de tabelas
export function translateTableName(tableName: string): string {
  const translations: Record<string, string> = {
    contratos: "Contratos",
    eventos_legislativos: "Eventos Legislativos",
    impactos: "Impactos",
    politicas: "Políticas",
    requisitos: "Requisitos",
    templates: "Templates",
    documentos_gerados: "Documentos Gerados",
    profiles: "Perfis",
    organizations: "Organizações",
  };
  return translations[tableName] || tableName;
}
